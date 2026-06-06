-- User-facing review queue for factual appeals and subject creation requests.
CREATE TYPE "UserAppealKind" AS ENUM ('INFO_APPEAL', 'SUBJECT_REQUEST');

CREATE TABLE "user_appeals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "UserAppealKind" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "subjectName" TEXT NOT NULL,
    "targetVersionId" UUID,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "proposedText" TEXT,
    "sourceRef" TEXT,
    "submitterName" TEXT,
    "submitterContact" TEXT,
    "createdByUserId" UUID,
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMPTZ(6),
    "resolutionNote" TEXT,
    "createdSubjectId" UUID,
    "createdVersionId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_appeals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_appeals_kind_status_idx" ON "user_appeals"("kind", "status");
CREATE INDEX "user_appeals_status_createdAt_idx" ON "user_appeals"("status", "createdAt");
CREATE INDEX "user_appeals_targetVersionId_idx" ON "user_appeals"("targetVersionId");
CREATE INDEX "user_appeals_createdSubjectId_idx" ON "user_appeals"("createdSubjectId");
CREATE INDEX "user_appeals_createdVersionId_idx" ON "user_appeals"("createdVersionId");
CREATE INDEX "user_appeals_subjectName_idx" ON "user_appeals"("subjectName");

ALTER TABLE "user_appeals"
ADD CONSTRAINT "user_appeals_targetVersionId_fkey"
FOREIGN KEY ("targetVersionId") REFERENCES "subject_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_appeals"
ADD CONSTRAINT "user_appeals_createdSubjectId_fkey"
FOREIGN KEY ("createdSubjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_appeals"
ADD CONSTRAINT "user_appeals_createdVersionId_fkey"
FOREIGN KEY ("createdVersionId") REFERENCES "subject_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
