import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { isPlainClick } from "./is-plain-click";
import type { ProjectView } from "./project-views";
import { useProjectViewHref } from "./use-project-view-href";

type ProjectScopeLinkProps = {
  view: ProjectView;
  workspaceId: string;
  projectId: string;
  active: boolean;
  onSelect: (view: ProjectView) => void;
  children: ReactNode;
};

export function ProjectScopeLink({
  view,
  workspaceId,
  projectId,
  active,
  onSelect,
  children,
}: ProjectScopeLinkProps) {
  const href = useProjectViewHref(view, workspaceId, projectId);

  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={(event) => {
        if (!isPlainClick(event)) return;
        event.preventDefault();
        onSelect(view);
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/20 bg-background text-primary font-semibold shadow-sm"
          : "border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground",
      )}
    >
      {children}
    </a>
  );
}
