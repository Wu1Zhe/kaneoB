import { client } from "@kaneo/libs";

import { HttpError } from "@/lib/http-error";

async function nudgeTask(taskId: string) {
  const response = await client.notification.nudge.$post({
    json: { taskId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default nudgeTask;
