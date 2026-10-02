import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Restore-points engine (git-backed).
 * Runs ONLY a whitelisted set of git commands via execFile (no shell), with
 * strict tag validation. File writes (registry, snapshots) are local and UTF-8.
 * Dev-tool only: gracefully reports when the git engine is unavailable (e.g. prod server).
 */

const execFileP = promisify(execFile);
const GIT_TIMEOUT_MS = 20000;
const MAX_BUFFER = 64 * 1024 * 1024;
const COMMITTER_NAME = "Rowad Ops";
const COMMITTER_EMAIL = "rowad-ops@local";
const TAG_RE = /^restores\/cp-0\d{2,3}(-[a-z0-9._-]{1,40})?$/;

export type RestorePoint = {
  id: string;
  tag: string;
  number: number;
  date: string;
  shortCommit: string;
  subject: string;
  registry: string | null;
};

export type RestoreState = {
  gitAvailable: boolean;
  engineError: string | null;
  repoRoot: string;
  branch: string;
  currentCommit: string;
  dirtyCount: number;
  points: RestorePoint[];
  backups: { name: string; mtime: string }[];
};

export type WorktreeChange = { status: string; path: string };

export type PointDetail = {
  tag: string;
  fullCommit: string;
  date: string;
  subject: string;
  body: string;
  files: WorktreeChange[];
  behind: number;
  ahead: number;
  isHead: boolean;
};

export type Result<T> = { ok: boolean; data?: T; error?: string };

let gitBin: string | undefined;
function resolveGitBin(): string {
  if (gitBin !== undefined) return gitBin;
  const candidates = [
    process.env.GIT_PATH,
    "C:\\Program Files\\Git\\cmd\\git.exe",
    process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Git\\cmd\\git.exe") : null,
    process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "Git\\cmd\\git.exe") : null,
  ].filter((p): p is string => !!p);
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      gitBin = c;
      return c;
    }
  }
  gitBin = "git";
  return gitBin;
}

type GitResult =
  | { ok: true; stdout: string; stderr: string }
  | { ok: false; missing: boolean; stderr: string };

async function runGit(args: string[], opts: { cwd?: string; timeoutMs?: number } = {}): Promise<GitResult> {
  const bin = resolveGitBin();
  try {
    const { stdout, stderr } = await execFileP(bin, args, {
      cwd: opts.cwd,
      timeout: opts.timeoutMs ?? GIT_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { stderr?: string };
    if (err.code === "ENOENT" || err.code === "EACCES") {
      return { ok: false, missing: true, stderr: `Git binary not found (${bin})` };
    }
    return { ok: false, missing: false, stderr: String(err.stderr ?? err.message ?? e) };
  }
}

let repoRoot: string | null = null;
async function getRepoRoot(): Promise<string> {
  if (repoRoot) return repoRoot;
  const r = await runGit(["rev-parse", "--show-toplevel"]);
  repoRoot = r.ok ? r.stdout : process.cwd();
  return repoRoot;
}

let availability: boolean | null = null;
export async function isGitAvailable(): Promise<boolean> {
  if (availability !== null) return availability;
  const r = await runGit(["--version"]);
  availability = r.ok;
  return availability;
}

function parseRegistry(repoRootPath: string): Map<string, string> {
  const file = path.join(repoRootPath, "RESTORE_POINTS.md");
  if (!fs.existsSync(file)) return new Map();
  const text = fs.readFileSync(file, "utf8");
  const rows = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\|\s*\*?cp-(\d{2,3})\*?\s*\|(.*)\|$/);
    if (!m) continue;
    const cells = m[2].split("|").map((c) => c.trim());
    if (cells.length >= 4 && /^\d{4}-\d{2}-\d{2}$/.test(cells[0].slice(0, 10))) {
      rows.set(`cp-${m[1]}`, cells.slice(1, 4).join(" — "));
    }
  }
  return rows;
}

function listBackups(repoRootPath: string): { name: string; mtime: string }[] {
  const dir = path.join(repoRootPath, "backups");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const st = fs.statSync(path.join(dir, d.name));
      return { name: d.name, mtime: st.mtime.toISOString().slice(0, 19).replace("T", " ") };
    })
    .sort((a, b) => b.mtime.localeCompare(a.mtime));
}

