import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  convertIdea,
  getIdea,
  getIdeas,
  saveIdea,
  type ConvertIdeaInput,
  type IdeaInput,
  type IdeaState,
} from "@/fetchers/ideas";
import { invalidateMyWork } from "@/lib/invalidate-my-work";
export function useIdeas(
  projectId: string,
  filters: { search: string; status?: IdeaState; tag?: string; page: number },
) {
  return useQuery({
    queryKey: ["project-ideas", projectId, filters],
    queryFn: () => getIdeas(projectId, filters),
    refetchInterval: 30000,
    refetchOnWindowFocus: "always",
  });
}
export function useIdea(projectId: string, ideaId?: string) {
  return useQuery({
    queryKey: ["project-idea", projectId, ideaId],
    queryFn: () => getIdea(projectId, ideaId!),
    enabled: Boolean(ideaId),
    refetchOnMount: "always",
  });
}
export function useSaveIdea(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      previous,
    }: {
      input: IdeaInput;
      previous?: { id: string; version: number };
    }) => saveIdea(projectId, input, previous),
    onSuccess: (idea) => {
      queryClient.setQueryData(["project-idea", projectId, idea.id], idea);
      void queryClient.invalidateQueries({
        queryKey: ["project-ideas", projectId],
      });
    },
  });
}
export function useConvertIdea(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ideaId,
      input,
    }: {
      ideaId: string;
      input: ConvertIdeaInput;
    }) => convertIdea(projectId, ideaId, input),
    onSuccess: () => {
      for (const key of [
        ["project-ideas", projectId],
        ["project-idea", projectId],
        ["tasks", projectId],
        ["project-changes", projectId],
      ])
        void queryClient.invalidateQueries({ queryKey: key });
      invalidateMyWork(queryClient);
    },
  });
}
