import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

type Query = InferRequestType<
  (typeof client)["activity"]["project"][":id"]["changes"]["$get"]
>["query"];

export default async function getProjectChanges(
  projectId: string,
  query: Query,
) {
  const response = await client.activity.project[":id"].changes.$get({
    param: { id: projectId },
    query,
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