export async function getState(): Promise<Result<RestoreState>> {
  const root = await getRepoRoot();
  const available = await isGitAvailable();
  const backups = listBackups(root);
  if (!available) {
    return {
      ok: true,
      data: {
        gitAvailable: false,
        engineError: null,
        repoRoot: root,
        branch: "",
        currentCommit: "",
        dirtyCount: 0,
        points: [],
        backups,
      },
    };
  }

  const [branchR, commitR, statusR, tagsR] = await Promise.all([
    runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root }),
    runGit(["rev-parse", "--short", "HEAD"], { cwd: root }),
    runGit(["status", "--porcelain=v1"], { cwd: root }),
    runGit(["for-each-ref", "--format=%(refname:short)%09%(creatordate:iso8601)%09%(objectname:short)%09%(subject)", "refs/tags/restores/*"], { cwd: root }),
  ]);

  if (!branchR.ok || !commitR.ok || !statusR.ok || !tagsR.ok) {
    return { ok: false, error: "Git commands failed" };
  }

  const registry = parseRegistry(root);

  const points: RestorePoint[] = (tagsR.stdout ? tagsR.stdout.split(/\r?\n/) : [])
    .map((line) => {
      const [tag, date, shortCommit, ...subjectParts] = line.split("\t");
      const m = tag.match(/^restores\/cp-(\d{2,3})/);
      if (!m) return null;
      const id = `cp-${m[1]}`;
      return {
        id,
        tag,
        number: Number(m[1]),
        date: date ?? "",
        shortCommit: shortCommit ?? "",
        subject: subjectParts.join("\t").slice(0, 120),
        registry: registry.get(id) ?? null,
      };
    })
    .filter((p): p is RestorePoint => !!p)
    .sort((a, b) => (a.number > b.number ? -1 : 1));

  const dirtyCount = statusR.stdout ? statusR.stdout.split(/\r?\n/).filter(Boolean).length : 0;

  return {
    ok: true,
    data: {
      gitAvailable: true,
      engineError: null,
      repoRoot: root,
      branch: branchR.stdout,
      currentCommit: commitR.stdout,
      dirtyCount,
      points,
      backups,
    },
  };
}

function isValidTag(tag: string): boolean {
  return TAG_RE.test(tag);
}

export async function getPointDetail(tag: string): Promise<Result<PointDetail>> {
  if (!isValidTag(tag)) return { ok: false, error: `Invalid restore-point tag: ${tag}` };
  const root = await getRepoRoot();

  const verify = await runGit(["rev-parse", "--verify", "-q", "--end-of-options", tag], { cwd: root });
  if (!verify.ok) return { ok: false, error: `Restore point not found: ${tag}` };

  const [infoR, filesR, countsR, headR] = await Promise.all([
    runGit(["show", "-s", "--format=%H%n%ci%n%s%n%B", tag], { cwd: root }),
    runGit(["show", "--no-commit-id", "--name-status", "--format=", tag], { cwd: root }),
    runGit(["rev-list", "--left-right", "--count", `HEAD...${tag}`], { cwd: root }),
    runGit(["rev-parse", "HEAD"], { cwd: root }),
  ]);

  if (!infoR.ok || !filesR.ok || !countsR.ok || !headR.ok) {
    return { ok: false, error: "Failed to inspect restore point" };
  }

  const [fullCommit, date, subject, ...bodyLines] = infoR.stdout.split(/\r?\n/);
  const [left, right] = countsR.stdout.split(/\t/).map((n) => Number(n) || 0);

  const files: WorktreeChange[] = filesR.stdout
    ? filesR.stdout.split(/\r?\n/)
        .map((line) => {
          const parts = line.split("\t");
          const status = parts[0] ?? "";
          const raw = parts[parts.length - 1] ?? "";
          return { status: status.slice(0, 1) === "R" || status.slice(0, 1) === "C" ? "R" : status, path: raw };
        })
        .filter((f) => f.status && f.path)
    : [];

  return {
    ok: true,
    data: {
      tag,
      fullCommit,
      date,
      subject,
      body: bodyLines.join("\n").trim(),
      files,
      behind: left,
      ahead: right,
      isHead: headR.stdout === fullCommit,
    },
  };
}

