import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export type TaskTrackingUpdate = {
  progress?: number;
  weight?: number;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
};

async function updateTaskTracking(taskId: string, update: TaskTrackingUpdate) {
  const response = await client.task.tracking[":id"].$put({
    param: { id: taskId },
    json: update,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default updateTaskTracking;
