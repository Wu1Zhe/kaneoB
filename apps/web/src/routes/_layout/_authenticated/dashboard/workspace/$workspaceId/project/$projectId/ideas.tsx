import { createFileRoute } from "@tanstack/react-router";
import ProjectLayout from "@/components/common/project-layout";
import { IdeasPage } from "@/components/ideas/ideas-page";
export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/ideas",
)({
  component: IdeasRoute,
  validateSearch: (search: Record<string, unknown>): { ideaId?: string } => ({
    ideaId: typeof search.ideaId === "string" ? search.ideaId : undefined,
  }),
});
function IdeasRoute() {
  const { projectId, workspaceId } = Route.useParams();
  const { ideaId } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="ideas"
    >
      <IdeasPage
        key={projectId}
        projectId={projectId}
        workspaceId={workspaceId}
        selectedId={ideaId}
        onSelect={(id) => {
          void navigate({ search: { ideaId: id }, replace: true });
        }}
      />
    </ProjectLayout>
  );
}