export async function getWorktreeChanges(): Promise<Result<WorktreeChange[]>> {
  const root = await getRepoRoot();
  const r = await runGit(["status", "--porcelain=v1"], { cwd: root });
  if (!r.ok) return { ok: false, error: "Failed to read working tree state" };
  const changes: WorktreeChange[] = (r.stdout ? r.stdout.split(/\r?\n/) : [])
    .map((line) => {
      const status = line.slice(0, 2).trim() || "??";
      let rest = line.slice(3);
      if (rest.includes(" -> ")) rest = rest.split(" -> ").pop() ?? rest;
      rest = rest.replace(/^"(.*)"$/, "$1");
      return { status, path: rest };
    })
    .filter((c) => !!c.path);
  return { ok: true, data: changes };
}

async function nextPointNumber(repoRootPath: string): Promise<number> {
  let max = 0;
  const seen = new Set<string>();
  const registry = parseRegistry(repoRootPath);
  registry.forEach((_v, id) => seen.add(id));
  const tagsR = await runGit(["for-each-ref", "--format=%(refname:short)", "refs/tags/restores/*"], { cwd: repoRootPath });
  if (tagsR.ok) {
    for (const line of tagsR.stdout.split(/\r?\n/)) {
      const m = line.match(/^restores\/cp-(\d{2,3})/);
      if (m) seen.add(`cp-${m[1]}`);
    }
  }
  for (const id of seen) {
    const n = Number(id.replace(/^cp-/, ""));
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return Math.max(18, max + 1);
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "auto";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureRegistryFile(repoRootPath: string) {
  const file = path.join(repoRootPath, "RESTORE_POINTS.md");
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      [
        "# RESTORE POINTS REGISTRY — ROWAD SABAA LOGISTICS",
        "",
        "| النقطة | التاريخ | التركيز | ماذا تحتوي | أثر الرجوع عنها |",
        "|---|---|---|---|---|",
        "",
      ].join("\n"),
      "utf8",
    );
  }
}

export type CreateRestorePointInput = { title: string; note?: string };

export async function createRestorePoint(input: CreateRestorePointInput): Promise<
  Result<{ id: string; tag: string; commit: string | null; filesChanged: number }>
> {
  const title = input.title?.trim().slice(0, 120);
  if (!title) return { ok: false, error: "Title is required" };
  const note = input.note?.trim().slice(0, 2000) ?? "";

  const root = await getRepoRoot();
  const available = await isGitAvailable();
  if (!available) return { ok: false, error: "Git engine not available in this environment" };

  ensureRegistryFile(root);

  const number = await nextPointNumber(root);
  const id = `cp-${String(number).padStart(3, "0")}`;
  const tag = `restores/${id}-${slugify(title)}`;

  // 1) Capture the actual code changes first (before docs alter the tree).
  const changesR = await getWorktreeChanges();
  const affected = changesR.ok ? changesR.data ?? [] : [];

  // 2) Commit the current state.
  const stateCommit = await commitAll(root, `${id}: ${title}`);
  if (!stateCommit.ok) return { ok: false, error: "State commit failed" };

  // 3) Write registry docs + snapshots, then commit docs, then tag.
  try {
    writeRestoreDocs(root, { number, id, tag, title, note, affected, commit: stateCommit.commit });
    const docsCommit = await commitAll(root, `${id}: restore point docs`);
    const tagR = await runGit(["tag", tag], { cwd: root });
    if (!tagR.ok) return { ok: false, error: `Failed to create tag: ${tagR.stderr}` };
    return {
      ok: true,
      data: { id, tag, commit: (docsCommit.committed ? docsCommit.commit : stateCommit.commit) ?? tagR.stdout, filesChanged: affected.length },
    };
  } catch (e) {
    return { ok: false, error: `Failed to write restore docs: ${(e as Error).message}` };
  }
}

async function commitAll(
  root: string,
  message: string,
): Promise<{ ok: boolean; committed: boolean; commit: string | null }> {
  const add = await runGit(["add", "-A"], { cwd: root });
  if (!add.ok) return { ok: false, committed: false, commit: null };
  const c = await runGit(
    [
      "-c",
      `user.name=${COMMITTER_NAME}`,
      "-c",
      `user.email=${COMMITTER_EMAIL}`,
      "commit",
      "-q",
      "-m",
      message,
    ],
    { cwd: root },
  );
  if (!c.ok) {
    if (/nothing to commit|no changes added|did not match any files/i.test(c.stderr)) {
      return { ok: true, committed: false, commit: null };
    }
    return { ok: false, committed: false, commit: null };
  }
  const rev = await runGit(["rev-parse", "--short", "HEAD"], { cwd: root });
  return { ok: true, committed: true, commit: rev.ok ? rev.stdout : null };
}

