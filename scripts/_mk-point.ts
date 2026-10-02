import { createRestorePoint } from "../lib/restore/engine";

async function main() {
  const res = await createRestorePoint({
    title: "Developer Restore Points panel",
    note: "Developer control panel for restore points: list/create git restore points, view per-point diffs, hard-restore files (SUPER_ADMIN). Server actions + safe git engine (no shell). New page /admin/system/restore-points, sidebar entry, i18n keys.",
  });
  console.log(JSON.stringify(res, null, 2));
}

main();