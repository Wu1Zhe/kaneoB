import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useReleaseNotes } from "./use-release-notes";
export function ReleaseHistory() {
  const { t, i18n } = useTranslation();
  const { query, acknowledge } = useReleaseNotes();
  const markRead = acknowledge.mutate;
  const attempted = useRef<number | null>(null);
  const latest = query.data?.notes[0];
  const locale = i18n.language.startsWith("zh") ? "zh" : "en";
  useEffect(() => {
    if (
      latest &&
      query.data &&
      latest.sequence > query.data.lastReadSequence &&
      attempted.current !== latest.sequence
    ) {
      attempted.current = latest.sequence;
      markRead(latest.sequence);
    }
  }, [latest, query.data, markRead]);
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-8">
      <header>
        <h1 className="text-2xl font-semibold">
          {t("workspace:updates.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("workspace:updates.subtitle")}
        </p>
      </header>
      {query.isPending && <p>{t("common:empty.loading")}</p>}
      {query.isError && (
        <div role="alert">
          <p className="text-sm text-destructive">
            {t("workspace:updates.loadError")}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            {t("common:error.tryAgain")}
          </Button>
        </div>
      )}
      {acknowledge.isError && latest && (
        <p role="alert" className="text-sm text-destructive">
          {t("workspace:updates.readError")}
          <Button
            type="button"
            variant="ghost"
            onClick={() => acknowledge.mutate(latest.sequence)}
          >
            {t("common:error.tryAgain")}
          </Button>
        </p>
      )}
      {query.data?.notes.map((note) => (
        <article key={note.sequence} className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{note.title[locale]}</h2>
            <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
              {note.version} · {note.date}
            </span>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {note.items[locale].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
