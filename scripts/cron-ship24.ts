/**
 * Ship24 auto-poll tracker (Provider Pattern).
 *
 * Key resolution: SystemSetting → process.env → console (trial mode).
 * Run once:   pnpm cron:ship24:once
 * Loop:       pnpm cron:ship24   (interval via ship24.pollIntervalMinutes)
 *
 * Uses the pure shared vault (lib/crypto) — no server-only imports, so it can
 * run standalone via tsx. Never crashes on API/key errors.
 */
import { PrismaClient, type ShipmentStatus } from "@prisma/client";
import { isEncrypted, decryptSecret } from "../lib/crypto";

const prisma = new PrismaClient();

const ORDER = ["CREATED", "PICKED_UP", "IN_TRANSIT", "CUSTOMS", "DELIVERED"] as const;

type ShipStatus = (typeof ORDER)[number] | "CANCELLED";

function mapMilestone(milestone?: string): (typeof ORDER)[number] | null {
  switch (milestone) {
    case "info_received":
    case "pending":
      return "CREATED";
    case "picked_up":
    case "out_for_delivery":
      return "IN_TRANSIT";
    case "in_transit":
      return "IN_TRANSIT";
    case "delivered":
      return "DELIVERED";
    default:
      return null;
  }
}

async function resolveShip24Key(
  settings: { key: string; value: unknown }[]
): Promise<{ value: string; source: string }> {
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  for (const k of ["integration.ship24.api_key", "integration.tracking.apiKey"]) {
    const v = map[k];
    if (typeof v === "string" && v.length > 0) {
      const value = isEncrypted(v) ? decryptSecret(v) : v;
      if (value.length > 0) return { value, source: `setting:${k}` };
    }
  }
  for (const k of ["SHIP24_API_KEY", "TRACKING_API_KEY"]) {
    if (process.env[k]) return { value: process.env[k]!, source: `env:${k}` };
  }
  return { value: "", source: "none" };
}

async function fetchTracker(key: string, trackingNumber: string) {
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  // Try existing tracker first.
  let res = await fetch(`https://api.ship24.com/public/v1/trackers?trackingNumber=${encodeURIComponent(trackingNumber)}`, { headers });
  if (res.ok) {
    const json = (await res.json()) as { data?: { trackerId?: string; events?: unknown[] } };
    return json.data;
  }
  // Create a tracker.
  res = await fetch("https://api.ship24.com/public/v1/trackers", {
    method: "POST",
    headers,
    body: JSON.stringify({ trackingNumber }),
  });
  if (res.status === 201) {
    const json = (await res.json()) as { data?: { trackerId?: string; events?: unknown[] } };
    const trackerId = json.data?.trackerId;
    if (trackerId) {
      const detail = await fetch(`https://api.ship24.com/public/v1/trackers/${trackerId}`, { headers });
      if (detail.ok) {
        const djson = (await detail.json()) as { data?: { events?: unknown[] } };
        return djson.data;
      }
    }
    return json.data;
  }
  const text = await res.text().catch(() => "");
  throw new Error(`ship24 ${res.status}: ${text.slice(0, 200)}`);
}

