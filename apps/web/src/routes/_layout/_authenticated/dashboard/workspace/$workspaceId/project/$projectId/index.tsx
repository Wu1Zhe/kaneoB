import { createFileRoute, redirect } from "@tanstack/react-router";
import { PROJECT_ROUTE_PATHS } from "@/components/project/views/project-views";
import { useUserPreferencesStore } from "@/store/user-preferences";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/",
)({
  beforeLoad: () => {
    const { taskLayout } = useUserPreferencesStore.getState();
    throw redirect({
      to: PROJECT_ROUTE_PATHS[taskLayout === "list" ? "board" : taskLayout],
      replace: true,
    });
  },
});
