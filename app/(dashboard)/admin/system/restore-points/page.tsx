"use client";

import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  HistoryIcon,
  RefreshCwIcon,
  PlusIcon,
  Loader2Icon,
  GitBranchIcon,
  CheckCircle2Icon,
  RotateCcwIcon,
  HardDriveIcon,
  FolderIcon,
  CircleDotIcon,
  FileCode2Icon,
  AlertTriangleIcon,
} from "lucide-react";
import {
  getRestoreState,
  getRestorePointDetail,
  getWorktreeChangesPreview,
  createRestorePoint,
  restorePointFiles,
  type RestorePoint,
  type RestoreState,
  type PointDetail,
  type WorktreeChange,
} from "@/lib/actions/restore";

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d.slice(0, 10);
  return dt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(status: string) {
  const s = status === "??" ? "U" : status;
  const variant =
    s === "A"
      ? "default"
      : s === "M"
        ? "secondary"
        : s === "D"
          ? "destructive"
          : s === "R"
            ? "secondary"
            : "outline";
  const label =
    status === "??"
      ? "new"
      : status === "M"
        ? "modified"
        : status === "A"
          ? "added"
          : status === "D"
            ? "deleted"
            : status === "R"
              ? "renamed"
              : status;
  return <Badge variant={variant as "default" | "secondary" | "destructive" | "outline"}>{label}</Badge>;
}

