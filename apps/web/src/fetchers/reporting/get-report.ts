import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";
export type DashboardReport = InferResponseType<
  (typeof client)["reporting"][":id"]["$get"],
  200
>;
export type DashboardTask = DashboardReport["tasks"][number];
export type DashboardSnapshot = InferResponseType<
  (typeof client)["reporting"][":id"]["snapshots"]["$get"],
  200
>[number];
export async function getReport(
  id: string,
  since: string,
  until: string,
  staleDays = 3,
) {
  const response = await client.reporting[":id"].$get({
    param: { id },
    query: { since, until, staleDays: String(staleDays) },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getSnapshots(
  id: string,
  before?: string,
  beforeId?: string,
) {
  const response = await client.reporting[":id"].snapshots.$get({
    param: { id },
    query: { before, beforeId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function saveSnapshot(
  id: string,
  since: string,
  until: string,
  name: string,
  staleDays = 3,
) {
  const response = await client.reporting[":id"].snapshots.$post({
    param: { id },
    json: { since, until, name, staleDays },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
