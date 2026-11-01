import { createContext, useContext } from "react";
export const ProjectKindContext = createContext<"project" | "requirement">(
  "project",
);
export function useIsRequirement() {
  return useContext(ProjectKindContext) === "requirement";
}
