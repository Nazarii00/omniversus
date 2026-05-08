-- Add database-level integrity that Prisma schema cannot express directly.
-- These pre-checks fail the migration before adding constraints if existing data
-- already violates the intended invariant.

DO $$
DECLARE
  duplicate_default_subjects integer;
BEGIN
  SELECT count(*)
  INTO duplicate_default_subjects
  FROM (
    SELECT "subjectId"
    FROM "subject_versions"
    WHERE "isDefault" = true
    GROUP BY "subjectId"
    HAVING count(*) > 1
  ) duplicates;

  IF duplicate_default_subjects > 0 THEN
    RAISE EXCEPTION 'Cannot add subject_versions_one_default_per_subject_idx: % subjects have multiple default versions', duplicate_default_subjects;
  END IF;
END $$;

CREATE UNIQUE INDEX "subject_versions_one_default_per_subject_idx"
ON "subject_versions"("subjectId")
WHERE "isDefault" = true;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "subject_versions" WHERE "confidenceScore" < 0 OR "confidenceScore" > 100) THEN
    RAISE EXCEPTION 'Cannot add score checks: subject_versions.confidenceScore has values outside 0..100';
  END IF;

  IF EXISTS (SELECT 1 FROM "capability_assertions" WHERE "confidenceScore" < 0 OR "confidenceScore" > 100) THEN
    RAISE EXCEPTION 'Cannot add score checks: capability_assertions.confidenceScore has values outside 0..100';
  END IF;

  IF EXISTS (SELECT 1 FROM "abilities" WHERE "confidenceScore" < 0 OR "confidenceScore" > 100) THEN
    RAISE EXCEPTION 'Cannot add score checks: abilities.confidenceScore has values outside 0..100';
  END IF;

  IF EXISTS (SELECT 1 FROM "resistances" WHERE "confidenceScore" < 0 OR "confidenceScore" > 100) THEN
    RAISE EXCEPTION 'Cannot add score checks: resistances.confidenceScore has values outside 0..100';
  END IF;

  IF EXISTS (SELECT 1 FROM "weaknesses" WHERE "confidenceScore" < 0 OR "confidenceScore" > 100) THEN
    RAISE EXCEPTION 'Cannot add score checks: weaknesses.confidenceScore has values outside 0..100';
  END IF;

  IF EXISTS (SELECT 1 FROM "win_loss_conditions" WHERE "confidenceScore" < 0 OR "confidenceScore" > 100) THEN
    RAISE EXCEPTION 'Cannot add score checks: win_loss_conditions.confidenceScore has values outside 0..100';
  END IF;

  IF EXISTS (SELECT 1 FROM "feat_assertions" WHERE "confidenceScore" < 0 OR "confidenceScore" > 100) THEN
    RAISE EXCEPTION 'Cannot add score checks: feat_assertions.confidenceScore has values outside 0..100';
  END IF;

  IF EXISTS (SELECT 1 FROM "scaling_edges" WHERE "confidenceScore" < 0 OR "confidenceScore" > 100) THEN
    RAISE EXCEPTION 'Cannot add score checks: scaling_edges.confidenceScore has values outside 0..100';
  END IF;

  IF EXISTS (SELECT 1 FROM "fact_suggestions" WHERE "confidenceScore" < 0 OR "confidenceScore" > 100) THEN
    RAISE EXCEPTION 'Cannot add score checks: fact_suggestions.confidenceScore has values outside 0..100';
  END IF;

  IF EXISTS (SELECT 1 FROM "evidence_links" WHERE "relevanceScore" < 0 OR "relevanceScore" > 100) THEN
    RAISE EXCEPTION 'Cannot add score checks: evidence_links.relevanceScore has values outside 0..100';
  END IF;
END $$;

ALTER TABLE "subject_versions"
ADD CONSTRAINT "subject_versions_confidenceScore_range_check"
CHECK ("confidenceScore" BETWEEN 0 AND 100);

ALTER TABLE "capability_assertions"
ADD CONSTRAINT "capability_assertions_confidenceScore_range_check"
CHECK ("confidenceScore" BETWEEN 0 AND 100);

ALTER TABLE "abilities"
ADD CONSTRAINT "abilities_confidenceScore_range_check"
CHECK ("confidenceScore" BETWEEN 0 AND 100);

ALTER TABLE "resistances"
ADD CONSTRAINT "resistances_confidenceScore_range_check"
CHECK ("confidenceScore" BETWEEN 0 AND 100);

ALTER TABLE "weaknesses"
ADD CONSTRAINT "weaknesses_confidenceScore_range_check"
CHECK ("confidenceScore" BETWEEN 0 AND 100);

ALTER TABLE "win_loss_conditions"
ADD CONSTRAINT "win_loss_conditions_confidenceScore_range_check"
CHECK ("confidenceScore" BETWEEN 0 AND 100);

ALTER TABLE "feat_assertions"
ADD CONSTRAINT "feat_assertions_confidenceScore_range_check"
CHECK ("confidenceScore" BETWEEN 0 AND 100);

ALTER TABLE "scaling_edges"
ADD CONSTRAINT "scaling_edges_confidenceScore_range_check"
CHECK ("confidenceScore" BETWEEN 0 AND 100);

ALTER TABLE "fact_suggestions"
ADD CONSTRAINT "fact_suggestions_confidenceScore_range_check"
CHECK ("confidenceScore" BETWEEN 0 AND 100);

ALTER TABLE "evidence_links"
ADD CONSTRAINT "evidence_links_relevanceScore_range_check"
CHECK ("relevanceScore" BETWEEN 0 AND 100);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "evidence_links"
    WHERE num_nonnulls(
      "capabilityId",
      "abilityId",
      "resistanceId",
      "equipmentId",
      "weaknessId",
      "conditionId",
      "featId",
      "scalingEdgeId",
      "suggestionId"
    ) <> 1
  ) THEN
    RAISE EXCEPTION 'Cannot add evidence_links_exactly_one_target_check: evidence links must point to exactly one target record';
  END IF;
END $$;

ALTER TABLE "evidence_links"
ADD CONSTRAINT "evidence_links_exactly_one_target_check"
CHECK (
  num_nonnulls(
    "capabilityId",
    "abilityId",
    "resistanceId",
    "equipmentId",
    "weaknessId",
    "conditionId",
    "featId",
    "scalingEdgeId",
    "suggestionId"
  ) = 1
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "scenario_modifiers"
    WHERE num_nonnulls("targetSide", "targetParticipantId") > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add scenario_modifiers_at_most_one_target_scope_check: targetSide and targetParticipantId cannot both be set';
  END IF;
END $$;

ALTER TABLE "scenario_modifiers"
ADD CONSTRAINT "scenario_modifiers_at_most_one_target_scope_check"
CHECK (num_nonnulls("targetSide", "targetParticipantId") <= 1);

CREATE INDEX "fact_suggestions_battleRunId_idx"
ON "fact_suggestions"("battleRunId");
