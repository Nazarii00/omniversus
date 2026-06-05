-- AlterTable
ALTER TABLE "profiles"
ADD COLUMN "supabaseId" TEXT NOT NULL,
ADD COLUMN "clearance" TEXT NOT NULL DEFAULT 'SIGMA-1',
ADD COLUMN "reputation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "credits" INTEGER NOT NULL DEFAULT 100,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "profiles_supabaseId_key" ON "profiles"("supabaseId");