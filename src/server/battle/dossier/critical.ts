import {
  BASE_CRITICAL_DOSSIER_CATEGORIES,
  GROUP_CRITICAL_DOSSIER_CATEGORIES,
} from "./constants";
import type { DossierFact, DossierFactCategory } from "./types";

export function criticalCategoriesForSubject(
  kind: string,
): DossierFactCategory[] {
  if (["ARMY", "ORGANIZATION", "TEAM", "SPECIES"].includes(kind)) {
    return [
      ...BASE_CRITICAL_DOSSIER_CATEGORIES,
      ...GROUP_CRITICAL_DOSSIER_CATEGORIES,
    ];
  }

  return BASE_CRITICAL_DOSSIER_CATEGORIES;
}

export function findMissingCriticalCategories(
  facts: DossierFact[],
  subjectKind: string,
): DossierFactCategory[] {
  const present = new Set(facts.map((fact) => fact.category));
  return criticalCategoriesForSubject(subjectKind).filter(
    (category) => !present.has(category),
  );
}
