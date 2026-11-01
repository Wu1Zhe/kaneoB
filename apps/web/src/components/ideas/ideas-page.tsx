import { Lightbulb, Plus, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { useSessionState } from "@/hooks/use-session-state";
import { useIdeas, useSaveIdea } from "@/hooks/queries/ideas/use-ideas";
import { getIdea, type IdeaState } from "@/fetchers/ideas";
import { toast } from "@/lib/toast";
import { IdeaCard } from "./idea-card";
import { IdeaDialog } from "./idea-dialog";
import { ConvertIdeaDialog } from "./convert-idea-dialog";
import { IDEA_STATES } from "./idea-states";

export function IdeasPage({
  projectId,
  workspaceId,
  selectedId,
  onSelect,
}: {
  projectId: string;
  workspaceId: string;
  selectedId?: string;
  onSelect: (id?: string) => void;
}) {
  const { t } = useTranslation();
  const permissions = useWorkspacePermission();
  const [filters, setFilters] = useSessionState<{
    search: string;
    status?: IdeaState;
    tag?: string;
    page: number;
  }>(`kaneo:idea-filters:${projectId}`, { search: "", page: 1 });
  const [search, setSearch] = useState(filters.search);
  const [quick, setQuick] = useState("");
  const [creating, setCreating] = useState(false);
  const [converting, setConverting] = useState<string>();
  const [pinning, setPinning] = useState<string>();
  const query = useIdeas(projectId, filters);
  const save = useSaveIdea(projectId);
  const canCreate = permissions.canCreateTasks();
  const canEdit = permissions.canUpdateTasks();
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setFilters((previous) =>
          previous.search === search
            ? previous
            : { ...previous, search, page: 1 },
        ),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [search, setFilters]);
  useEffect(() => {
    if (query.data && filters.page > Math.max(1, query.data.pages))
      setFilters((previous) => ({
        ...previous,
        page: Math.max(1, query.data.pages),
      }));
  }, [query.data, filters.page, setFilters]);
  const capture = async () => {
    if (!quick.trim() || save.isPending) return;
    try {
      await save.mutateAsync({ input: { title: quick.trim() } });
      setQuick("");
      setSearch("");
      setFilters({ search: "", page: 1 });
      toast.success(t("ideas:captured"));
    } catch {
      toast.error(t("ideas:saveError"));
    }
  };
  const togglePin = async (id: string) => {
    if (pinning) return;
    setPinning(id);
    try {
      const idea = await getIdea(projectId, id);
      await save.mutateAsync({
        previous: idea,
        input: {
          title: idea.title,
          description: idea.description,
          status: idea.status,
          tags: idea.tags,
          pinned: !idea.pinned,
        },
      });
    } catch {
      toast.error(t("ideas:saveError"));
    } finally {
      setPinning(undefined);
    }
  };
  const openConversion = (id: string) => {
    onSelect(undefined);
    setCreating(false);
    setConverting(id);
  };
  return (
    <div className="min-h-full bg-muted/15 p-4 sm:p-5">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3">
              <Lightbulb className="size-6 text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{t("ideas:title")}</h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t("ideas:subtitle")}
              </p>
            </div>
          </div>
          {canCreate && (
            <Button className="gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {t("ideas:new")}
            </Button>
          )}
        </div>
        {canCreate && (
          <form
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-400/25 bg-gradient-to-r from-amber-500/5 to-transparent p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void capture();
            }}
          >
            <Sparkles
              className="ml-1 size-4 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <input
              aria-label={t("ideas:quickCapture")}
              placeholder={t("ideas:quickPlaceholder")}
              value={quick}
              maxLength={200}
              onChange={(event) => setQuick(event.target.value)}
              className="h-10 min-w-44 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              loading={save.isPending && !pinning}
              disabled={!quick.trim()}
            >
              {t("ideas:capture")}
            </Button>
          </form>
        )}
        <div className="space-y-3">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label={t("ideas:filterState")}
          >
            <button
              type="button"
              aria-pressed={!filters.status}
              onClick={() =>
                setFilters((previous) => ({
                  ...previous,
                  status: undefined,
                  page: 1,
                }))
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${!filters.status ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
            >
              {t("ideas:all")}
              <span className="ml-2 tabular-nums">
                {query.data?.counts.all ?? "—"}
              </span>
            </button>
            {IDEA_STATES.map((state) => (
              <button
                key={state.id}
                type="button"
                aria-pressed={filters.status === state.id}
                onClick={() =>
                  setFilters((previous) => ({
                    ...previous,
                    status: state.id,
                    page: 1,
                  }))
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${filters.status === state.id ? `border-current/20 ${state.className}` : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
              >
                {t(state.label)}
                <span className="ml-2 tabular-nums">
                  {query.data?.counts[state.id] ?? "—"}
                </span>
              </button>
            ))}
            <div className="ml-auto flex flex-wrap gap-2">
              <label className="flex h-9 items-center gap-2 rounded-lg border bg-card px-3">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  aria-label={t("ideas:search")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("ideas:search")}
                  maxLength={200}
                  className="w-44 bg-transparent text-xs outline-none"
                />
              </label>
              <select
                aria-label={t("ideas:filterTag")}
                value={filters.tag ?? ""}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    tag: event.target.value || undefined,
                    page: 1,
                  }))
                }
                className="h-9 max-w-48 rounded-lg border bg-card px-2 text-xs"
              >
                <option value="">{t("ideas:allTags")}</option>
                {query.data?.tags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("ideas:scopeHint")}
          </p>
        </div>
        {query.isError && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-lg border p-4 text-sm"
          >
            <p>{t("ideas:loadError")}</p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              {t("ideas:retry")}
            </Button>
          </div>
        )}
        {query.isPending ? (
          <p
            role="status"
            className="p-8 text-center text-sm text-muted-foreground"
          >
            {t("ideas:loading")}
          </p>
        ) : (
          query.data &&
          (query.data.items.length ? (
            <>
              <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {query.data.items.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    workspaceId={workspaceId}
                    canEdit={canEdit}
                    canConvert={canEdit && canCreate}
                    pinning={pinning === idea.id}
                    onOpen={() => onSelect(idea.id)}
                    onConvert={() => openConversion(idea.id)}
                    onPin={() => {
                      void togglePin(idea.id);
                    }}
                  />
                ))}
              </div>
              {query.data.pages > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={filters.page === 1}
                    onClick={() =>
                      setFilters((previous) => ({
                        ...previous,
                        page: previous.page - 1,
                      }))
                    }
                  >
                    {t("ideas:previous")}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {t("ideas:page", {
                      page: filters.page,
                      pages: query.data.pages,
                      total: query.data.total,
                    })}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={filters.page >= query.data.pages}
                    onClick={() =>
                      setFilters((previous) => ({
                        ...previous,
                        page: previous.page + 1,
                      }))
                    }
                  >
                    {t("ideas:next")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/50 px-5 py-10 text-center">
              <Lightbulb className="size-9 text-amber-500/60" />
              <h2 className="font-semibold">
                {t(
                  filters.search || filters.status || filters.tag
                    ? "ideas:noResults"
                    : "ideas:emptyTitle",
                )}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                {t(
                  filters.search || filters.status || filters.tag
                    ? "ideas:noResultsHint"
                    : "ideas:emptyHint",
                )}
              </p>
              {canCreate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCreating(true)}
                >
                  {t("ideas:new")}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
      {(creating || selectedId) && (
        <IdeaDialog
          projectId={projectId}
          workspaceId={workspaceId}
          ideaId={selectedId}
          initialTitle={creating ? quick : undefined}
          onClose={() => {
            setCreating(false);
            onSelect(undefined);
          }}
          onConvert={openConversion}
        />
      )}
      {converting && (
        <ConvertIdeaDialog
          key={converting}
          projectId={projectId}
          workspaceId={workspaceId}
          ideaId={converting}
          onClose={() => setConverting(undefined)}
        />
      )}
    </div>
  );
}
