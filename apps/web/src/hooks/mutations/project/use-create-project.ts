import { useMutation } from "@tanstack/react-query";
import createProject from "@/fetchers/project/create-project";

function useCreateProject({
  name,
  slug,
  workspaceId,
  icon,
  kind,
}: {
  name: string;
  slug: string;
  workspaceId: string;
  icon: string;
  kind?: "project" | "requirement";
}) {
  return useMutation({
    mutationFn: () => createProject({ name, slug, workspaceId, icon, kind }),
  });
}

export default useCreateProject;
