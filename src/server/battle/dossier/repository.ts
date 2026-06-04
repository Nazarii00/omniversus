import { getPrisma } from "@/server/db/prisma";

import type { CanonScope, RunBattleAnalysisOptions } from "../domain/schema";
import type {
  DossierSide,
  SubjectLookupRecord,
  VersionDossierRecord,
} from "./recordTypes";
import { clampConfidence, normalizeLookup, slugify } from "./text";

const EVIDENCE_LINK_INCLUDE = {
  include: {
    source: true,
    chunk: {
      include: {
        source: true,
      },
    },
  },
} as const;

const ACTIVE_FACT_WHERE = {
  status: {
    not: "REJECTED",
  },
} as const;

function isGenericVersionHint(value: string | undefined): boolean {
  if (!value) return true;

  const normalized = normalizeLookup(value);

  return (
    !normalized ||
    normalized.includes("strongest canon version") ||
    normalized.includes("selected scope") ||
    normalized === "default"
  );
}

function scoreVersion(
  version: VersionDossierRecord,
  versionHint: string | undefined,
  canonScope: CanonScope | string | undefined,
): number {
  let score = 0;

  if (version.isDefault) score += 20;
  if (version.status === "VERIFIED") score += 6;
  if (version.status === "ACCEPTED") score += 4;

  if (
    canonScope &&
    normalizeLookup(version.canonScope) === normalizeLookup(String(canonScope))
  ) {
    score += 12;
  }

  if (!isGenericVersionHint(versionHint)) {
    const normalizedHint = normalizeLookup(String(versionHint));
    const haystack = normalizeLookup(
      [
        version.slug,
        version.label,
        version.continuity,
        version.era,
        version.form,
        version.state,
        version.summary,
      ]
        .filter(Boolean)
        .join(" "),
    );
    const hintTokens = normalizedHint.split(" ").filter(Boolean);

    if (haystack.includes(normalizedHint)) {
      score += 80;
    } else if (
      hintTokens.length &&
      hintTokens.every((token) => haystack.includes(token))
    ) {
      score += 40;
    }
  }

  score += clampConfidence(version.confidenceScore) / 100;

  return score;
}

function chooseVersion(
  versions: VersionDossierRecord[],
  versionHint: string | undefined,
  canonScope: CanonScope | string | undefined,
): VersionDossierRecord | null {
  if (!versions.length) return null;

  return [...versions].sort(
    (left, right) =>
      scoreVersion(right, versionHint, canonScope) -
      scoreVersion(left, versionHint, canonScope),
  )[0];
}

export async function findSubject(
  fighterName: string,
): Promise<SubjectLookupRecord | null> {
  const prisma = getPrisma();
  if (!prisma) return null;

  const normalizedName = normalizeLookup(fighterName);
  const slug = slugify(fighterName);
  const alias = await prisma.subjectAlias.findFirst({
    where: {
      normalizedValue: normalizedName,
    },
    include: {
      subject: true,
    },
  });

  if (alias?.subject) return alias.subject;

  return prisma.subject.findFirst({
    where: {
      OR: [
        { slug },
        {
          canonicalName: {
            equals: fighterName,
            mode: "insensitive",
          },
        },
        {
          displayName: {
            equals: fighterName,
            mode: "insensitive",
          },
        },
      ],
    },
  });
}

export async function findDossierVersion(
  subjectId: string,
  side: DossierSide,
  options: RunBattleAnalysisOptions,
): Promise<VersionDossierRecord | null> {
  const prisma = getPrisma();
  if (!prisma) return null;

  const versionHint =
    side === "A" ? options.characterAVersion : options.characterBVersion;
  const versions = await prisma.subjectVersion.findMany({
    where: {
      subjectId,
    },
    include: {
      subject: {
        include: {
          aliases: true,
        },
      },
      capabilities: {
        where: ACTIVE_FACT_WHERE,
        include: {
          evidenceLinks: EVIDENCE_LINK_INCLUDE,
        },
        orderBy: [{ confidenceScore: "desc" }, { updatedAt: "desc" }],
      },
      abilities: {
        where: ACTIVE_FACT_WHERE,
        include: {
          evidenceLinks: EVIDENCE_LINK_INCLUDE,
        },
        orderBy: [{ confidenceScore: "desc" }, { updatedAt: "desc" }],
      },
      resistances: {
        where: ACTIVE_FACT_WHERE,
        include: {
          evidenceLinks: EVIDENCE_LINK_INCLUDE,
        },
        orderBy: [{ confidenceScore: "desc" }, { updatedAt: "desc" }],
      },
      equipment: {
        where: ACTIVE_FACT_WHERE,
        include: {
          evidenceLinks: EVIDENCE_LINK_INCLUDE,
        },
        orderBy: [{ updatedAt: "desc" }],
      },
      weaknesses: {
        where: ACTIVE_FACT_WHERE,
        include: {
          evidenceLinks: EVIDENCE_LINK_INCLUDE,
        },
        orderBy: [{ confidenceScore: "desc" }, { updatedAt: "desc" }],
      },
      conditions: {
        where: ACTIVE_FACT_WHERE,
        include: {
          evidenceLinks: EVIDENCE_LINK_INCLUDE,
        },
        orderBy: [{ confidenceScore: "desc" }, { updatedAt: "desc" }],
      },
      feats: {
        where: ACTIVE_FACT_WHERE,
        include: {
          evidenceLinks: EVIDENCE_LINK_INCLUDE,
        },
        orderBy: [{ confidenceScore: "desc" }, { updatedAt: "desc" }],
      },
      scalingFrom: {
        where: ACTIVE_FACT_WHERE,
        include: {
          toVersion: {
            include: {
              subject: true,
            },
          },
          evidenceLinks: EVIDENCE_LINK_INCLUDE,
        },
        orderBy: [{ confidenceScore: "desc" }, { updatedAt: "desc" }],
      },
      scalingTo: {
        where: ACTIVE_FACT_WHERE,
        include: {
          fromVersion: {
            include: {
              subject: true,
            },
          },
          evidenceLinks: EVIDENCE_LINK_INCLUDE,
        },
        orderBy: [{ confidenceScore: "desc" }, { updatedAt: "desc" }],
      },
    },
    orderBy: [
      { isDefault: "desc" },
      { confidenceScore: "desc" },
      { updatedAt: "desc" },
    ],
    take: 12,
  });

  return chooseVersion(versions, versionHint, options.canonScope);
}
