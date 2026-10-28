import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicTeamEvent } from "../../../api/adapters/team";
import { useEventLive } from "../../../lib/auction-live";

export const passKey = (slug: string) => `playpass-team-pass-${slug}`;

/** Loads a team tournament for the player pages and refetches when the server signals a change (Socket.IO — no polling). */
export function usePublicTeamEvent(slug: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["public-team-event", slug],
    queryFn: async () => (await getPublicTeamEvent(slug!)).data.event,
    enabled: Boolean(slug),
    retry: false,
  });
  useEventLive(slug ?? null, () => queryClient.invalidateQueries({ queryKey: ["public-team-event", slug] }));
  return query;
}
