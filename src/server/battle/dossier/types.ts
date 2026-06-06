import type { CanonScope, DataProvenanceMode } from "../domain/schema";

export type DossierFactCategory =
  | "AP"
  | "PHYSICAL_STRENGTH"
  | "DURABILITY"
  | "SPEED"
  | "RANGE"
  | "STAMINA"
  | "SENSES"
  | "STEALTH"
  | "MOBILITY"
  | "ENDURANCE"
  | "LOGISTICS"
  | "COMMAND_STRUCTURE"
  | "NUMBERS"
  | "TERRITORY_CONTROL"
  | "SKILL"
  | "INTELLIGENCE"
  | "ABILITY"
  | "RESISTANCE"
  | "WEAKNESS"
  | "WIN_CONDITION"
  | "LOSS_CONDITION"
  | "EQUIPMENT"
  | "FEAT"
  | "ANTI_FEAT"
  | "SCALING"
  | "VERSION"
  | "RULE_INTERACTION"
  | "OTHER";

export type DossierFactStatus =
  | "VERIFIED"
  | "ACCEPTED"
  | "REQUIRES_VERIFICATION"
  | "CONTESTED"
  | "MODEL_INFERRED";

export type DossierFactSourceType =
  | "MANUAL_DB"
  | "ACCEPTED_DB"
  | "LOCAL_SEED"
  | "RAG_RETRIEVED"
  | "MODEL_INFERRED";

export type DossierFact = {
  id: string;
  category: DossierFactCategory;
  text: string;
  source_ref: string;
  source_type: DossierFactSourceType;
  status: DossierFactStatus;
  confidence: number;
  notes?: string;
};

export type DossierPortrait = {
  approved_at: string;
  data_url: string;
  source_name: string;
};

export type FighterDossier = {
  fighter_name: string;
  matched_name: string;
  version: string;
  canon_scope: CanonScope | string;
  provenance: DataProvenanceMode;
  portrait: DossierPortrait | null;
  facts: DossierFact[];
  aliases: string[];
  source_note: string;
};

export type DossierResolutionStatus =
  | "FOUND"
  | "PARTIAL"
  | "NOT_FOUND"
  | "DISABLED";

export type FighterDossierResolution = {
  status: DossierResolutionStatus;
  dossier: FighterDossier | null;
  missing_critical_categories: DossierFactCategory[];
  notes: string;
};

export type BattleDossierContext = {
  mode: "DB_STUB" | "DATABASE" | "MIXED";
  source_priority: [
    "MANUAL_DB",
    "ACCEPTED_DB",
    "RAG_RETRIEVED",
    "MODEL_INFERRED",
  ];
  missing_data_policy: "infer_with_review_flags";
  allow_model_fact_suggestions: true;
  A: FighterDossierResolution;
  B: FighterDossierResolution;
};
