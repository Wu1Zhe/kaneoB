import { client } from "@kaneo/libs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { HttpError } from "@/lib/http-error";
import { toast } from "@/lib/toast";
import type { PortalInput, PortalLink, PortalScope } from "./types";
export function usePortal(workspaceId: string, scope: PortalScope) {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const key = ["portal", workspaceId, session?.user.id, scope];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(workspaceId && session?.user.id),
    refetchInterval: 30000,
    queryFn: async () => {
      const response = await client.portal[":workspaceId"].$get({
        param: { workspaceId },
        query: { scope },
      });
      if (!response.ok) throw await HttpError.fromResponse(response);
      return response.json();
    },
  });
  const done = () =>
    queryClient.invalidateQueries({ queryKey: ["portal", workspaceId] });
  const error = (e: Error) => {
    toast.error(e.message);
    void done();
  };
  const save = useMutation({
    mutationFn: async ({
      input,
      existing,
    }: {
      input: PortalInput;
      existing?: PortalLink;
    }) => {
      const response = existing
        ? await client.portal[":workspaceId"][":id"].$put({
            param: { workspaceId, id: existing.id },
            json: { ...input, version: existing.version },
          })
        : await client.portal[":workspaceId"].$post({
            param: { workspaceId },
            json: input,
          });
      if (!response.ok) throw await HttpError.fromResponse(response);
    },
    onSuccess: done,
    onError: error,
  });
  const remove = useMutation({
    mutationFn: async (link: PortalLink) => {
      const response = await client.portal[":workspaceId"][":id"].$delete({
        param: { workspaceId, id: link.id },
        json: { scope, version: link.version },
      });
      if (!response.ok) throw await HttpError.fromResponse(response);
    },
    onSuccess: done,
    onError: error,
  });
  const reorder = useMutation({
    mutationFn: async (links: PortalLink[]) => {
      const response = await client.portal[":workspaceId"].reorder.$post({
        param: { workspaceId },
        json: {
          scope,
          entries: links.map((link) => ({
            id: link.id,
            version: link.version,
          })),
        },
      });
      if (!response.ok) throw await HttpError.fromResponse(response);
    },
    onSuccess: done,
    onError: error,
  });
  return { query, save, remove, reorder };
}