async function pollOnce() {
  const settings = await prisma.systemSetting.findMany({ select: { key: true, value: true } });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const intervalMin =
    typeof map["ship24.pollIntervalMinutes"] === "number" ? (map["ship24.pollIntervalMinutes"] as number) : 60;

  const { value: key, source } = await resolveShip24Key(settings);
  if (!key) {
    console.log(
      "[cron-ship24] trial mode — no Ship24 key (set integration.ship24.api_key in Command Center → Integrations). Exiting 0."
    );
    return;
  }
  console.log(`[cron-ship24] key source: ${source}`);

  const now = new Date();
  const candidates = await prisma.shipment.findMany({
    where: {
      trackingProvider: "ship24",
      trackingNumber: { not: null },
      status: { notIn: ["DELIVERED", "CANCELLED"] as ShipmentStatus[] },
      OR: [
        { lastTrackedAt: null },
        { lastTrackedAt: { lt: new Date(now.getTime() - intervalMin * 60000) } },
      ],
    },
    include: {
      customer: true,
      events: { select: { status: true } },
    },
  });

  console.log(`[cron-ship24] polling ${candidates.length} shipment(s)`);

  let changed = 0;
  for (const shipment of candidates) {
    const tn = shipment.trackingNumber as string;
    try {
      const data = await fetchTracker(key, tn);
      const events = (data?.events ?? []) as {
        statusMilestone?: string;
        eventTrackingLocation?: string;
        description?: string;
        eventLocalDatetime?: string;
      }[];
      const latest = events[events.length - 1];

      if (!latest) {
        await prisma.shipment.update({ where: { id: shipment.id }, data: { lastTrackedAt: now } });
        continue;
      }

      const mapped = mapMilestone(latest.statusMilestone);
      const currentIdx = ORDER.indexOf(shipment.status as (typeof ORDER)[number]);
      const mappedIdx = mapped ? ORDER.indexOf(mapped) : -1;
      const statusChanged =
        mapped && (mappedIdx > currentIdx || (currentIdx === -1 && mapped !== "CREATED"));

      const newStatus: ShipStatus = statusChanged ? mapped! : (shipment.status as ShipStatus);
      const existingStatuses = new Set(shipment.events.map((e) => e.status));
      const newEvents: { status: string; location: string | null; note: string | null; occurredAt: Date }[] = [];

      if (mapped && !existingStatuses.has(mapped)) {
        newEvents.push({
          status: mapped,
          location: latest.eventTrackingLocation ?? null,
          note: latest.description ?? null,
          occurredAt: latest.eventLocalDatetime ? new Date(latest.eventLocalDatetime) : new Date(),
        });
      }

      const externalStatus = latest.statusMilestone ?? latest.description ?? shipment.externalStatus;
      if (newStatus !== shipment.status) {
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: { status: newStatus as never, lastTrackedAt: now, externalStatus },
        });
      } else if (externalStatus !== shipment.externalStatus) {
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: { lastTrackedAt: now, externalStatus },
        });
      } else {
        await prisma.shipment.update({ where: { id: shipment.id }, data: { lastTrackedAt: now } });
      }

      for (const ev of newEvents) {
        await prisma.shipmentEvent.create({
          data: { shipmentId: shipment.id, status: ev.status as never, location: ev.location, note: ev.note, occurredAt: ev.occurredAt },
        });
      }

      if (statusChanged) {
        changed++;
        console.log(`[cron-ship24] ${shipment.shipmentNumber} ${shipment.status} → ${newStatus} (${externalStatus})`);
        await notifyChange(shipment.shipmentNumber, newStatus, shipment.customer);
      } else if (newEvents.length) {
        console.log(`[cron-ship24] ${shipment.shipmentNumber} new event: ${externalStatus}`);
      }
    } catch (err) {
      console.warn(`[cron-ship24] ${shipment.shipmentNumber} error: ${(err as Error).message}`);
      // Mark tracked now to avoid hammering the API for failing rows.
      await prisma.shipment.update({ where: { id: shipment.id }, data: { lastTrackedAt: now } });
    }
  }

  console.log(`[cron-ship24] done — ${changed} shipment(s) changed status`);
}

async function notifyChange(shipmentNumber: string, status: string, customer: { email?: string | null } | null) {
  const recipients = await prisma.user.findMany({
    where: { OR: [{ role: "SUPER_ADMIN" }, { role: "MANAGER" }, ...(customer?.email ? [{ email: customer.email }] : [])] },
    select: { id: true },
  });
  const title = `Shipment ${shipmentNumber} — ${status}`;
  const body = `Tracking update: shipment ${shipmentNumber} is now ${status}.`;
  await prisma.notification.createMany({
    data: recipients.map((u) => ({ userId: u.id, title, body, type: "SHIPMENT" })),
  });
  console.log(`[cron-ship24] alert: ${body}`);
}

async function runLoop() {
  const settings = await prisma.systemSetting.findMany({ select: { key: true, value: true } });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const intervalMin = typeof map["ship24.pollIntervalMinutes"] === "number" ? (map["ship24.pollIntervalMinutes"] as number) : 60;
  const loop = process.env.SHIP24_LOOP === "1";

  if (loop) {
    console.log(`[cron-ship24] loop mode — every ${intervalMin} min`);
    const tick = async () => {
      try {
        await pollOnce();
      } catch (err) {
        console.warn(`[cron-ship24] tick error: ${(err as Error).message}`);
      }
      setTimeout(tick, intervalMin * 60000);
    };
    await tick();
  } else {
    await pollOnce();
  }
}

runLoop()
  .catch((err) => {
    console.error("[cron-ship24] fatal:", (err as Error).message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