export default function RestorePointsPage() {
  const { data: session } = useSession();
  const isSuper = session?.user?.role === "SUPER_ADMIN";

  const [state, setState] = useState<RestoreState | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [loading, startTransition] = useTransition();

  const [detailTag, setDetailTag] = useState<string | null>(null);
  const [detail, setDetail] = useState<PointDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createNote, setCreateNote] = useState("");
  const [preview, setPreview] = useState<WorktreeChange[]>([]);

  const [restoreTarget, setRestoreTarget] = useState<{ id: string; tag: string } | null>(null);

  const load = useCallback(() => {
    startTransition(async () => {
      const res = await getRestoreState();
      if (res.ok && res.data) setState(res.data);
      else setStateError(res.error ?? "Failed to load");
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(tag: string) {
    setDetailTag(tag);
    setDetail(null);
    setDetailLoading(true);
    const res = await getRestorePointDetail(tag);
    setDetailLoading(false);
    if (res.ok && res.data) setDetail(res.data);
    else toast.error(res.error ?? "Failed to load point");
  }

  async function openCreate() {
    setCreateOpen(true);
    const res = await getWorktreeChangesPreview();
    setPreview(res.ok && res.data ? res.data : []);
  }

  async function handleCreate() {
    if (!createTitle.trim()) return toast.error("Please enter a title");
    startTransition(async () => {
      const res = await createRestorePoint({ title: createTitle, note: createNote });
      if (res.ok && res.data) {
        toast.success(`Restore point ${res.data.id} created (${res.data.tag})`);
        setCreateOpen(false);
        setCreateTitle("");
        setCreateNote("");
        setPreview([]);
        load();
      } else {
        toast.error(res.error ?? "Failed to create restore point");
      }
    });
  }

  async function handleRestore() {
    const target = restoreTarget;
    setRestoreTarget(null);
    if (!target) return;
    startTransition(async () => {
      const res = await restorePointFiles(target.tag, "hard");
      if (res.ok && res.data) {
        toast.success(`Files restored to ${target.tag}`);
        load();
      } else {
        toast.error(res.error ?? "Restore failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <HistoryIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">نقاط الاستعادة / Restore Points (Developer)</h1>
            <p className="text-sm text-muted-foreground">
              إدارة نقاط استعادة git وإنشاءها واسترجاع الملفات — كل نقطة موثقة في RESTORE_POINTS.md.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCwIcon className="mr-2 size-4" /> Refresh
          </Button>
          <Button onClick={openCreate} disabled={loading || !!state && !state.gitAvailable}>
            <PlusIcon className="mr-2 size-4" /> New restore point
          </Button>
        </div>
      </div>

      {stateError && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {stateError}
        </div>
      )}

      {state && !state.gitAvailable && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <strong>Git engine غير متاح على هذه البيئة.</strong> لا يمكن إنشاء نقاط أو استرجاع ملفات الآن
          (يعمل هذا على بيئة المطور المحلية). سجل RESTORE_POINTS.md والنسخ الاحتياطية ما زالت متاحة بالقراءة.
        </div>
      )}

      {/* Git / backups status */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitBranchIcon className="size-5" />
            الحالة الحالية / Working Tree
          </CardTitle>
          {state?.gitAvailable && (
            <Badge className="bg-green-600">
              <CheckCircle2Icon data-icon="inline-start" /> Git ready
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {!state ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Branch" value={state.gitAvailable ? state.branch : "n/a"} icon={<CircleDotIcon className="size-4" />} />
              <Stat label="HEAD commit" value={state.gitAvailable ? state.currentCommit : "n/a"} icon={<GitBranchIcon className="size-4" />} />
              <Stat label="Dirty files" value={state.gitAvailable ? String(state.dirtyCount) : "n/a"} icon={<FileCode2Icon className="size-4" />} />
              <Stat label="Restore points" value={String(state.points.length)} icon={<HistoryIcon className="size-4" />} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backups snapshot map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDriveIcon className="size-5" />
            نسخ قاعدة البيانات الاحتياطية / DB Backups
          </CardTitle>
          <CardDescription>عند الاسترجاع: الملفات تُستعاد من git، وبيانات Supabase يُسترد أحدثها من هذه المجلدات.</CardDescription>
        </CardHeader>
        <CardContent>
          {state && state.backups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No backups folder yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(state?.backups ?? []).map((b) => (
                <div key={b.name} className="flex items-center gap-2 rounded-lg border p-2.5">
                  <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(b.mtime)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Points table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="size-5" />
            سجل نقاط الاستعادة / Restore Points
          </CardTitle>
          {state?.gitAvailable && state.points.length > 0 && (
            <Badge variant="outline">{state.points.length} points</Badge>
          )}
        </CardHeader>
        <CardContent>
          {!state ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" /> Loading points...
            </div>
          ) : state.points.length === 0 ? (
            <p className="text-sm text-muted-foreground">No restore points yet. Create the first one from <b>New restore point</b>.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Point</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {state.points.map((p: RestorePoint) => (
                    <tr key={p.tag} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={p.number === state.points[0]?.number ? "default" : "outline"}>{p.id}</Badge>
                          <span className="font-mono text-xs text-muted-foreground">{p.tag.replace("restores/", "")}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{formatDate(p.date)}</td>
                      <td className="max-w-md px-3 py-2">
                        <div className="truncate">{p.registry ?? p.subject}</div>
                      </td>
                      <td className="px-3 py-2">
                        {p.number === state.points[0]?.number && state.gitAvailable && p.shortCommit === state.currentCommit ? (
                          <Badge className="bg-green-600">HEAD</Badge>
                        ) : (
                          <Badge variant="outline">older</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openDetail(p.tag)} disabled={loading}>
                            Details
                          </Button>
                          {state.gitAvailable && isSuper && (
                            <Button size="sm" variant="destructive" onClick={() => setRestoreTarget({ id: p.id, tag: p.tag })} disabled={loading}>
                              <RotateCcwIcon className="mr-1 size-3" /> Restore
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailTag} onOpenChange={(o) => !o && setDetailTag(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HistoryIcon className="size-4" /> {detailTag}
            </DialogTitle>
            <DialogDescription>
              {detailLoading
                ? "Loading point details..."
                : detail
                  ? `${detail.subject} — ${new Date(detail.date).toLocaleString("en-GB")}`
                  : ""}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <div className="text-muted-foreground">Files changed</div>
                  <div className="text-base font-semibold">{detail.files.length}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <div className="text-muted-foreground">Commits behind HEAD</div>
                  <div className="text-base font-semibold">{detail.behind}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <div className="text-muted-foreground">This point is HEAD</div>
                  <div className="text-base font-semibold">{detail.isHead ? "Yes" : "No"}</div>
                </div>
              </div>

              {detail.isHead ? (
                <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-300">
                  This restore point matches the current working tree commit — nothing to restore.
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  {detail.behind > 0
                    ? `${detail.behind} commit(s) after this point will be reverted by a hard restore. Uncommitted changes and untracked files (uploads/…) are kept; DB data is restored from backups/ separately.`
                    : "This point is ahead of (or equal to) HEAD."}
                </div>
              )}

              <div className="max-h-56 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 text-left">
                    <tr>
                      <th className="px-3 py-1.5 font-medium text-muted-foreground">Status</th>
                      <th className="px-3 py-1.5 font-medium text-muted-foreground">Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.files.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-muted-foreground">
                          No file changes (docs-only point).
                        </td>
                      </tr>
                    ) : (
                      detail.files.map((f, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1">{statusBadge(f.status)}</td>
                          <td className="px-3 py-1 font-mono text-[0.7rem]">{f.path}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {detail.body && <p className="text-xs text-muted-foreground">{detail.body}</p>}

              {isSuper && (
                <Button variant="destructive" size="sm" onClick={() => { setRestoreTarget({ id: detail.tag.split("/").pop() ?? detail.tag, tag: detail.tag }); }}>
                  <RotateCcwIcon className="mr-1 size-3" /> Restore files to this point
                </Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTag(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => !o && setCreateOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusIcon className="size-4" /> New restore point
            </DialogTitle>
            <DialogDescription>
              ينشئ: commit للحالة الحالية + وسم git + سجل في RESTORE_POINTS.md وCHECKPOINTS.md + لقطات PROJECT_MAP/schema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rp-title">العنوان / Title</Label>
              <Input
                id="rp-title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="e.g. Homepage slider fixes"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-note">ملاحظة (اختياري) / Note</Label>
              <Textarea
                id="rp-note"
                value={createNote}
                onChange={(e) => setCreateNote(e.target.value)}
                rows={3}
                placeholder="What changed and how to revert it"
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                سيتم التقاط {preview.length} من الملفات المتغيرة:
              </div>
              <div className="max-h-44 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <tbody>
                    {preview.length === 0 ? (
                      <tr>
                        <td className="px-3 py-2 text-muted-foreground">
                          لا تغييرات في الملفات حالياً — سيُنجز كأي نقطة (docs-only).
                        </td>
                      </tr>
                    ) : (
                      preview.slice(0, 60).map((c, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1">{statusBadge(c.status)}</td>
                          <td className="px-3 py-1 font-mono text-[0.7rem]">{c.path}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {preview.length > 60 && (
                  <div className="px-3 py-1 text-xs text-muted-foreground">… +{preview.length - 60} more</div>
                )}
              </div>
            </div>

            {!state?.gitAvailable && (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                Git engine غير متاح — لن يتمكن الإجراء من الاكتمال على هذه البيئة.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <CheckCircle2Icon className="mr-2 size-4" />}
              Create point
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirm dialog */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangleIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>استرجاع الملفات إلى {restoreTarget?.tag}؟</AlertDialogTitle>
            <AlertDialogDescription>
              يعيد تعيين git hard (reset) إلى هذه النقطة. التغييرات غير الملتزمة في العمل الحالي ستُحذف،
              والملفات غير المتتبَّعة (مثل uploads) تبقى. بيانات Supabase لا تتأثر — استرجعها من مجلدات
              النسخ الاحتياطي أعلاه. يستغني عن كل الالتزامات اللاحقة لهذه النقطة (قابلة للاسترداد عبر reflog).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRestore}>
              {loading ? <Loader2Icon className="size-4 animate-spin" /> : <RotateCcwIcon className="size-4" />}
              استرجاع الملفات
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}