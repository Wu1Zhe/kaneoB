import { responseTimestamp, z } from "../openapi";
export function validPortalUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export const portalScope = z.enum(["shared", "personal"]);
export const portalBody = z.object({
  scope: portalScope,
  name: z.string().trim().min(1).max(80),
  url: z
    .string()
    .trim()
    .max(2048)
    .refine(
      validPortalUrl,
      "Use an HTTP or HTTPS address without embedded credentials",
    ),
  description: z.string().trim().max(200).default(""),
  group: z.string().trim().max(60).default(""),
  icon: z
    .enum([
      "Globe",
      "Building2",
      "BookOpen",
      "Code",
      "Mail",
      "Monitor",
      "Folder",
      "ChartColumn",
    ])
    .default("Globe"),
  color: z
    .enum(["blue", "green", "orange", "purple", "slate", "rose"])
    .default("blue"),
});
export const portalSchema = portalBody.omit({ scope: true }).extend({
  icon: z.string(),
  color: z.string(),
  id: z.string(),
  ownerId: z.string().nullable(),
  workspaceId: z.string(),
  position: z.number(),
  version: z.number(),
  createdAt: responseTimestamp,
  updatedAt: responseTimestamp,
});
