import { MAX_DOSSIER_FACTS } from "./constants";
import {
  dedupeFacts,
  factsFromVersion,
  mapVersionProvenance,
} from "./factMappers";
import type { VersionDossierRecord } from "./recordTypes";
import type { DossierPortrait, FighterDossier } from "./types";

export function buildFighterDossier(
  fighterName: string,
  version: VersionDossierRecord,
): FighterDossier {
  const facts = dedupeFacts(factsFromVersion(version)).slice(
    0,
    MAX_DOSSIER_FACTS,
  );
  const aliases = version.subject.aliases.map((alias) => alias.value);

  return {
    fighter_name: fighterName,
    matched_name: version.subject.displayName,
    version: version.label,
    canon_scope: version.canonScope,
    provenance: mapVersionProvenance(version.provenance),
    portrait: portraitFromMetadata(version.metadata),
    facts,
    aliases,
    source_note: facts.length
      ? "Curated database dossier facts were supplied before model inference."
      : "Only subject/version metadata was found; battle facts still require inference.",
  };
}

function portraitFromMetadata(metadata: unknown): DossierPortrait | null {
  const root = asRecord(metadata);
  const portrait = asRecord(root.portrait);
  const dataUrl = readString(portrait.dataUrl);

  if (!dataUrl) return null;

  return {
    approved_at: readString(portrait.approvedAt) ?? "",
    data_url: dataUrl,
    source_name: readString(portrait.sourceName) ?? "",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
