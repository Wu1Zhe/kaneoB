import { sql } from "drizzle-orm";
import { columnTable, projectTable, taskTable } from "../database/schema";

// Completion belongs to the task's workflow, even when its parent is elsewhere.
export const taskIsCompleted = sql<boolean>`(exists (
  select 1 from ${columnTable}
  where ${columnTable.projectId} = ${taskTable.projectId}
    and ${columnTable.slug} = ${taskTable.status}
    and ${columnTable.isFinal} = true
) or (exists (select 1 from ${projectTable} where ${projectTable.id}=${taskTable.projectId} and ${projectTable.kind}='requirement') and nullif(${taskTable.requirementData}->>'prodActualAt','') is not null))`;
