import {
  Globe,
  Building2,
  BookOpen,
  Code,
  Mail,
  Monitor,
  Folder,
  ChartColumn,
  GripVertical,
  Pencil,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { PortalLink } from "./types";
const icons = {
  Globe,
  Building2,
  BookOpen,
  Code,
  Mail,
  Monitor,
  Folder,
  ChartColumn,
};
const colors = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  green: "bg-green-500/10 text-green-600 dark:text-green-300",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
};
export function PortalCard({
  link,
  editing,
  disabled,
  sortable,
  onEdit,
  onDelete,
}: {
  link: PortalLink;
  editing: boolean;
  disabled: boolean;
  sortable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id, disabled: !editing || disabled || !sortable });
  const Icon = icons[link.icon as keyof typeof icons] ?? Globe;
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 20 : undefined,
      }}
      className="relative min-w-0 rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex min-h-28 items-start gap-3 rounded-xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${colors[link.color as keyof typeof colors] ?? colors.blue}`}
        >
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 font-medium text-sm">
            <span className="truncate">{link.name}</span>
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
          </span>
          <span
            className="mt-1 block truncate text-xs text-muted-foreground"
            title={link.description || link.url}
          >
            {link.description || new URL(link.url).host}
          </span>
          {link.group && (
            <span className="mt-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {link.group}
            </span>
          )}
        </span>
      </a>
      {editing && (
        <div className="flex items-center justify-end gap-1 border-t bg-muted/30 px-2 py-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={disabled || !sortable}
            aria-label={t("workspace:portal.drag")}
            className="mr-auto cursor-grab touch-none rounded p-1 text-muted-foreground"
          >
            <GripVertical className="size-4" />
          </button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={disabled}
            aria-label={t("workspace:portal.edit")}
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={disabled}
            aria-label={t("workspace:portal.delete")}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
