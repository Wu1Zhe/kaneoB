import { createFileRoute } from "@tanstack/react-router";
import ProjectLayout from "@/components/common/project-layout";
import { DashboardPage } from "@/components/reporting/dashboard-page";
export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/insights",
)({ component: ReportingRoute });
function ReportingRoute() {
  const { projectId, workspaceId } = Route.useParams();
  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="insights"
    >
      <DashboardPage
        key={projectId}
        projectId={projectId}
        workspaceId={workspaceId}
      />
    </ProjectLayout>
  );
}
