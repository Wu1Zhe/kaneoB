import { requirementFields } from "./requirement-fields";
import { HTTPException } from "hono/http-exception";

export const REQUIREMENT_COLUMNS = [
  { name: "Backlog", slug: "backlog", position: 0, isFinal: false },
  { name: "Discussing", slug: "discussing", position: 1, isFinal: false },
  { name: "Planned", slug: "requirement-planned", position: 2, isFinal: false },
  { name: "Design", slug: "design", position: 3, isFinal: false },
  { name: "Dev", slug: "dev", position: 4, isFinal: false },
  { name: "Cross Test", slug: "cross-test", position: 5, isFinal: false },
  { name: "UAT", slug: "uat", position: 6, isFinal: false },
  { name: "Pirun", slug: "pirun", position: 7, isFinal: false },
  { name: "Prod", slug: "prod", position: 8, isFinal: false },
  { name: "Closed", slug: "closed", position: 9, isFinal: true },
  { name: "Rejected", slug: "rejected", position: 10, isFinal: true },
] as const;

export function hasRequirementDescription(value?: string | null) {
  return Boolean(
    value
      ?.replace(/<[^>]*>/g, "")
      .replace(/&(?:nbsp|#160);/gi, " ")
      .trim() || /<(?:img|video|audio)\b/i.test(value ?? ""),
  );
}
export function validateRequirementContent(
  title: string,
  description?: string | null,
  type?: string | null,
) {
  if (!title.trim() || !hasRequirementDescription(description) || !type?.trim())
    throw new HTTPException(400, {
      message: "Requirement name, type and description are required",
    });
}

export function normalizeRequirementData(data?: Record<string, string | null>) {
  const result: Record<string, string | null> = {};
  for (const [field, original] of Object.entries(data ?? {})) {
    if (!(requirementFields as readonly string[]).includes(field))
      throw new HTTPException(400, { message: "Unknown requirement field" });
    let value = original?.trim() || null;
    if (
      value &&
      value.length > (["notes", "benefit"].includes(field) ? 10000 : 256)
    )
      throw new HTTPException(400, {
        message: "Requirement field is too long",
      });
    if (value && field.endsWith("At")) {
      const date = new Date(value);
      if (
        !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
        !Number.isFinite(date.getTime()) ||
        (!field.endsWith("ActualAt") &&
          (date.getUTCMinutes() % 30 !== 0 ||
            date.getUTCSeconds() !== 0 ||
            date.getUTCMilliseconds() !== 0))
      )
        throw new HTTPException(400, {
          message: "Invalid requirement time; plans use half-hour intervals",
        });
      value = date.toISOString();
    }
    result[field] = value;
  }
  return result;
}
