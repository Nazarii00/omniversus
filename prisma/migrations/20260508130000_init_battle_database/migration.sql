-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- EnableExtensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "SubjectKind" AS ENUM ('FICTIONAL_CHARACTER', 'REAL_PERSON', 'ANIMAL', 'SPECIES', 'ARMY', 'ORGANIZATION', 'TEAM', 'VEHICLE', 'WEAPON', 'OBJECT', 'NATURAL_FORCE', 'LOCATION', 'ABSTRACT_ENTITY', 'CUSTOM_ENTITY', 'OTHER');

-- CreateEnum
CREATE TYPE "OriginMedium" AS ENUM ('COMIC', 'MANGA', 'ANIME', 'MOVIE', 'TV', 'GAME', 'NOVEL', 'LIGHT_NOVEL', 'WEB', 'MYTHOLOGY', 'HISTORY', 'REAL_WORLD', 'CUSTOM', 'MIXED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CanonScope" AS ENUM ('PRIMARY_CANON', 'COMPOSITE', 'MANGA', 'ANIME', 'COMIC_MAINLINE', 'GAME_CANON', 'MOVIE', 'TV', 'NOVEL', 'LIGHT_NOVEL', 'REAL_WORLD', 'MYTHIC', 'CUSTOM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('VERIFIED', 'ACCEPTED', 'REQUIRES_REVIEW', 'CONTESTED', 'REJECTED', 'MODEL_INFERRED');

-- CreateEnum
CREATE TYPE "ProvenanceKind" AS ENUM ('MANUAL_DB', 'IMPORTED_SOURCE', 'RAG_RETRIEVED', 'MODEL_INFERRED', 'MIXED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConfidenceBand" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CapabilityCategory" AS ENUM ('ATTACK_POTENCY', 'PHYSICAL_STRENGTH', 'SPEED', 'DURABILITY', 'STAMINA', 'RANGE', 'INTELLIGENCE', 'SKILL', 'SENSES', 'STEALTH', 'MOBILITY', 'ENDURANCE', 'LOGISTICS', 'COMMAND_STRUCTURE', 'NUMBERS', 'TERRITORY_CONTROL', 'OTHER');

-- CreateEnum
CREATE TYPE "AbilityType" AS ENUM ('DAMAGE', 'DEFENSE', 'HEALING', 'REGENERATION', 'IMMORTALITY', 'MIND', 'SOUL', 'TIME', 'SPACE', 'SEALING', 'BFR', 'CONCEPTUAL', 'CAUSALITY', 'DOMAIN', 'PASSIVE', 'SUMMONING', 'TRANSFORMATION', 'UTILITY', 'ENVIRONMENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('WEAPON', 'ARMOR', 'VEHICLE', 'TOOL', 'ARTIFACT', 'RESOURCE', 'INFRASTRUCTURE', 'STANDARD_LOADOUT', 'OPTIONAL_LOADOUT', 'OTHER');

-- CreateEnum
CREATE TYPE "ConditionKind" AS ENUM ('WIN', 'LOSS');

-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('STAT_CHECK', 'DAMAGE', 'KO', 'DEATH', 'INCAP', 'BFR', 'SEALING', 'STAMINA', 'ATTRITION', 'HAX', 'SKILL', 'ENVIRONMENT', 'OBJECTIVE', 'SUBJECTIVE_EDGE', 'OTHER');

-- CreateEnum
CREATE TYPE "FeatKind" AS ENUM ('FEAT', 'ANTI_FEAT', 'STATEMENT', 'CALC', 'SCALING');

-- CreateEnum
CREATE TYPE "ScalingRelation" AS ENUM ('SCALES_TO', 'SCALES_ABOVE', 'SCALES_BELOW', 'PARTIALLY_SCALES_TO', 'DOES_NOT_SCALE', 'CONTESTED_SCALE');

-- CreateEnum
CREATE TYPE "EvidenceSourceType" AS ENUM ('CANON', 'OFFICIAL_PROFILE', 'OFFICIAL_STATEMENT', 'VSBW', 'FANDOM', 'WIKI', 'CALC', 'INTERVIEW', 'MANUAL_NOTE', 'IMPORTED_PAGE', 'RAG_DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceReliability" AS ENUM ('PRIMARY', 'SECONDARY', 'COMMUNITY', 'EXTRACTED_PAGE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EnvironmentKind" AS ENUM ('ARENA', 'CITY', 'BUILDING', 'FOREST', 'OCEAN', 'DESERT', 'MOUNTAIN', 'PLANET', 'SPACE', 'DIMENSION', 'REAL_LOCATION', 'DIGITAL_SPACE', 'CUSTOM', 'OTHER');

-- CreateEnum
CREATE TYPE "ModifierCategory" AS ENUM ('MENTAL_STATE', 'STAT_CHANGE', 'RULE_CHANGE', 'EQUIPMENT_CHANGE', 'ENVIRONMENTAL', 'TEAM_STRUCTURE', 'WIN_CONDITION', 'KNOWLEDGE', 'PREP_TIME', 'SCALE', 'OTHER');

-- CreateEnum
CREATE TYPE "BattleSide" AS ENUM ('A', 'B', 'BOTH', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BattleRunStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "kind" "SubjectKind" NOT NULL,
    "originMedium" "OriginMedium" NOT NULL,
    "originName" TEXT,
    "summary" TEXT,
    "metadata" JSONB,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_aliases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subjectId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "locale" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subjectId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "canonScope" "CanonScope" NOT NULL,
    "continuity" TEXT,
    "era" TEXT,
    "form" TEXT,
    "state" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "confidenceBand" "ConfidenceBand" NOT NULL DEFAULT 'MEDIUM',
    "confidenceScore" INTEGER NOT NULL DEFAULT 50,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "provenance" "ProvenanceKind" NOT NULL DEFAULT 'UNKNOWN',
    "metadata" JSONB,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subject_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_compositions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parentVersionId" UUID NOT NULL,
    "childVersionId" UUID,
    "label" TEXT NOT NULL,
    "countText" TEXT,
    "role" TEXT,
    "notes" TEXT,
    "metadata" JSONB,

    CONSTRAINT "subject_compositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_assertions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versionId" UUID NOT NULL,
    "category" "CapabilityCategory" NOT NULL,
    "subtype" TEXT,
    "valueText" TEXT NOT NULL,
    "normalizedTier" TEXT,
    "normalizedValue" DECIMAL(24,8),
    "unit" TEXT,
    "context" TEXT,
    "limitations" TEXT,
    "confidenceBand" "ConfidenceBand" NOT NULL DEFAULT 'MEDIUM',
    "confidenceScore" INTEGER NOT NULL DEFAULT 50,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "provenance" "ProvenanceKind" NOT NULL DEFAULT 'UNKNOWN',
    "contested" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "capability_assertions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abilities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AbilityType" NOT NULL,
    "description" TEXT NOT NULL,
    "activation" TEXT,
    "delivery" TEXT,
    "rangeText" TEXT,
    "timing" TEXT,
    "targetRequirement" TEXT,
    "effect" TEXT,
    "limitations" TEXT,
    "counterplay" TEXT,
    "isPassive" BOOLEAN NOT NULL DEFAULT false,
    "confidenceBand" "ConfidenceBand" NOT NULL DEFAULT 'MEDIUM',
    "confidenceScore" INTEGER NOT NULL DEFAULT 50,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "provenance" "ProvenanceKind" NOT NULL DEFAULT 'UNKNOWN',
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "abilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resistances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versionId" UUID NOT NULL,
    "type" "AbilityType" NOT NULL,
    "name" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "limits" TEXT,
    "confidenceBand" "ConfidenceBand" NOT NULL DEFAULT 'MEDIUM',
    "confidenceScore" INTEGER NOT NULL DEFAULT 50,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "provenance" "ProvenanceKind" NOT NULL DEFAULT 'UNKNOWN',
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "resistances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "standard" BOOLEAN NOT NULL DEFAULT true,
    "availabilityPolicy" TEXT,
    "limitations" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "provenance" "ProvenanceKind" NOT NULL DEFAULT 'UNKNOWN',
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "equipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weaknesses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "exploitation" TEXT,
    "severity" "ConfidenceBand" NOT NULL DEFAULT 'MEDIUM',
    "confidenceBand" "ConfidenceBand" NOT NULL DEFAULT 'MEDIUM',
    "confidenceScore" INTEGER NOT NULL DEFAULT 50,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "provenance" "ProvenanceKind" NOT NULL DEFAULT 'UNKNOWN',
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "weaknesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "win_loss_conditions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versionId" UUID NOT NULL,
    "kind" "ConditionKind" NOT NULL,
    "type" "ConditionType" NOT NULL,
    "method" TEXT NOT NULL,
    "requires" TEXT,
    "blockedBy" TEXT,
    "probabilityText" TEXT,
    "confidenceBand" "ConfidenceBand" NOT NULL DEFAULT 'MEDIUM',
    "confidenceScore" INTEGER NOT NULL DEFAULT 50,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "provenance" "ProvenanceKind" NOT NULL DEFAULT 'UNKNOWN',
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "win_loss_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feat_assertions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versionId" UUID NOT NULL,
    "kind" "FeatKind" NOT NULL,
    "category" "CapabilityCategory",
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scaleText" TEXT,
    "context" TEXT,
    "limitations" TEXT,
    "confidenceBand" "ConfidenceBand" NOT NULL DEFAULT 'MEDIUM',
    "confidenceScore" INTEGER NOT NULL DEFAULT 50,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "provenance" "ProvenanceKind" NOT NULL DEFAULT 'UNKNOWN',
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feat_assertions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scaling_edges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fromVersionId" UUID NOT NULL,
    "toVersionId" UUID NOT NULL,
    "relation" "ScalingRelation" NOT NULL,
    "category" "CapabilityCategory",
    "rationale" TEXT NOT NULL,
    "limitations" TEXT,
    "confidenceBand" "ConfidenceBand" NOT NULL DEFAULT 'MEDIUM',
    "confidenceScore" INTEGER NOT NULL DEFAULT 50,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "provenance" "ProvenanceKind" NOT NULL DEFAULT 'UNKNOWN',
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scaling_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "EvidenceSourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "citation" TEXT,
    "language" TEXT,
    "reliability" "SourceReliability" NOT NULL DEFAULT 'UNKNOWN',
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "evidence_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sourceId" UUID NOT NULL,
    "externalId" TEXT,
    "text" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "metadata" JSONB,
    "embedding" vector,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sourceId" UUID,
    "chunkId" UUID,
    "capabilityId" UUID,
    "abilityId" UUID,
    "resistanceId" UUID,
    "equipmentId" UUID,
    "weaknessId" UUID,
    "conditionId" UUID,
    "featId" UUID,
    "scalingEdgeId" UUID,
    "suggestionId" UUID,
    "quote" TEXT,
    "note" TEXT,
    "relevanceScore" INTEGER NOT NULL DEFAULT 50,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versionId" UUID NOT NULL,
    "formatVersion" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sourcePriority" TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6),

    CONSTRAINT "dossier_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_suggestions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versionId" UUID,
    "subjectName" TEXT NOT NULL,
    "targetKind" TEXT NOT NULL,
    "category" TEXT,
    "fieldPath" TEXT,
    "proposedText" TEXT NOT NULL,
    "sourceRef" TEXT,
    "confidenceBand" "ConfidenceBand" NOT NULL DEFAULT 'MEDIUM',
    "confidenceScore" INTEGER NOT NULL DEFAULT 50,
    "reason" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "provenance" "ProvenanceKind" NOT NULL DEFAULT 'MODEL_INFERRED',
    "modelName" TEXT,
    "battleRunId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fact_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_environments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "EnvironmentKind" NOT NULL,
    "scaleText" TEXT,
    "description" TEXT NOT NULL,
    "hazards" TEXT,
    "terrain" TEXT,
    "resources" TEXT,
    "physicsPolicy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "battle_environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_rulesets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assumptionSet" TEXT NOT NULL DEFAULT 'VSBW_SBA',
    "speedEqualized" BOOLEAN NOT NULL DEFAULT false,
    "prepTime" TEXT,
    "priorKnowledge" TEXT,
    "startingDistance" TEXT,
    "winConditionPolicy" TEXT,
    "equipmentPolicy" TEXT,
    "verseEqualization" TEXT,
    "retreatAllowed" BOOLEAN NOT NULL DEFAULT false,
    "collateralConcern" BOOLEAN NOT NULL DEFAULT false,
    "customRules" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "battle_rulesets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifiers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ModifierCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "defaultValue" TEXT,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_scenarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "environmentId" UUID,
    "rulesetId" UUID,
    "summary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "battle_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenarioId" UUID NOT NULL,
    "subjectVersionId" UUID,
    "side" "BattleSide" NOT NULL,
    "label" TEXT NOT NULL,
    "team" TEXT,
    "countText" TEXT,
    "startingState" TEXT,
    "role" TEXT,
    "metadata" JSONB,

    CONSTRAINT "scenario_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_modifiers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenarioId" UUID NOT NULL,
    "modifierId" UUID NOT NULL,
    "targetSide" "BattleSide",
    "targetParticipantId" UUID,
    "value" TEXT,
    "notes" TEXT,
    "metadata" JSONB,

    CONSTRAINT "scenario_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenarioId" UUID,
    "fighterAName" TEXT NOT NULL,
    "fighterBName" TEXT NOT NULL,
    "status" "BattleRunStatus" NOT NULL DEFAULT 'PENDING',
    "requestedModel" TEXT,
    "resolvedModel" TEXT,
    "requestPayload" JSONB,
    "dossierPayload" JSONB,
    "resultPayload" JSONB,
    "errorMessage" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),

    CONSTRAINT "battle_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subjects_slug_key" ON "subjects"("slug");

-- CreateIndex
CREATE INDEX "subjects_kind_idx" ON "subjects"("kind");

-- CreateIndex
CREATE INDEX "subjects_originMedium_idx" ON "subjects"("originMedium");

-- CreateIndex
CREATE INDEX "subject_aliases_normalizedValue_idx" ON "subject_aliases"("normalizedValue");

-- CreateIndex
CREATE UNIQUE INDEX "subject_aliases_subjectId_normalizedValue_key" ON "subject_aliases"("subjectId", "normalizedValue");

-- CreateIndex
CREATE INDEX "subject_versions_canonScope_idx" ON "subject_versions"("canonScope");

-- CreateIndex
CREATE INDEX "subject_versions_status_idx" ON "subject_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subject_versions_subjectId_slug_key" ON "subject_versions"("subjectId", "slug");

-- CreateIndex
CREATE INDEX "subject_compositions_parentVersionId_idx" ON "subject_compositions"("parentVersionId");

-- CreateIndex
CREATE INDEX "subject_compositions_childVersionId_idx" ON "subject_compositions"("childVersionId");

-- CreateIndex
CREATE INDEX "capability_assertions_versionId_category_idx" ON "capability_assertions"("versionId", "category");

-- CreateIndex
CREATE INDEX "capability_assertions_category_status_idx" ON "capability_assertions"("category", "status");

-- CreateIndex
CREATE INDEX "abilities_versionId_type_idx" ON "abilities"("versionId", "type");

-- CreateIndex
CREATE INDEX "abilities_name_idx" ON "abilities"("name");

-- CreateIndex
CREATE INDEX "resistances_versionId_type_idx" ON "resistances"("versionId", "type");

-- CreateIndex
CREATE INDEX "equipment_items_versionId_standard_idx" ON "equipment_items"("versionId", "standard");

-- CreateIndex
CREATE INDEX "weaknesses_versionId_idx" ON "weaknesses"("versionId");

-- CreateIndex
CREATE INDEX "win_loss_conditions_versionId_kind_idx" ON "win_loss_conditions"("versionId", "kind");

-- CreateIndex
CREATE INDEX "win_loss_conditions_type_idx" ON "win_loss_conditions"("type");

-- CreateIndex
CREATE INDEX "feat_assertions_versionId_kind_idx" ON "feat_assertions"("versionId", "kind");

-- CreateIndex
CREATE INDEX "feat_assertions_category_idx" ON "feat_assertions"("category");

-- CreateIndex
CREATE INDEX "scaling_edges_fromVersionId_idx" ON "scaling_edges"("fromVersionId");

-- CreateIndex
CREATE INDEX "scaling_edges_toVersionId_idx" ON "scaling_edges"("toVersionId");

-- CreateIndex
CREATE INDEX "scaling_edges_relation_idx" ON "scaling_edges"("relation");

-- CreateIndex
CREATE INDEX "evidence_sources_type_idx" ON "evidence_sources"("type");

-- CreateIndex
CREATE INDEX "evidence_sources_reliability_idx" ON "evidence_sources"("reliability");

-- CreateIndex
CREATE INDEX "evidence_chunks_sourceId_idx" ON "evidence_chunks"("sourceId");

-- CreateIndex
CREATE INDEX "evidence_links_sourceId_idx" ON "evidence_links"("sourceId");

-- CreateIndex
CREATE INDEX "evidence_links_chunkId_idx" ON "evidence_links"("chunkId");

-- CreateIndex
CREATE INDEX "evidence_links_capabilityId_idx" ON "evidence_links"("capabilityId");

-- CreateIndex
CREATE INDEX "evidence_links_abilityId_idx" ON "evidence_links"("abilityId");

-- CreateIndex
CREATE INDEX "evidence_links_resistanceId_idx" ON "evidence_links"("resistanceId");

-- CreateIndex
CREATE INDEX "evidence_links_equipmentId_idx" ON "evidence_links"("equipmentId");

-- CreateIndex
CREATE INDEX "evidence_links_weaknessId_idx" ON "evidence_links"("weaknessId");

-- CreateIndex
CREATE INDEX "evidence_links_conditionId_idx" ON "evidence_links"("conditionId");

-- CreateIndex
CREATE INDEX "evidence_links_featId_idx" ON "evidence_links"("featId");

-- CreateIndex
CREATE INDEX "evidence_links_scalingEdgeId_idx" ON "evidence_links"("scalingEdgeId");

-- CreateIndex
CREATE INDEX "evidence_links_suggestionId_idx" ON "evidence_links"("suggestionId");

-- CreateIndex
CREATE INDEX "dossier_snapshots_versionId_createdAt_idx" ON "dossier_snapshots"("versionId", "createdAt");

-- CreateIndex
CREATE INDEX "fact_suggestions_versionId_idx" ON "fact_suggestions"("versionId");

-- CreateIndex
CREATE INDEX "fact_suggestions_status_idx" ON "fact_suggestions"("status");

-- CreateIndex
CREATE INDEX "fact_suggestions_subjectName_idx" ON "fact_suggestions"("subjectName");

-- CreateIndex
CREATE UNIQUE INDEX "battle_environments_slug_key" ON "battle_environments"("slug");

-- CreateIndex
CREATE INDEX "battle_environments_kind_idx" ON "battle_environments"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "battle_rulesets_slug_key" ON "battle_rulesets"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "modifiers_key_key" ON "modifiers"("key");

-- CreateIndex
CREATE INDEX "modifiers_category_idx" ON "modifiers"("category");

-- CreateIndex
CREATE UNIQUE INDEX "battle_scenarios_slug_key" ON "battle_scenarios"("slug");

-- CreateIndex
CREATE INDEX "battle_scenarios_environmentId_idx" ON "battle_scenarios"("environmentId");

-- CreateIndex
CREATE INDEX "battle_scenarios_rulesetId_idx" ON "battle_scenarios"("rulesetId");

-- CreateIndex
CREATE INDEX "scenario_participants_scenarioId_idx" ON "scenario_participants"("scenarioId");

-- CreateIndex
CREATE INDEX "scenario_participants_subjectVersionId_idx" ON "scenario_participants"("subjectVersionId");

-- CreateIndex
CREATE INDEX "scenario_participants_side_idx" ON "scenario_participants"("side");

-- CreateIndex
CREATE INDEX "scenario_modifiers_scenarioId_idx" ON "scenario_modifiers"("scenarioId");

-- CreateIndex
CREATE INDEX "scenario_modifiers_modifierId_idx" ON "scenario_modifiers"("modifierId");

-- CreateIndex
CREATE INDEX "scenario_modifiers_targetParticipantId_idx" ON "scenario_modifiers"("targetParticipantId");

-- CreateIndex
CREATE INDEX "battle_runs_scenarioId_idx" ON "battle_runs"("scenarioId");

-- CreateIndex
CREATE INDEX "battle_runs_status_idx" ON "battle_runs"("status");

-- CreateIndex
CREATE INDEX "battle_runs_createdAt_idx" ON "battle_runs"("createdAt");

-- AddForeignKey
ALTER TABLE "subject_aliases" ADD CONSTRAINT "subject_aliases_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_versions" ADD CONSTRAINT "subject_versions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_compositions" ADD CONSTRAINT "subject_compositions_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "subject_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_compositions" ADD CONSTRAINT "subject_compositions_childVersionId_fkey" FOREIGN KEY ("childVersionId") REFERENCES "subject_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_assertions" ADD CONSTRAINT "capability_assertions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "subject_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abilities" ADD CONSTRAINT "abilities_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "subject_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resistances" ADD CONSTRAINT "resistances_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "subject_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_items" ADD CONSTRAINT "equipment_items_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "subject_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weaknesses" ADD CONSTRAINT "weaknesses_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "subject_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "win_loss_conditions" ADD CONSTRAINT "win_loss_conditions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "subject_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feat_assertions" ADD CONSTRAINT "feat_assertions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "subject_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaling_edges" ADD CONSTRAINT "scaling_edges_fromVersionId_fkey" FOREIGN KEY ("fromVersionId") REFERENCES "subject_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaling_edges" ADD CONSTRAINT "scaling_edges_toVersionId_fkey" FOREIGN KEY ("toVersionId") REFERENCES "subject_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_chunks" ADD CONSTRAINT "evidence_chunks_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "evidence_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "evidence_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "evidence_chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capability_assertions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "abilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_resistanceId_fkey" FOREIGN KEY ("resistanceId") REFERENCES "resistances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_weaknessId_fkey" FOREIGN KEY ("weaknessId") REFERENCES "weaknesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "win_loss_conditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_featId_fkey" FOREIGN KEY ("featId") REFERENCES "feat_assertions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_scalingEdgeId_fkey" FOREIGN KEY ("scalingEdgeId") REFERENCES "scaling_edges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "fact_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_snapshots" ADD CONSTRAINT "dossier_snapshots_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "subject_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_suggestions" ADD CONSTRAINT "fact_suggestions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "subject_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_suggestions" ADD CONSTRAINT "fact_suggestions_battleRunId_fkey" FOREIGN KEY ("battleRunId") REFERENCES "battle_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_scenarios" ADD CONSTRAINT "battle_scenarios_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "battle_environments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_scenarios" ADD CONSTRAINT "battle_scenarios_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "battle_rulesets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_participants" ADD CONSTRAINT "scenario_participants_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "battle_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_participants" ADD CONSTRAINT "scenario_participants_subjectVersionId_fkey" FOREIGN KEY ("subjectVersionId") REFERENCES "subject_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_modifiers" ADD CONSTRAINT "scenario_modifiers_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "battle_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_modifiers" ADD CONSTRAINT "scenario_modifiers_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "modifiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_modifiers" ADD CONSTRAINT "scenario_modifiers_targetParticipantId_fkey" FOREIGN KEY ("targetParticipantId") REFERENCES "scenario_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_runs" ADD CONSTRAINT "battle_runs_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "battle_scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
