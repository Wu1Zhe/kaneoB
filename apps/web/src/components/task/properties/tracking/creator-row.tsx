import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type Task from "@/types/task";
import { PropertyRow } from "../property-row";

export function TaskCreatorRow({ task }: { task: Task }) {
  const { t } = useTranslation();

  return (
    <PropertyRow label={t("tasks:properties.createdBy")}>
      <div className="flex h-7.5 min-w-0 items-center gap-2 px-2 text-[13px] text-foreground [&_svg]:size-3.5 [&_svg]:shrink-0">
        {task.creatorImage ? (
          <img
            src={task.creatorImage}
            alt=""
            className="size-5 rounded-full object-cover"
          />
        ) : (
          <User className="text-muted-foreground" aria-hidden="true" />
        )}
        <span
          className={cn(
            "truncate",
            !task.creatorName && "text-muted-foreground",
          )}
        >
          {task.creatorName || "—"}
        </span>
      </div>
    </PropertyRow>
  );
}
