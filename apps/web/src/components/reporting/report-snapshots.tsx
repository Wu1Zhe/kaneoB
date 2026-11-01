import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import {
  getSnapshots,
  saveSnapshot,
  type DashboardReport,
} from "@/fetchers/reporting/get-report";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { ReportPanel } from "./report-panel";
import { SnapshotComparison } from "./snapshot-comparison";
import { snapshotDiff } from "./snapshot-diff";
import { ReportTaskList } from "./report-task-list";
export function ReportSnapshots({
  report,
  workspaceId,
  onView,
  readOnly = false,
}: {
  report: DashboardReport;
  workspaceId: string;
  readOnly?: boolean;
  onView: (report: DashboardReport, name: string) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canUpdateTasks } = useWorkspacePermission();
  const [name, setName] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["report-snapshots", report.project.id],
    queryFn: ({ pageParam }) =>
      getSnapshots(report.project.id, pageParam?.createdAt, pageParam?.id),
    initialPageParam: undefined as
      | { createdAt: string; id: string }
      | undefined,
    getNextPageParam: (page) =>
      page.length === 50
        ? { createdAt: page.at(-1)!.createdAt, id: page.at(-1)!.id }
        : undefined,
    refetchOnMount: "always",
  });
  const save = useMutation({
    mutationFn: () =>
      saveSnapshot(
        report.project.id,
        report.since,
        report.asOf,
        name.trim() || `${report.project.name} ${report.asOf.slice(0, 10)}`,
        report.settings.staleDays,
      ),
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({
        queryKey: ["report-snapshots", report.project.id],
      });
      toast.success(t("reporting:snapshotSaved"));
    },
    onError: (error) => toast.error(error.message),
  });
  const snapshots = query.data?.pages.flat() ?? [];
  const before = snapshots.find((snapshot) => snapshot.id === a);
  const after = snapshots.find((snapshot) => snapshot.id === b);
  const comparison =
    before && after && before.id !== after.id
      ? snapshotDiff(before.data, after.data)
      : null;
  return (
    <ReportPanel
      title={t("reporting:snapshots")}
      subtitle={t("reporting:snapshotHint")}
      className="col-span-full"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          aria-label={t("reporting:snapshotName")}
          placeholder={t("reporting:snapshotName")}
          maxLength={160}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-8 rounded border bg-background px-2 text-xs"
        />
        <Button
          size="sm"
          disabled={
            readOnly ||
            !canUpdateTasks() ||
            new Date(report.asOf) < new Date(report.coverageStart)
          }
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          {t("reporting:saveSnapshot")}
        </Button>
      </div>
      {query.isError ? (
        <Button size="sm" onClick={() => query.refetch()}>
          {t("reporting:retry")}
        </Button>
      ) : snapshots.length ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span>{t("reporting:compare")}</span>
            {(
              [
                ["before", a, setA],
                ["after", b, setB],
              ] as const
            ).map(([key, value, set]) => (
              <select
                key={key}
                aria-label={t(
                  key === "before"
                    ? "reporting:snapshotBefore"
                    : "reporting:snapshotAfter",
                )}
                value={value}
                onChange={(event) => set(event.target.value)}
                className="max-w-72 rounded border bg-background p-2"
              >
                <option value="">{t("reporting:chooseSnapshot")}</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.name}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <ul className="max-h-48 overflow-auto divide-y text-xs">
            {snapshots.map((snapshot) => (
              <li
                key={snapshot.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="truncate">
                  {snapshot.name} · {formatDateTime(snapshot.createdAt)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onView(snapshot.data, snapshot.name)}
                >
                  {t("reporting:view")}
                </Button>
              </li>
            ))}
          </ul>
          {query.hasNextPage && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => query.fetchNextPage()}
            >
              {t("reporting:more")}
            </Button>
          )}
        </>
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">
          {query.isPending
            ? t("reporting:loading")
            : t("reporting:noSnapshots")}
        </p>
      )}
      {before && after && comparison && (
        <SnapshotComparison before={before.data} after={after.data} />
      )}
      {comparison && (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {(
            [
              ["added", comparison.added],
              ["removed", comparison.removed],
              ["changed", comparison.changed],
            ] as const
          ).map(([key, tasks]) => (
            <div key={key} className="min-w-0">
              <h3 className="mb-2 text-sm font-medium">
                {t(`reporting:${key}`)} · {tasks.length}
              </h3>
              <ReportTaskList
                tasks={tasks}
                workspaceId={workspaceId}
                slug={report.project.slug}
                historical
              />
            </div>
          ))}
        </div>
      )}
    </ReportPanel>
  );
}
