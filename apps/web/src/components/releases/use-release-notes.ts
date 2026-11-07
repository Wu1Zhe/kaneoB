import { client } from "@kaneo/libs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { HttpError } from "@/lib/http-error";
export function useReleaseNotes() {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const key = ["release-notes", userId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    staleTime: 60000,
    refetchOnMount: "always",
    queryFn: async () => {
      const response = await client.releases.$get();
      if (!response.ok) throw await HttpError.fromResponse(response);
      return response.json();
    },
  });
  useEffect(() => {
    if (!userId || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`kaneo-updates:${userId}`);
    channel.onmessage = () => {
      void queryClient.invalidateQueries({
        queryKey: ["release-notes", userId],
      });
    };
    return () => channel.close();
  }, [queryClient, userId]);
  const acknowledge = useMutation({
    mutationFn: async (sequence: number) => {
      const response = await client.releases.read.$post({ json: { sequence } });
      if (!response.ok) throw await HttpError.fromResponse(response);
    },
    onSuccess: (_, sequence) => {
      queryClient.setQueryData(key, (current: typeof query.data) =>
        current
          ? {
              ...current,
              lastReadSequence: Math.max(current.lastReadSequence, sequence),
            }
          : current,
      );
      if (userId && typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel(`kaneo-updates:${userId}`);
        channel.postMessage(sequence);
        channel.close();
      }
    },
  });
  return { query, acknowledge };
}
