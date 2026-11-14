import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatedLoader } from "../../../components/AnimatedLoader";
import { fetchEvent } from "../../../lib/public-events";
import { TeamScreen } from "./TeamPublic";

/**
 * Route adapter: team tournaments share the generic /events/:slug links, so
 * one shared URL works for every event type. Anything that isn't a team
 * tournament renders the page it always did.
 */
export function TeamEventRoute({ view, children }: { view: "landing" | "register" | "pass" | "live"; children: ReactNode }) {
  const { slug } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["public-event", slug], queryFn: () => fetchEvent(slug!), enabled: Boolean(slug) });
  // Wait for the event type: the original pages act on load (e.g. the pass page redirects when it finds no registration).
  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><AnimatedLoader /></div>;
  if (data?.eventType === "team") return <TeamScreen view={view} />;
  return <>{children}</>;
}
