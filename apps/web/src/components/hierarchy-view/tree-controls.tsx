import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { TaskTableContext } from "./task-table-context";
export function TreeControls({
  onExpand,
  onCollapse,
  disabled,
}: {
  onExpand: () => void;
  onCollapse: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const context = useContext(TaskTableContext);
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1 border-b bg-background px-3 py-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={onExpand}
      >
        {t("tasks:table.expandAll")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={onCollapse}
      >
        {t("tasks:table.collapseAll")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="ml-auto text-muted-foreground"
        onClick={() => context?.reset()}
      >
        {t("tasks:table.resetWidths")}
      </Button>
    </div>
  );
}
