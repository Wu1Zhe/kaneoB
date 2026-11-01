import { z } from "../openapi";

export const requirementFields = [
  "reference",
  "type",
  "category",
  "department",
  "contact",
  "benefit",
  "notes",
  "planProvidedAt",
  "designStartPlannedAt",
  "designStartActualAt",
  "designPlannedAt",
  "designActualAt",
  "devPlannedAt",
  "devActualAt",
  "crossTestPlannedAt",
  "crossTestActualAt",
  "uatPlannedAt",
  "uatActualAt",
  "pirunPlannedAt",
  "pirunActualAt",
  "prodPlannedAt",
  "prodActualAt",
] as const;
export const requirementDataSchema = z.record(
  z.string(),
  z.string().nullable(),
);
export const updateRequirementFieldBody = z.object({
  field: z.enum(requirementFields),
  value: z.string().max(10000).nullable(),
});
