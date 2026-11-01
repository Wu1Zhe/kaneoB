import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Lightbulb, Pin, PinOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { IdeaPreview } from "@/fetchers/ideas";
import { formatDateTimeShort } from "@/lib/format";
import { IDEA_STATES } from "./idea-states";
export function IdeaCard({
  idea,
  workspaceId,
  canEdit,
  canConvert,
  pinning,
  onOpen,
  onPin,
  onConvert,
}: {
  idea: IdeaPreview;
  workspaceId: string;
  canEdit: boolean;
  canConvert: boolean;
  pinning: boolean;
  onOpen: () => void;
  onPin: () => void;
  onConvert: () => void;
}) {
  const { t } = useTranslation();
  const state = IDEA_STATES.find((item) => item.id === idea.status)!;
  return (
    <article
      className={`group flex min-h-56 min-w-0 flex-col rounded-2xl border bg-card p-4 shadow-xs/5 transition-shadow hover:shadow-md ${idea.pinned ? "border-amber-400/40" : "border-border/70"}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-medium ${state.className}`}
        >
          {t(state.label)}
        </span>
        {idea.pinned && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
            <Pin className="size-3" />
            {t("ideas:pinned")}
          </span>
        )}
        {canEdit && (
          <button
            type="button"
            disabled={pinning}
            aria-label={t(idea.pinned ? "ideas:unpin" : "ideas:pin")}
            onClick={onPin}
            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {idea.pinned ? (
              <PinOff className="size-3.5" />
            ) : (
              <Pin className="size-3.5" />
            )}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <h2 className="line-clamp-2 break-words text-base font-semibold leading-snug">
          {idea.title}
        </h2>
        <p className="mt-2 line-clamp-4 break-words text-sm leading-relaxed text-muted-foreground">
          {idea.excerpt || t("ideas:emptyContent")}
        </p>
      </button>
      {!!idea.tags.length && (
        <div className="mt-4 flex flex-wrap gap-1">
          {idea.tags.map((tag) => (
            <span
              key={tag}
              className="max-w-full truncate rounded-md bg-muted/70 px-2 py-0.5 text-[11px] text-muted-foreground"
              title={tag}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
        <span
          className="truncate"
          title={t("ideas:recordedAt", {
            date: formatDateTimeShort(idea.createdAt),
          })}
        >
          {idea.creatorName || t("ideas:unknownUser")} ·{" "}
          {formatDateTimeShort(idea.createdAt)}
        </span>
        {idea.convertedTaskId ? (
          <Link
            to="/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId"
            params={{
              workspaceId,
              projectId: idea.projectId,
              taskId: idea.convertedTaskId,
            }}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            {t("ideas:viewTask")}
            <ArrowUpRight className="size-3" />
          </Link>
        ) : idea.convertedAt ? (
          <span>{t("ideas:taskRemoved")}</span>
        ) : (
          canConvert && (
            <button
              type="button"
              onClick={onConvert}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <Lightbulb className="size-3.5 text-amber-500" />
              {t("ideas:adopt")}
            </button>
          )
        )}
      </div>
    </article>
  );
}
