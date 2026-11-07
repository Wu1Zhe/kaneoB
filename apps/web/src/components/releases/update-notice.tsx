import { Link } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useReleaseNotes } from "./use-release-notes";
export function UpdateNotice() {
  const { t, i18n } = useTranslation();
  const { query, acknowledge } = useReleaseNotes();
  const locale = i18n.language.startsWith("zh") ? "zh" : "en";
  const unread =
    query.data?.notes.filter(
      (note) => note.sequence > (query.data?.lastReadSequence ?? 0),
    ) ?? [];
  const latest = unread[0];
  if (!latest) return null;
  const items = [...new Set(unread.flatMap((note) => note.items[locale]))];
  return (
    <aside
      aria-label={t("workspace:updates.noticeTitle")}
      className="fixed bottom-5 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl border border-primary/20 bg-card p-5 shadow-xl"
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">
            {t("workspace:updates.noticeTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest.version} · {latest.date}
            {unread.length > 1
              ? ` · ${t("workspace:updates.unreadVersions", { count: unread.length })}`
              : ""}
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={acknowledge.isPending}
          aria-label={t("workspace:updates.dismiss")}
          onClick={() => acknowledge.mutate(latest.sequence)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        {items.slice(0, 4).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {items.length > 4 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("workspace:updates.more", { count: items.length - 4 })}
        </p>
      )}
      {acknowledge.isError && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {t("workspace:updates.readError")}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between gap-2">
        <Link
          to="/dashboard/updates"
          className="text-sm text-primary hover:underline"
        >
          {t("workspace:updates.viewAll")}
        </Link>
        <Button
          type="button"
          size="sm"
          disabled={acknowledge.isPending}
          onClick={() => acknowledge.mutate(latest.sequence)}
        >
          {t("workspace:updates.dismiss")}
        </Button>
      </div>
    </aside>
  );
}
