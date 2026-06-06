import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local" });
loadEnv();

const { Client } = pg;
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required");
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const { rows } = await client.query(`
    SELECT
      s."slug",
      v."label" AS "version",
      v."isDefault",
      (
        SELECT count(*)::int
        FROM "capability_assertions" c
        WHERE c."versionId" = v."id"
      ) AS "capabilities",
      (
        SELECT count(*)::int
        FROM "abilities" a
        WHERE a."versionId" = v."id"
      ) AS "abilities",
      (
        SELECT count(*)::int
        FROM "resistances" r
        WHERE r."versionId" = v."id"
      ) AS "resistances",
      (
        SELECT count(*)::int
        FROM "weaknesses" w
        WHERE w."versionId" = v."id"
      ) AS "weaknesses",
      (
        SELECT count(*)::int
        FROM "win_loss_conditions" wc
        WHERE wc."versionId" = v."id"
      ) AS "conditions",
      (
        SELECT count(*)::int
        FROM "evidence_links" el
        WHERE el."capabilityId" IN (
          SELECT c."id" FROM "capability_assertions" c WHERE c."versionId" = v."id"
        )
        OR el."abilityId" IN (
          SELECT a."id" FROM "abilities" a WHERE a."versionId" = v."id"
        )
        OR el."resistanceId" IN (
          SELECT r."id" FROM "resistances" r WHERE r."versionId" = v."id"
        )
        OR el."weaknessId" IN (
          SELECT w."id" FROM "weaknesses" w WHERE w."versionId" = v."id"
        )
        OR el."conditionId" IN (
          SELECT wc."id" FROM "win_loss_conditions" wc WHERE wc."versionId" = v."id"
        )
      ) AS "evidenceLinks"
    FROM "subjects" s
    JOIN "subject_versions" v ON v."subjectId" = s."id"
    WHERE s."slug" IN ('jason-voorhees', 'michael-myers')
    ORDER BY s."slug", v."label";
  `);

  console.table(rows);
} finally {
  await client.end();
}
