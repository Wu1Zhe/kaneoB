import { ProjectKindContext } from "./project-kind-context";
import { type ReactNode, useEffect, useMemo } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import {
  createRequirementI18n,
  syncRequirementResources,
} from "@/lib/i18n/create-requirement-i18n";

export function ProjectTerminologyProvider({
  kind,
  children,
}: {
  kind?: "project" | "requirement";
  children: ReactNode;
}) {
  const { i18n: source } = useTranslation();
  const scoped = useMemo(
    () => (kind === "requirement" ? createRequirementI18n(source) : source),
    [kind, source],
  );

  useEffect(() => {
    if (scoped === source) return;
    const sync = () => {
      syncRequirementResources(source, scoped);
      void scoped.changeLanguage(source.language);
    };
    source.on("languageChanged loaded", sync);
    source.store.on("added", sync);
    sync();
    return () => {
      source.off("languageChanged loaded", sync);
      source.store.off("added", sync);
    };
  }, [source, scoped]);

  return (
    <ProjectKindContext.Provider value={kind ?? "project"}>
      <I18nextProvider i18n={scoped}>{children}</I18nextProvider>
    </ProjectKindContext.Provider>
  );
}
