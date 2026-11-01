import { Users } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { InsightProject } from "./insights-data";
import { buildStatusColorMap } from "./insight-colors";
import {
  buildPeopleTable,
  collectInsightTasks,
  getInsightColumns,
} from "./insights-data";
import { PeopleStatusTable } from "./people-status-table";

export function PeopleInsightsPanel({
  project,
  workspaceId,
}: {
  project: InsightProject;
  workspaceId?: string;
}) {
  const { t } = useTranslation();
  const columns = useMemo(() => getInsightColumns(project), [project]);
  const tasks = useMemo(() => collectInsightTasks(project), [project]);
  const colors = useMemo(() => buildStatusColorMap(columns), [columns]);
  const rows = useMemo(
    () => buildPeopleTable(tasks, columns),
    [tasks, columns],
  );

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 px-4 pt-3">
        <Users className="size-4 text-primary" />
        <h2 className="font-medium text-sm">{t("tasks:insights.tabPeople")}</h2>
        <Badge size="sm" variant="secondary" className="tabular-nums">
          {rows.length}
        </Badge>
      </div>
      <div className="px-3 pt-2 pb-3">
        <PeopleStatusTable
          rows={rows}
          columns={columns}
          colors={colors}
          workspaceId={workspaceId}
        />
      </div>
    </Card>
  );
}
