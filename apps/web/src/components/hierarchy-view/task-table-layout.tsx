import { useRef, type CSSProperties, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { useStoredState } from "@/hooks/use-stored-state";
import { normalizeColumnWidths, EMPTY_WIDTHS as EMPTY } from "./column-widths";
import { TaskTableContext } from "./task-table-context";
export function TaskTableLayout({
  projectId,
  view,
  children,
  className,
}: {
  projectId: string;
  view: "list" | "hierarchy";
  children: ReactNode;
  className?: string;
}) {
  const { data: session } = authClient.useSession();
  const [widths, setWidths] = useStoredState(
    session?.user.id
      ? `kaneo:columns:${session.user.id}:${projectId}:${view}`
      : null,
    normalizeColumnWidths,
    EMPTY,
  );
  const ref = useRef<HTMLDivElement>(null);
  const resize = (id: string, width: number, commit: boolean) => {
    const next = Math.min(900, Math.max(60, width));
    ref.current?.style.setProperty(`--task-column-${id}`, `${next}px`);
    if (commit) setWidths((previous) => ({ ...previous, [id]: next }));
  };
  const reset = () => {
    for (const key of Object.keys(widths))
      ref.current?.style.removeProperty(`--task-column-${key}`);
    setWidths({});
  };
  const style = Object.fromEntries(
    Object.entries(widths).map(([key, value]) => [
      `--task-column-${key}`,
      `${value}px`,
    ]),
  ) as CSSProperties;
  return (
    <TaskTableContext.Provider value={{ resize, reset, widths }}>
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    </TaskTableContext.Provider>
  );
}
