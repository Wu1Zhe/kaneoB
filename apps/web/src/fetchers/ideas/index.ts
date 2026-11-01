import { client } from "@kaneo/libs";
import type { InferRequestType, InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";
const api = client.ideas[":projectId"];
export type Idea = InferResponseType<(typeof api)[":ideaId"]["$get"], 200>;
export type IdeaList = InferResponseType<(typeof api)["$get"], 200>;
export type IdeaPreview = IdeaList["items"][number];
export type IdeaInput = InferRequestType<(typeof api)["$post"]>["json"];
export type IdeaState = Idea["status"];
export type ConvertIdeaInput = InferRequestType<
  (typeof api)[":ideaId"]["convert"]["$post"]
>["json"];
export async function getIdeas(
  projectId: string,
  filters: { search: string; status?: IdeaState; tag?: string; page: number },
) {
  const response = await api.$get({
    param: { projectId },
    query: { ...filters, page: String(filters.page) },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getIdea(projectId: string, ideaId: string) {
  const response = await api[":ideaId"].$get({ param: { projectId, ideaId } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function saveIdea(
  projectId: string,
  input: IdeaInput,
  previous?: { id: string; version: number },
) {
  const response = previous
    ? await api[":ideaId"].$put({
        param: { projectId, ideaId: previous.id },
        json: { ...input, version: previous.version },
      })
    : await api.$post({ param: { projectId }, json: input });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function convertIdea(
  projectId: string,
  ideaId: string,
  input: ConvertIdeaInput,
) {
  const response = await api[":ideaId"].convert.$post({
    param: { projectId, ideaId },
    json: input,
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
