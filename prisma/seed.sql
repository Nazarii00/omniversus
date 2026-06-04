-- Starter data for local development and Supabase smoke checks.
-- Facts are intentionally marked REQUIRES_REVIEW, not VERIFIED.

CREATE OR REPLACE FUNCTION pg_temp.upsert_evidence_source(
  p_seed_key text,
  p_title text,
  p_citation text
) RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_id uuid;
BEGIN
  UPDATE "evidence_sources"
  SET
    "title" = p_title,
    "citation" = p_citation,
    "type" = 'MANUAL_NOTE',
    "reliability" = 'SECONDARY',
    "status" = 'REQUIRES_REVIEW',
    "metadata" = jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter'),
    "updatedAt" = now()
  WHERE "metadata"->>'seedKey' = p_seed_key
  RETURNING "id" INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO "evidence_sources" (
      "type",
      "title",
      "citation",
      "reliability",
      "status",
      "metadata",
      "updatedAt"
    )
    VALUES (
      'MANUAL_NOTE',
      p_title,
      p_citation,
      'SECONDARY',
      'REQUIRES_REVIEW',
      jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter'),
      now()
    )
    RETURNING "id" INTO v_id;
  END IF;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION pg_temp.upsert_capability(
  p_seed_key text,
  p_version_id uuid,
  p_category "CapabilityCategory",
  p_subtype text,
  p_value_text text,
  p_context text,
  p_limitations text,
  p_confidence_score integer
) RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_id uuid;
BEGIN
  UPDATE "capability_assertions"
  SET
    "versionId" = p_version_id,
    "category" = p_category,
    "subtype" = p_subtype,
    "valueText" = p_value_text,
    "context" = p_context,
    "limitations" = p_limitations,
    "confidenceBand" = 'MEDIUM',
    "confidenceScore" = p_confidence_score,
    "status" = 'REQUIRES_REVIEW',
    "provenance" = 'MANUAL_DB',
    "metadata" = jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter'),
    "updatedAt" = now()
  WHERE "metadata"->>'seedKey' = p_seed_key
  RETURNING "id" INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO "capability_assertions" (
      "versionId",
      "category",
      "subtype",
      "valueText",
      "context",
      "limitations",
      "confidenceBand",
      "confidenceScore",
      "status",
      "provenance",
      "metadata",
      "updatedAt"
    )
    VALUES (
      p_version_id,
      p_category,
      p_subtype,
      p_value_text,
      p_context,
      p_limitations,
      'MEDIUM',
      p_confidence_score,
      'REQUIRES_REVIEW',
      'MANUAL_DB',
      jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter'),
      now()
    )
    RETURNING "id" INTO v_id;
  END IF;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION pg_temp.upsert_ability(
  p_seed_key text,
  p_version_id uuid,
  p_name text,
  p_type "AbilityType",
  p_description text,
  p_activation text,
  p_delivery text,
  p_range_text text,
  p_timing text,
  p_target_requirement text,
  p_effect text,
  p_limitations text,
  p_counterplay text,
  p_is_passive boolean,
  p_confidence_score integer
) RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_id uuid;
BEGIN
  UPDATE "abilities"
  SET
    "versionId" = p_version_id,
    "name" = p_name,
    "type" = p_type,
    "description" = p_description,
    "activation" = p_activation,
    "delivery" = p_delivery,
    "rangeText" = p_range_text,
    "timing" = p_timing,
    "targetRequirement" = p_target_requirement,
    "effect" = p_effect,
    "limitations" = p_limitations,
    "counterplay" = p_counterplay,
    "isPassive" = p_is_passive,
    "confidenceBand" = 'MEDIUM',
    "confidenceScore" = p_confidence_score,
    "status" = 'REQUIRES_REVIEW',
    "provenance" = 'MANUAL_DB',
    "metadata" = jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter'),
    "updatedAt" = now()
  WHERE "metadata"->>'seedKey' = p_seed_key
  RETURNING "id" INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO "abilities" (
      "versionId",
      "name",
      "type",
      "description",
      "activation",
      "delivery",
      "rangeText",
      "timing",
      "targetRequirement",
      "effect",
      "limitations",
      "counterplay",
      "isPassive",
      "confidenceBand",
      "confidenceScore",
      "status",
      "provenance",
      "metadata",
      "updatedAt"
    )
    VALUES (
      p_version_id,
      p_name,
      p_type,
      p_description,
      p_activation,
      p_delivery,
      p_range_text,
      p_timing,
      p_target_requirement,
      p_effect,
      p_limitations,
      p_counterplay,
      p_is_passive,
      'MEDIUM',
      p_confidence_score,
      'REQUIRES_REVIEW',
      'MANUAL_DB',
      jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter'),
      now()
    )
    RETURNING "id" INTO v_id;
  END IF;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION pg_temp.upsert_resistance(
  p_seed_key text,
  p_version_id uuid,
  p_type "AbilityType",
  p_name text,
  p_basis text,
  p_limits text,
  p_confidence_score integer
) RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_id uuid;
BEGIN
  UPDATE "resistances"
  SET
    "versionId" = p_version_id,
    "type" = p_type,
    "name" = p_name,
    "basis" = p_basis,
    "limits" = p_limits,
    "confidenceBand" = 'MEDIUM',
    "confidenceScore" = p_confidence_score,
    "status" = 'REQUIRES_REVIEW',
    "provenance" = 'MANUAL_DB',
    "metadata" = jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter'),
    "updatedAt" = now()
  WHERE "metadata"->>'seedKey' = p_seed_key
  RETURNING "id" INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO "resistances" (
      "versionId",
      "type",
      "name",
      "basis",
      "limits",
      "confidenceBand",
      "confidenceScore",
      "status",
      "provenance",
      "metadata",
      "updatedAt"
    )
    VALUES (
      p_version_id,
      p_type,
      p_name,
      p_basis,
      p_limits,
      'MEDIUM',
      p_confidence_score,
      'REQUIRES_REVIEW',
      'MANUAL_DB',
      jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter'),
      now()
    )
    RETURNING "id" INTO v_id;
  END IF;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION pg_temp.upsert_weakness(
  p_seed_key text,
  p_version_id uuid,
  p_name text,
  p_description text,
  p_exploitation text,
  p_severity "ConfidenceBand",
  p_confidence_score integer
) RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_id uuid;
BEGIN
  UPDATE "weaknesses"
  SET
    "versionId" = p_version_id,
    "name" = p_name,
    "description" = p_description,
    "exploitation" = p_exploitation,
    "severity" = p_severity,
    "confidenceBand" = 'MEDIUM',
    "confidenceScore" = p_confidence_score,
    "status" = 'REQUIRES_REVIEW',
    "provenance" = 'MANUAL_DB',
    "metadata" = jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter'),
    "updatedAt" = now()
  WHERE "metadata"->>'seedKey' = p_seed_key
  RETURNING "id" INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO "weaknesses" (
      "versionId",
      "name",
      "description",
      "exploitation",
      "severity",
      "confidenceBand",
      "confidenceScore",
      "status",
      "provenance",
      "metadata",
      "updatedAt"
    )
    VALUES (
      p_version_id,
      p_name,
      p_description,
      p_exploitation,
      p_severity,
      'MEDIUM',
      p_confidence_score,
      'REQUIRES_REVIEW',
      'MANUAL_DB',
      jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter'),
      now()
    )
    RETURNING "id" INTO v_id;
  END IF;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION pg_temp.upsert_condition(
  p_seed_key text,
  p_version_id uuid,
  p_kind "ConditionKind",
  p_type "ConditionType",
  p_method text,
  p_requires text,
  p_blocked_by text,
  p_probability_text text,
  p_confidence_score integer
) RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_id uuid;
BEGIN
  UPDATE "win_loss_conditions"
  SET
    "versionId" = p_version_id,
    "kind" = p_kind,
    "type" = p_type,
    "method" = p_method,
    "requires" = p_requires,
    "blockedBy" = p_blocked_by,
    "probabilityText" = p_probability_text,
    "confidenceBand" = 'MEDIUM',
    "confidenceScore" = p_confidence_score,
    "status" = 'REQUIRES_REVIEW',
    "provenance" = 'MANUAL_DB',
    "metadata" = jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter'),
    "updatedAt" = now()
  WHERE "metadata"->>'seedKey' = p_seed_key
  RETURNING "id" INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO "win_loss_conditions" (
      "versionId",
      "kind",
      "type",
      "method",
      "requires",
      "blockedBy",
      "probabilityText",
      "confidenceBand",
      "confidenceScore",
      "status",
      "provenance",
      "metadata",
      "updatedAt"
    )
    VALUES (
      p_version_id,
      p_kind,
      p_type,
      p_method,
      p_requires,
      p_blocked_by,
      p_probability_text,
      'MEDIUM',
      p_confidence_score,
      'REQUIRES_REVIEW',
      'MANUAL_DB',
      jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter'),
      now()
    )
    RETURNING "id" INTO v_id;
  END IF;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION pg_temp.upsert_evidence_link(
  p_seed_key text,
  p_source_id uuid,
  p_target_kind text,
  p_target_id uuid,
  p_note text
) RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE "evidence_links"
  SET
    "sourceId" = p_source_id,
    "capabilityId" = CASE WHEN p_target_kind = 'capability' THEN p_target_id ELSE NULL END,
    "abilityId" = CASE WHEN p_target_kind = 'ability' THEN p_target_id ELSE NULL END,
    "resistanceId" = CASE WHEN p_target_kind = 'resistance' THEN p_target_id ELSE NULL END,
    "weaknessId" = CASE WHEN p_target_kind = 'weakness' THEN p_target_id ELSE NULL END,
    "conditionId" = CASE WHEN p_target_kind = 'condition' THEN p_target_id ELSE NULL END,
    "note" = p_note,
    "relevanceScore" = 72,
    "metadata" = jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter')
  WHERE "metadata"->>'seedKey' = p_seed_key;

  IF NOT FOUND THEN
    INSERT INTO "evidence_links" (
      "sourceId",
      "capabilityId",
      "abilityId",
      "resistanceId",
      "weaknessId",
      "conditionId",
      "note",
      "relevanceScore",
      "metadata"
    )
    VALUES (
      p_source_id,
      CASE WHEN p_target_kind = 'capability' THEN p_target_id ELSE NULL END,
      CASE WHEN p_target_kind = 'ability' THEN p_target_id ELSE NULL END,
      CASE WHEN p_target_kind = 'resistance' THEN p_target_id ELSE NULL END,
      CASE WHEN p_target_kind = 'weakness' THEN p_target_id ELSE NULL END,
      CASE WHEN p_target_kind = 'condition' THEN p_target_id ELSE NULL END,
      p_note,
      72,
      jsonb_build_object('seedKey', p_seed_key, 'seed', 'starter')
    );
  END IF;
