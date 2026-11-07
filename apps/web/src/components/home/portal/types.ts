export type PortalScope = "shared" | "personal";
export type PortalLink = {
  id: string;
  workspaceId: string;
  ownerId: string | null;
  name: string;
  url: string;
  description: string;
  group: string;
  icon: string;
  color: string;
  position: number;
  version: number;
};
export const PORTAL_ICONS = [
  "Globe",
  "Building2",
  "BookOpen",
  "Code",
  "Mail",
  "Monitor",
  "Folder",
  "ChartColumn",
] as const;
export const PORTAL_COLORS = [
  "blue",
  "green",
  "orange",
  "purple",
  "slate",
  "rose",
] as const;
export type PortalInput = {
  scope: PortalScope;
  name: string;
  url: string;
  description: string;
  group: string;
  icon: (typeof PORTAL_ICONS)[number];
  color: (typeof PORTAL_COLORS)[number];
};
