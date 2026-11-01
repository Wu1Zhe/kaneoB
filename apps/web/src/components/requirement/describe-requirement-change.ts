import { formatDateTime } from "@/lib/format";
import { requirementStages } from "./requirement-fields";
export function describeRequirementChange(
  data: Record<string, unknown>,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const field = String(data.field ?? "");
  const stage = requirementStages.find(
    (item) => item.planned === field || item.actual === field,
  );
  const label = stage
    ? `${stage.label} ${t(field.endsWith("ActualAt") ? "tasks:requirement.actual" : "tasks:requirement.planned")}`
    : t(`tasks:requirement.fields.${field}`);
  const display = (value: unknown) =>
    !value
      ? t("tasks:requirement.unset")
      : field.endsWith("At")
        ? formatDateTime(String(value))
        : String(value);
  return t("tasks:requirement.fieldChanged", {
    field: label,
    from: display(data.oldValue),
    to: display(data.newValue),
  });
}