END;
$function$;

DO $seed$
DECLARE
  source_id uuid;
  jason_subject_id uuid;
  michael_subject_id uuid;
  jason_version_id uuid;
  michael_version_id uuid;
  central_park_id uuid;
  sba_ruleset_id uuid;
  fact_id uuid;
BEGIN
  source_id := pg_temp.upsert_evidence_source(
    'starter-manual-source',
    'Starter manual dossier notes',
    'Manual seed data for development; requires review before treating as canon-verified.'
  );

  INSERT INTO "battle_environments" (
    "slug",
    "name",
    "kind",
    "scaleText",
    "description",
    "hazards",
    "terrain",
    "resources",
    "physicsPolicy",
    "metadata",
    "updatedAt"
  )
  VALUES (
    'central-park',
    'Central Park',
    'CITY',
    'Urban park scale',
    'A mixed open and wooded city park environment for standard street-level battles.',
    'Trees, lakes, paths, buildings nearby, bystanders ignored under standard battle assumptions.',
    'Open paths, wooded cover, water, uneven ground.',
    'Loose objects, vehicles on perimeter streets, limited improvised cover.',
    'Real-world physics unless verse equalization says otherwise.',
    jsonb_build_object('seedKey', 'env-central-park', 'seed', 'starter'),
    now()
  )
  ON CONFLICT ("slug") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "kind" = EXCLUDED."kind",
    "scaleText" = EXCLUDED."scaleText",
    "description" = EXCLUDED."description",
    "hazards" = EXCLUDED."hazards",
    "terrain" = EXCLUDED."terrain",
    "resources" = EXCLUDED."resources",
    "physicsPolicy" = EXCLUDED."physicsPolicy",
    "metadata" = EXCLUDED."metadata",
    "updatedAt" = now()
  RETURNING "id" INTO central_park_id;

  INSERT INTO "battle_rulesets" (
    "slug",
    "name",
    "description",
    "assumptionSet",
    "speedEqualized",
    "prepTime",
    "priorKnowledge",
    "startingDistance",
    "winConditionPolicy",
    "equipmentPolicy",
    "verseEqualization",
    "retreatAllowed",
    "collateralConcern",
    "customRules",
    "metadata",
    "updatedAt"
  )
  VALUES (
    'vsbw-sba',
    'VSBW Standard Battle Assumptions',
    'Default neutral ruleset for quick objective versus analysis.',
    'VSBW_SBA',
    false,
    'none',
    'appearance and starting direction only',
    'range-based, capped at 4 km',
    'Death, knockout, incapacitation, BFR, sealing, or otherwise preventing meaningful combat count as wins.',
    'standard equipment',
    'reasonable interaction only; no new resistances',
    false,
    false,
    ARRAY['No prep unless explicitly provided.', 'Speed is not equalized unless explicitly provided.'],
    jsonb_build_object('seedKey', 'ruleset-vsbw-sba', 'seed', 'starter'),
    now()
  )
  ON CONFLICT ("slug") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "assumptionSet" = EXCLUDED."assumptionSet",
    "speedEqualized" = EXCLUDED."speedEqualized",
    "prepTime" = EXCLUDED."prepTime",
    "priorKnowledge" = EXCLUDED."priorKnowledge",
    "startingDistance" = EXCLUDED."startingDistance",
    "winConditionPolicy" = EXCLUDED."winConditionPolicy",
    "equipmentPolicy" = EXCLUDED."equipmentPolicy",
    "verseEqualization" = EXCLUDED."verseEqualization",
    "retreatAllowed" = EXCLUDED."retreatAllowed",
    "collateralConcern" = EXCLUDED."collateralConcern",
    "customRules" = EXCLUDED."customRules",
    "metadata" = EXCLUDED."metadata",
    "updatedAt" = now()
  RETURNING "id" INTO sba_ruleset_id;

  INSERT INTO "modifiers" ("key", "name", "category", "description", "defaultValue", "stackable", "metadata", "updatedAt")
  VALUES
    ('bloodlust', 'Bloodlust', 'MENTAL_STATE', 'Target fights with lethal intent and reduced restraint.', 'false', false, jsonb_build_object('seedKey', 'mod-bloodlust', 'seed', 'starter'), now()),
    ('speed-equalized', 'Speed Equalized', 'STAT_CHANGE', 'Combat speed is normalized when the matchup option explicitly requests it.', 'false', false, jsonb_build_object('seedKey', 'mod-speed-equalized', 'seed', 'starter'), now()),
    ('standard-equipment', 'Standard Equipment', 'EQUIPMENT_CHANGE', 'Use the loadout normally available to the subject in the selected version.', 'true', false, jsonb_build_object('seedKey', 'mod-standard-equipment', 'seed', 'starter'), now()),
    ('prep-time', 'Prep Time', 'PREP_TIME', 'Gives one side or both sides preparation before the fight.', 'none', true, jsonb_build_object('seedKey', 'mod-prep-time', 'seed', 'starter'), now())
  ON CONFLICT ("key") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "category" = EXCLUDED."category",
    "description" = EXCLUDED."description",
    "defaultValue" = EXCLUDED."defaultValue",
    "stackable" = EXCLUDED."stackable",
    "metadata" = EXCLUDED."metadata",
    "updatedAt" = now();

  INSERT INTO "subjects" (
    "slug",
    "displayName",
    "canonicalName",
    "kind",
    "originMedium",
    "originName",
    "summary",
    "metadata",
    "updatedAt"
  )
  VALUES (
    'jason-voorhees',
    'Jason Voorhees',
    'Jason Voorhees',
    'FICTIONAL_CHARACTER',
    'MOVIE',
    'Friday the 13th',
    'Horror slasher character with human and later undead portrayals depending on version.',
    jsonb_build_object('seedKey', 'subject-jason-voorhees', 'seed', 'starter'),
    now()
  )
  ON CONFLICT ("slug") DO UPDATE
  SET
    "displayName" = EXCLUDED."displayName",
    "canonicalName" = EXCLUDED."canonicalName",
    "kind" = EXCLUDED."kind",
    "originMedium" = EXCLUDED."originMedium",
    "originName" = EXCLUDED."originName",
    "summary" = EXCLUDED."summary",
    "metadata" = EXCLUDED."metadata",
    "updatedAt" = now()
  RETURNING "id" INTO jason_subject_id;

  INSERT INTO "subjects" (
    "slug",
    "displayName",
    "canonicalName",
    "kind",
    "originMedium",
    "originName",
    "summary",
    "metadata",
    "updatedAt"
  )
  VALUES (
    'michael-myers',
    'Michael Myers',
    'Michael Myers',
    'FICTIONAL_CHARACTER',
    'MOVIE',
    'Halloween',
    'Horror slasher character known for stealth, persistence, and high pain tolerance across timelines.',
    jsonb_build_object('seedKey', 'subject-michael-myers', 'seed', 'starter'),
    now()
  )
  ON CONFLICT ("slug") DO UPDATE
  SET
    "displayName" = EXCLUDED."displayName",
    "canonicalName" = EXCLUDED."canonicalName",
    "kind" = EXCLUDED."kind",
    "originMedium" = EXCLUDED."originMedium",
    "originName" = EXCLUDED."originName",
    "summary" = EXCLUDED."summary",
    "metadata" = EXCLUDED."metadata",
    "updatedAt" = now()
  RETURNING "id" INTO michael_subject_id;

  INSERT INTO "subject_aliases" ("subjectId", "value", "normalizedValue")
  VALUES
    (jason_subject_id, 'Jason Voorhees', 'jason voorhees'),
    (jason_subject_id, 'Jason', 'jason'),
    (michael_subject_id, 'Michael Myers', 'michael myers'),
    (michael_subject_id, 'The Shape', 'the shape')
  ON CONFLICT ("subjectId", "normalizedValue") DO UPDATE
  SET "value" = EXCLUDED."value";

  INSERT INTO "subject_versions" (
    "subjectId",
    "slug",
    "label",
    "canonScope",
    "continuity",
    "era",
    "form",
    "state",
    "isDefault",
    "summary",
    "confidenceBand",
    "confidenceScore",
    "status",
    "provenance",
    "metadata",
    "updatedAt"
  )
  VALUES (
    jason_subject_id,
    'human-parts-1-2',
    'Human Jason (Parts 1-2)',
    'MOVIE',
    'Friday the 13th Parts 1-2',
    'early films',
    'human',
    'standard equipment',
    true,
    'Human-era Jason relies on physical strength, ambush tactics, and melee lethality rather than later undead regeneration.',
    'MEDIUM',
    63,
    'REQUIRES_REVIEW',
    'MANUAL_DB',
    jsonb_build_object('seedKey', 'version-jason-human-parts-1-2', 'seed', 'starter'),
    now()
  )
  ON CONFLICT ("subjectId", "slug") DO UPDATE
  SET
    "label" = EXCLUDED."label",
    "canonScope" = EXCLUDED."canonScope",
    "continuity" = EXCLUDED."continuity",
    "era" = EXCLUDED."era",
    "form" = EXCLUDED."form",
    "state" = EXCLUDED."state",
    "isDefault" = EXCLUDED."isDefault",
    "summary" = EXCLUDED."summary",
    "confidenceBand" = EXCLUDED."confidenceBand",
    "confidenceScore" = EXCLUDED."confidenceScore",
    "status" = EXCLUDED."status",
    "provenance" = EXCLUDED."provenance",
    "metadata" = EXCLUDED."metadata",
    "updatedAt" = now()
  RETURNING "id" INTO jason_version_id;

  INSERT INTO "subject_versions" (
    "subjectId",
    "slug",
    "label",
    "canonScope",
    "continuity",
    "era",
    "form",
    "state",
    "isDefault",
    "summary",
    "confidenceBand",
    "confidenceScore",
    "status",
    "provenance",
    "metadata",
    "updatedAt"
  )
  VALUES (
    michael_subject_id,
    'h40-timeline',
    'H40 Timeline Michael',
    'MOVIE',
    'Halloween 1978 plus H40 timeline',
    'modern sequel timeline',
    'human but abnormally resilient',
    'standard equipment',
    true,
    'Michael Myers in the H40 timeline emphasizes stealth, pain tolerance, strength, and repeated survival from serious injury.',
    'MEDIUM',
    67,
    'REQUIRES_REVIEW',
    'MANUAL_DB',
    jsonb_build_object('seedKey', 'version-michael-h40', 'seed', 'starter'),
    now()
  )
  ON CONFLICT ("subjectId", "slug") DO UPDATE
  SET
    "label" = EXCLUDED."label",
    "canonScope" = EXCLUDED."canonScope",
    "continuity" = EXCLUDED."continuity",
    "era" = EXCLUDED."era",
    "form" = EXCLUDED."form",
    "state" = EXCLUDED."state",
    "isDefault" = EXCLUDED."isDefault",
    "summary" = EXCLUDED."summary",
    "confidenceBand" = EXCLUDED."confidenceBand",
    "confidenceScore" = EXCLUDED."confidenceScore",
    "status" = EXCLUDED."status",
    "provenance" = EXCLUDED."provenance",
    "metadata" = EXCLUDED."metadata",
    "updatedAt" = now()
  RETURNING "id" INTO michael_version_id;

  fact_id := pg_temp.upsert_capability('jason-ap', jason_version_id, 'ATTACK_POTENCY', 'melee damage', 'Lethal melee damage against normal humans with blades and improvised weapons.', 'Useful only if he closes into weapon range.', 'Does not represent later undead Jason scaling.', 62);
  PERFORM pg_temp.upsert_evidence_link('jason-ap-link', source_id, 'capability', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_capability('jason-strength', jason_version_id, 'PHYSICAL_STRENGTH', 'grappling', 'Above-average human strength for overpowering isolated victims.', 'Best applied in ambush or close quarters.', 'Not enough by itself to ignore comparable durability or weapon reach.', 60);
  PERFORM pg_temp.upsert_evidence_link('jason-strength-link', source_id, 'capability', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_capability('jason-durability', jason_version_id, 'DURABILITY', 'human toughness', 'Can continue through ordinary struggle but remains fundamentally human in this version.', 'Sharp weapons, gunfire, and severe trauma remain dangerous.', 'Later supernatural resilience should not be imported into this version.', 61);
  PERFORM pg_temp.upsert_evidence_link('jason-durability-link', source_id, 'capability', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_capability('jason-speed', jason_version_id, 'SPEED', 'movement and reactions', 'Human-level movement with ambush positioning rather than clear superhuman speed.', 'Threat comes from stealth and timing more than chase speed.', 'No speed equalization should be assumed unless battle rules request it.', 58);
  PERFORM pg_temp.upsert_evidence_link('jason-speed-link', source_id, 'capability', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_capability('jason-stamina', jason_version_id, 'STAMINA', 'pursuit', 'Can stalk and pressure targets over a prolonged encounter.', 'Works best in terrain with cover and separated targets.', 'Human-era stamina can still be ended by decisive injury.', 60);
  PERFORM pg_temp.upsert_evidence_link('jason-stamina-link', source_id, 'capability', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_ability('jason-ambush', jason_version_id, 'Ambush Killing', 'UTILITY', 'Uses stealth, surprise, and melee weapons to create lethal opening attacks.', 'Requires positioning.', 'Line of sight break or cover.', 'melee to short range', 'before direct exchange if unnoticed', 'target must be reachable and unaware or delayed', 'Can decide fights against human-level opponents if the first strike lands cleanly.', 'Less reliable in a fully aware face-to-face start.', 'Maintain distance and deny cover.', false, 64);
  PERFORM pg_temp.upsert_evidence_link('jason-ambush-link', source_id, 'ability', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_resistance('jason-resistance', jason_version_id, 'DEFENSE', 'Pain tolerance', 'Can continue acting through pain and fear-based pressure better than a normal victim.', 'Does not equal regeneration or immunity to disabling injury.', 58);
  PERFORM pg_temp.upsert_evidence_link('jason-resistance-link', source_id, 'resistance', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_weakness('jason-weakness', jason_version_id, 'Human-era vulnerability', 'This version lacks the supernatural resilience and regeneration of later Jason portrayals.', 'Exploit with decisive trauma, superior reach, or sustained counterattacks.', 'HIGH', 66);
  PERFORM pg_temp.upsert_evidence_link('jason-weakness-link', source_id, 'weakness', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_condition('jason-win', jason_version_id, 'WIN', 'KO', 'Close distance and land repeated weapon strikes or a disabling grapple.', 'Needs melee access and enough control to prevent escape or counterattack.', 'Blocked by stronger durability, superior weapon control, or losing the stealth opening.', 'Low to medium depending on start distance and awareness.', 62);
  PERFORM pg_temp.upsert_evidence_link('jason-win-link', source_id, 'condition', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_condition('jason-loss', jason_version_id, 'LOSS', 'DAMAGE', 'Can lose by being decisively injured before securing a melee kill.', 'Opponent must exploit his human durability limit.', 'Less likely if he gets an ambush opener.', 'Meaningful risk against similarly lethal slashers.', 63);
  PERFORM pg_temp.upsert_evidence_link('jason-loss-link', source_id, 'condition', fact_id, 'Starter manual note; requires verification.');

  fact_id := pg_temp.upsert_capability('michael-ap', michael_version_id, 'ATTACK_POTENCY', 'melee damage', 'Lethal melee damage with knives, blunt force, and sustained close-range attacks against humans.', 'Most decisive at grappling or knife range.', 'Does not imply immunity to all physical damage.', 66);
  PERFORM pg_temp.upsert_evidence_link('michael-ap-link', source_id, 'capability', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_capability('michael-strength', michael_version_id, 'PHYSICAL_STRENGTH', 'grappling', 'Consistently overpowers adult humans and can control close-quarters exchanges.', 'Strongest when the opponent cannot create distance.', 'Still operates in a broadly human physical frame.', 67);
  PERFORM pg_temp.upsert_evidence_link('michael-strength-link', source_id, 'capability', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_capability('michael-durability', michael_version_id, 'DURABILITY', 'injury survival', 'Shows exceptional survival and continued action after serious physical injury.', 'This supports high pain tolerance and endurance more than clean regeneration.', 'Can still be incapacitated by sufficient damage or restraint.', 69);
  PERFORM pg_temp.upsert_evidence_link('michael-durability-link', source_id, 'capability', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_capability('michael-speed', michael_version_id, 'SPEED', 'movement and reactions', 'Human-level movement with strong stealth timing and sudden close-range pressure.', 'Not a blitz profile; advantage comes from positioning and persistence.', 'Open-field chase speed remains human-comparable.', 60);
  PERFORM pg_temp.upsert_evidence_link('michael-speed-link', source_id, 'capability', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_capability('michael-stamina', michael_version_id, 'STAMINA', 'attrition', 'Can continue stalking and fighting after injuries that would stop most normal humans.', 'Sustained pressure is one of the version’s main advantages.', 'Still vulnerable to complete incapacitation.', 70);
  PERFORM pg_temp.upsert_evidence_link('michael-stamina-link', source_id, 'capability', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_ability('michael-stealth-pressure', michael_version_id, 'Stealth Pressure', 'UTILITY', 'Uses silent approach, patience, and sudden violence to force close-range exchanges.', 'Requires terrain, timing, or target distraction.', 'Cover, darkness, or broken line of sight.', 'melee to short range', 'before or during direct engagement', 'target must allow approach or lose track of him', 'Creates decisive openings and denies opponents clean reset opportunities.', 'Less reliable in a flat arena with constant visibility.', 'Keep line of sight and avoid enclosed routes.', false, 66);
  PERFORM pg_temp.upsert_evidence_link('michael-stealth-pressure-link', source_id, 'ability', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_resistance('michael-resistance', michael_version_id, 'DEFENSE', 'Extreme pain tolerance', 'Continues operating despite wounds and blunt trauma at levels beyond typical human limits.', 'Not absolute immortality or guaranteed recovery.', 68);
  PERFORM pg_temp.upsert_evidence_link('michael-resistance-link', source_id, 'resistance', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_weakness('michael-weakness', michael_version_id, 'No clean ranged answer', 'Michael is most dangerous in close quarters and has limited options if kept at distance.', 'Use range, obstacles, restraint, or repeated disabling damage.', 'MEDIUM', 63);
  PERFORM pg_temp.upsert_evidence_link('michael-weakness-link', source_id, 'weakness', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_condition('michael-win', michael_version_id, 'WIN', 'ATTRITION', 'Absorb or endure the first exchange, close distance, and win through repeated knife or grappling damage.', 'Needs to survive the initial threat and force close range.', 'Blocked by being immobilized, outranged, or decisively disabled before attrition matters.', 'Medium against human-level melee opponents.', 68);
  PERFORM pg_temp.upsert_evidence_link('michael-win-link', source_id, 'condition', fact_id, 'Starter manual note; requires verification.');
  fact_id := pg_temp.upsert_condition('michael-loss', michael_version_id, 'LOSS', 'INCAP', 'Can lose if restrained, immobilized, or damaged enough to prevent continued pursuit.', 'Opponent needs a decisive control route rather than merely causing pain.', 'Pain tolerance can delay but not erase incapacitation.', 'Lower risk in simple melee exchanges, higher with control tools.', 62);
  PERFORM pg_temp.upsert_evidence_link('michael-loss-link', source_id, 'condition', fact_id, 'Starter manual note; requires verification.');

  INSERT INTO "battle_scenarios" (
    "slug",
    "name",
    "environmentId",
    "rulesetId",
    "summary",
    "metadata",
    "updatedAt"
  )
  VALUES (
    'starter-jason-vs-michael',
    'Starter: Jason Voorhees vs Michael Myers',
    central_park_id,
    sba_ruleset_id,
    'Seed scenario for testing dossier retrieval, standard battle assumptions, and report generation.',
    jsonb_build_object('seedKey', 'scenario-jason-vs-michael', 'seed', 'starter'),
    now()
  )
  ON CONFLICT ("slug") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "environmentId" = EXCLUDED."environmentId",
    "rulesetId" = EXCLUDED."rulesetId",
    "summary" = EXCLUDED."summary",
    "metadata" = EXCLUDED."metadata",
    "updatedAt" = now();
END;
$seed$;
