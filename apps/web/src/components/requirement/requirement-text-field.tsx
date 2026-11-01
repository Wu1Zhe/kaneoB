import { PropertyRow } from "@/components/task/properties/property-row";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateRequirementField } from "@/hooks/mutations/task/use-update-requirement-field";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";
import type { RequirementField } from "./requirement-fields";

export function RequirementTextField({
  task,
  field,
  multiline = false,
  placeholder,
  compact = false,
}: {
  task: Task;
  field: RequirementField;
  multiline?: boolean;
  placeholder?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  const update = useUpdateRequirementField();
  const { canUpdateTasks } = useWorkspacePermission();
  const value = task.requirementData?.[field] ?? "";
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value, task.id]);
  const label = t(`tasks:requirement.fields.${field}`);
  const required = field === "reference" || field === "type";
  const props = {
    id,
    value: draft,
    placeholder:
      placeholder ?? (compact ? t("tasks:requirement.emptyValue") : "—"),
    disabled: update.isPending,
    readOnly: !canUpdateTasks(),
    required,
    "aria-invalid": required && !draft.trim(),
    maxLength: multiline ? 10000 : 256,
    className: compact
      ? "h-7.5 w-full min-w-0 rounded border-0 bg-transparent px-2 text-[13px] outline-none hover:bg-accent focus:bg-accent focus:ring-1 focus:ring-ring"
      : "w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
    onFocus: () => {
      focused.current = true;
    },
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setDraft(event.target.value),
    onBlur: async () => {
      focused.current = false;
      if (!canUpdateTasks()) return;
      if (required && !draft.trim()) {
        toast.error(t("tasks:requirement.required"));
        return;
      }
      if (draft.trim() === value || !canUpdateTasks()) return;
      try {
        await update.mutateAsync({
          taskId: task.id,
          field,
          value: draft.trim() || null,
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("tasks:requirement.saveError"),
        );
      }
    },
  };
  if (compact)
    return (
      <PropertyRow label={label}>
        <input
          {...props}
          aria-label={label}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </PropertyRow>
    );
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {required && !draft.trim() && (
        <p role="status" className="text-xs text-destructive-foreground">
          {t("tasks:requirement.required")}
        </p>
      )}
      {multiline ? (
        <textarea {...props} rows={3} />
      ) : (
        <input
          {...props}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      )}
    </div>
  );
}