function writeRestoreDocs(
  root: string,
  p: {
    number: number;
    id: string;
    tag: string;
    title: string;
    note: string;
    affected: WorktreeChange[];
    commit: string | null;
  },
) {
  const date = todayIso();
  const registryFile = path.join(root, "RESTORE_POINTS.md");
  const checkpointFile = path.join(root, "CHECKPOINTS.md");
  const projectMap = path.join(root, "PROJECT_MAP.md");
  const schema = path.join(root, "prisma", "schema.prisma");

  const affectedSummary =
    p.affected.length === 0
      ? "لا تغييرات كود (نقطة مستندات فقط)."
      : p.affected
          .slice(0, 25)
          .map((c) => `\`${c.status === "??" ? "untracked" : c.status} ${c.path}\``)
          .join(", ") + (p.affected.length > 25 ? ` … (+${p.affected.length - 25})` : "");

  // Insert a registry table row right after the last `| cp-` row.
  if (fs.existsSync(registryFile)) {
    const lines = fs.readFileSync(registryFile, "utf8").split(/\r?\n/);
    let lastRow = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\|\s*\*?cp-\d{2,3}\*?\s*\|/.test(lines[i])) lastRow = i;
    }
    const row = `| **${p.id}** | **${date}** | ${p.title} | ${p.note || p.title} | files-استرجاع عبر git، والبيانات من backups/ |`;
    if (lastRow >= 0) {
      lines.splice(lastRow + 1, 0, row);
      fs.writeFileSync(registryFile, lines.join("\n"), "utf8");
    } else {
      fs.appendFileSync(registryFile, "\n" + row + "\n", "utf8");
    }
  }

  const section = [
    "",
    "---",
    "",
    `## ${p.id} — ${p.title} (${date})`,
    "",
    `**tag:** \`${p.tag}\` | **short:** \`${p.commit ?? "HEAD"}\` | تعداد الملفات: ${p.affected.length}`,
    "",
    `- **المحتوى:** ${affectedSummary}`,
    ...(p.note ? [`- **ملاحظة المطور:** ${p.note}`] : []),
    `- **استرداد الملفات:** \`git reset --hard ${p.tag}\` — أو \`git checkout ${p.tag} -- .\``,
    `- **بيانات DB:** استردها من أحدث مجلد ضمن \`backups/\` بتاريخ ${date}.`,
    "",
  ].join("\n");

  fs.appendFileSync(registryFile, section, "utf8");

  // Snapshots per project convention.
  if (fs.existsSync(projectMap)) {
    fs.copyFileSync(projectMap, path.join(root, `PROJECT_MAP.cp-${p.number}.md`));
  }
  if (fs.existsSync(schema)) {
    fs.copyFileSync(schema, path.join(root, `schema.cp-${p.number}.prisma`));
  }

  // CHECKPOINTS entry.
  const checkpointEntry = [
    "",
    "---",
    "",
    `## Checkpoint ${p.id} - ${date} - DONE: ${p.title}`,
    `- Created from the developer Restore Points panel under Admin > System Control. Note: ${p.note || "n/a"}`,
    `- Tag: \`${p.tag}\` (commit ${p.commit ?? "HEAD"}) | files changed: ${p.affected.length}.`,
    "",
  ].join("\n");
  fs.appendFileSync(checkpointFile, checkpointEntry, "utf8");
}

export async function restoreFiles(
  tag: string,
  mode: "hard" | "checkout",
): Promise<Result<{ tag: string; mode: string; currentCommit: string }>> {
  if (!isValidTag(tag)) return { ok: false, error: `Invalid restore-point tag: ${tag}` };
  const root = await getRepoRoot();
  const verify = await runGit(["rev-parse", "--verify", "-q", "--end-of-options", tag], { cwd: root });
  if (!verify.ok) return { ok: false, error: `Restore point not found: ${tag}` };

  const r = mode === "hard" ? await runGit(["reset", "--hard", tag], { cwd: root }) : await runGit(["checkout", tag, "--", "."], { cwd: root });
  if (!r.ok) return { ok: false, error: `Restore failed: ${r.stderr}` };

  const head = await runGit(["rev-parse", "--short", "HEAD"], { cwd: root });
  return { ok: true, data: { tag, mode, currentCommit: head.ok ? head.stdout : "" } };
}