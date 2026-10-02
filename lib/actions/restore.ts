"use server";

import { auth } from "@/auth";
import { audit } from "@/lib/log";
import * as engine from "@/lib/restore/engine";

export type { RestorePoint, RestoreState, PointDetail, WorktreeChange } from "@/lib/restore/engine";

const ALLOWED_ROLES = ["SUPER_ADMIN", "MANAGER"];

async function requireRole(): Promise<{ actorId: string | null; actorRole: string } | null> {
  const session = await auth();
  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role)) return null;
  return { actorId: session.user.id ?? null, actorRole: session.user.role };
}

export async function getRestoreState() {
  const actor = await requireRole();
  if (!actor) return { ok: false, error: "Unauthorized" };
  return engine.getState();
}

export async function getRestorePointDetail(tag: string) {
  const actor = await requireRole();
  if (!actor) return { ok: false, error: "Unauthorized" };
  return engine.getPointDetail(tag);
}

export async function getWorktreeChangesPreview() {
  const actor = await requireRole();
  if (!actor) return { ok: false, error: "Unauthorized" };
  return engine.getWorktreeChanges();
}

export async function createRestorePoint(input: { title: string; note?: string }) {
  const actor = await requireRole();
  if (!actor) return { ok: false, error: "Unauthorized" };

  const result = await engine.createRestorePoint(input);
  if (result.ok && result.data) {
    await audit({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: "RESTORE_POINT_CREATED",
      target: result.data.tag,
      payload: { id: result.data.id, filesChanged: result.data.filesChanged, title: input.title },
    });
  } else {
    await audit({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: "RESTORE_POINT_CREATE_FAILED",
      target: "restore-points",
      payload: { error: result.error, title: input.title },
    });
  }
  return result;
}

export async function restorePointFiles(tag: string, mode: "hard" | "checkout") {
  const actor = await requireRole();
  if (!actor) return { ok: false, error: "Unauthorized" };

  if (mode === "hard" && actor.actorRole !== "SUPER_ADMIN") {
    return { ok: false, error: "Hard restore (git reset --hard) requires the SUPER_ADMIN role" };
  }

  const result = await engine.restoreFiles(tag, mode);
  if (result.ok && result.data) {
    await audit({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: "RESTORE_POINT_RESTORED",
      target: tag,
      payload: { mode, currentCommit: result.data.currentCommit },
    });
  } else {
    await audit({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: "RESTORE_POINT_RESTORE_FAILED",
      target: tag,
      payload: { mode, error: result.error },
    });
  }
  return result;
}