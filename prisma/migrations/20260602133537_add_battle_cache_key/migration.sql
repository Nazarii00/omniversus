-- AlterTable
ALTER TABLE "battle_runs" ADD COLUMN     "cacheKey" TEXT;

-- CreateIndex
CREATE INDEX "battle_runs_cacheKey_status_idx" ON "battle_runs"("cacheKey", "status");
