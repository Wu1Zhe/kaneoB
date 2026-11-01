import { createInstance, type i18n } from "i18next";
import { requirementCopy } from "./requirement-copy";

export function syncRequirementResources(source: i18n, target: i18n) {
  for (const [language, namespaces] of Object.entries(source.store.data)) {
    for (const [namespace, bundle] of Object.entries(namespaces)) {
      target.addResourceBundle(
        language,
        namespace,
        requirementCopy(bundle),
        true,
        true,
      );
    }
  }
}

export function createRequirementI18n(source: i18n) {
  // A clone also initializes React's plugin and changes its global default
  // instance. Keep this provider's dictionary independent of that registry.
  const scoped = createInstance();
  void scoped.init({
    ...source.options,
    initAsync: false,
    lng: source.language,
    resources: requirementCopy(source.store.data),
  });
  return scoped;
}
