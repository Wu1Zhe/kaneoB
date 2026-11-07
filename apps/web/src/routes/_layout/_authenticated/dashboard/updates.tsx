import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import { ReleaseHistory } from "@/components/releases/release-history";
export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/updates",
)({ component: UpdatesPage });
function UpdatesPage() {
  const { t } = useTranslation();
  return (
    <WorkspaceLayout title={t("workspace:updates.title")}>
      <PageTitle title={t("workspace:updates.title")} />
      <div className="h-full overflow-y-auto">
        <ReleaseHistory />
      </div>
    </WorkspaceLayout>
  );
}
