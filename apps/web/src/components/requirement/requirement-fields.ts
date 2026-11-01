export const requirementStages = [
  {
    id: "design",
    label: "Design",
    planned: "designPlannedAt",
    actual: "designActualAt",
  },
  { id: "dev", label: "Dev", planned: "devPlannedAt", actual: "devActualAt" },
  {
    id: "crossTest",
    label: "Cross Test",
    planned: "crossTestPlannedAt",
    actual: "crossTestActualAt",
  },
  { id: "uat", label: "UAT", planned: "uatPlannedAt", actual: "uatActualAt" },
  {
    id: "pirun",
    label: "Pirun",
    planned: "pirunPlannedAt",
    actual: "pirunActualAt",
  },
  {
    id: "prod",
    label: "Prod",
    planned: "prodPlannedAt",
    actual: "prodActualAt",
  },
] as const;
export type RequirementField =
  | "reference"
  | "type"
  | "category"
  | "department"
  | "contact"
  | "benefit"
  | "notes"
  | "planProvidedAt"
  | "designStartPlannedAt"
  | "designStartActualAt"
  | (typeof requirementStages)[number]["planned" | "actual"];
export type RequirementStage = (typeof requirementStages)[number];

export function stageTiming(
  planned?: string | null,
  actual?: string | null,
  now = Date.now(),
) {
  if (!planned) return actual ? "completed" : "unplanned";
  if (actual)
    return new Date(actual).getTime() > new Date(planned).getTime()
      ? "late"
      : "onTime";
  return new Date(planned).getTime() < now ? "overdue" : "pending";
}
