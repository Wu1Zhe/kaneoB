import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type PersonalInsightTask = InferResponseType<
  (typeof client)["task"]["assigned"]["insights"]["$get"],
  200
>["tasks"][number];

export default async function getPersonalInsightTasks(
  workspaceId: string,
  signal?: AbortSignal,
) {
  const tasks: PersonalInsightTask[] = [];
  const cursors = new Set<string>();
  let after: string | null = null;
  do {
    const response = await client.task.assigned.insights.$get(
      { query: { workspaceId, limit: "100", ...(after ? { after } : {}) } },
      { init: { signal } },
    );
    if (!response.ok) throw await HttpError.fromResponse(response);
    const page = await response.json();
    tasks.push(...page.tasks);
    after = page.nextCursor;
    if (after && cursors.has(after))
      throw new Error("Repeated personal task cursor");
    if (after) cursors.add(after);
  } while (after);
  return tasks;
}
