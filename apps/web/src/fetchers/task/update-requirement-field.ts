import { client } from "@kaneo/libs";
import type { RequirementField } from "@/components/requirement/requirement-fields";
import { HttpError } from "@/lib/http-error";
export default async function updateRequirementField(
  taskId: string,
  field: RequirementField,
  value: string | null,
) {
  const response = await client.task.requirement[":id"].$put({
    param: { id: taskId },
    json: { field, value },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
