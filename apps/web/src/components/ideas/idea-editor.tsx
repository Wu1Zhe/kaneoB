import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { useSaveIdea } from "@/hooks/queries/ideas/use-ideas";
import type { Idea, IdeaState } from "@/fetchers/ideas";
import { uploadDraftAsset } from "@/lib/upload-draft-asset";
import { HttpError } from "@/lib/http-error";
import { toast } from "@/lib/toast";
import { IDEA_STATES, parseIdeaTags } from "./idea-states";
const CommentEditor = lazy(
  () => import("@/components/activity/comment-editor"),
);

export function IdeaEditor({
  projectId,
  workspaceId,
  idea,
  initialTitle = "",
  onClose,
  onSaved,
  onConvert,
}: {
  projectId: string;
  workspaceId: string;
  idea?: Idea;
  initialTitle?: string;
  onClose: () => void;
  onSaved: (idea: Idea) => void;
  onConvert: () => void;
}) {
  const { t } = useTranslation();
  const permissions = useWorkspacePermission();
  // Keep the version that this draft was based on. Live refreshes must not
  // overwrite unsaved input or silently turn a stale save into a fresh one.
  const [original] = useState(idea);
  const [title, setTitle] = useState(original?.title ?? initialTitle);
  const [description, setDescription] = useState(original?.description ?? "");
  const [status, setStatus] = useState<IdeaState>(original?.status ?? "inbox");
  const [tags, setTags] = useState(original?.tags.join(", ") ?? "");
  const [pinned, setPinned] = useState(original?.pinned ?? false);
  const [discarding, setDiscarding] = useState(false);
  const [uploads, setUploads] = useState(0);
  const uploadCount = useRef(0);
  const save = useSaveIdea(projectId);
  const canEdit = original
    ? permissions.canUpdateTasks()
    : permissions.canCreateTasks();
  const parsedTags = parseIdeaTags(tags);
  const invalidTags =
    parsedTags.length > 12 || parsedTags.some((tag) => tag.length > 32);
  const dirty =
    title !== (original?.title ?? "") ||
    description !== (original?.description ?? "") ||
    status !== (original?.status ?? "inbox") ||
    JSON.stringify(parsedTags) !== JSON.stringify(original?.tags ?? []) ||
    pinned !== Boolean(original?.pinned);
  const close = () => {
    if (save.isPending || uploads) return;
    if (canEdit && dirty) setDiscarding(true);
    else onClose();
  };
  const submit = async () => {
    if (
      !canEdit ||
      !title.trim() ||
      invalidTags ||
      uploadCount.current ||
      save.isPending
    )
      return;
    try {
      const updated = await save.mutateAsync({
        input: {
          title: title.trim(),
          description,
          status,
          tags: parsedTags,
          pinned,
        },
        previous: original,
      });
      toast.success(t("ideas:saved"));
      onSaved(updated);
    } catch (error) {
      toast.error(
        error instanceof HttpError && error.status === 409
          ? t("ideas:conflict")
          : t("ideas:saveError"),
      );
    }
  };
  const upload = useCallback(
    async (file: File) => {
      uploadCount.current++;
      setUploads(uploadCount.current);
      try {
        return await uploadDraftAsset(projectId, file);
      } finally {
        uploadCount.current--;
        setUploads(uploadCount.current);
      }
    },
    [projectId],
  );
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent
          className="sm:max-w-3xl"
          showCloseButton={!save.isPending && !uploads}
        >
          <DialogHeader>
            <DialogTitle>
              {t(original ? "ideas:edit" : "ideas:new")}
            </DialogTitle>
            <DialogDescription>{t("ideas:editorHint")}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="max-h-[62vh] space-y-5 overflow-y-auto px-6 pb-6">
              <label className="block text-sm font-medium">
                {t("ideas:name")} *
                <input
                  required
                  maxLength={200}
                  aria-label={t("ideas:name")}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  readOnly={!canEdit}
                  className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t("ideas:namePlaceholder")}
                />
              </label>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2">
                  {t("ideas:state")}
                  <select
                    aria-label={t("ideas:state")}
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as IdeaState)
                    }
                    disabled={!canEdit || Boolean(original?.convertedAt)}
                    className="h-8 rounded-lg border bg-background px-2"
                  >
                    {IDEA_STATES.map((state) => (
                      <option key={state.id} value={state.id}>
                        {t(state.label)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={(event) => setPinned(event.target.checked)}
                    disabled={!canEdit}
                  />
                  {t("ideas:pin")}
                </label>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">{t("ideas:content")}</p>
                <div className="min-h-44 rounded-lg border bg-background p-3">
                  <Suspense
                    fallback={
                      <p className="p-4 text-sm text-muted-foreground">
                        {t("ideas:loading")}
                      </p>
                    }
                  >
                    <CommentEditor
                      value={description}
                      onChange={setDescription}
                      readOnly={!canEdit}
                      projectId={projectId}
                      placeholder={t("ideas:contentPlaceholder")}
                      onSubmitShortcut={() => {
                        void submit();
                      }}
                      uploadAsset={
                        canEdit && permissions.canCreateTasks()
                          ? upload
                          : undefined
                      }
                    />
                  </Suspense>
                </div>
              </div>
              <label className="block text-sm font-medium">
                {t("ideas:tags")}
                <input
                  aria-label={t("ideas:tags")}
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  readOnly={!canEdit}
                  className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t("ideas:tagsPlaceholder")}
                />
                <span
                  className={`mt-1 block text-xs font-normal ${invalidTags ? "text-destructive-foreground" : "text-muted-foreground"}`}
                >
                  {t(invalidTags ? "ideas:tagsError" : "ideas:tagsHint")}
                </span>
              </label>
              {original?.convertedAt && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
                  {original.convertedTaskId ? (
                    <Link
                      to="/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId"
                      params={{
                        workspaceId,
                        projectId,
                        taskId: original.convertedTaskId,
                      }}
                      className="font-medium hover:underline"
                    >
                      {t("ideas:viewTask")} ↗
                    </Link>
                  ) : (
                    t("ideas:taskRemoved")
                  )}
                </div>
              )}
              {original && idea?.version !== original.version && (
                <p role="alert" className="text-xs text-warning-foreground">
                  {t("ideas:conflict")}
                </p>
              )}
            </div>
            <DialogFooter>
              {original &&
                !original.convertedAt &&
                permissions.canUpdateTasks() &&
                permissions.canCreateTasks() && (
                  <Button
                    type="button"
                    variant="outline"
                    className="sm:mr-auto"
                    disabled={dirty || save.isPending || !!uploads}
                    title={dirty ? t("ideas:saveFirst") : undefined}
                    onClick={onConvert}
                  >
                    {t("ideas:adopt")}
                  </Button>
                )}
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={save.isPending || !!uploads}
              >
                {t("common:actions.close")}
              </Button>
              {canEdit && (
                <Button
                  type="submit"
                  loading={save.isPending}
                  disabled={!title.trim() || invalidTags || !!uploads || !dirty}
                >
                  {t(uploads ? "ideas:uploading" : "ideas:save")}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={discarding}
        onOpenChange={setDiscarding}
        title={t("ideas:discardTitle")}
        description={t("ideas:discardHint")}
        confirmLabel={t("ideas:discard")}
        onConfirm={onClose}
      />
    </>
  );
}
