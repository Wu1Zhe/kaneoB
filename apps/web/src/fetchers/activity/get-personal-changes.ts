import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

type Query = InferRequestType<
  (typeof client)["activity"]["workspace"][":workspaceId"]["my-changes"]["$get"]
>["query"];

export default async function getPersonalChanges(
  workspaceId: string,
  query: Query,
) {
  const response = await client.activity.workspace[":workspaceId"][
    "my-changes"
  ].$get({ param: { workspaceId }, query });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
