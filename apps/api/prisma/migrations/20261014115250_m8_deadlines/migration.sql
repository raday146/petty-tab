-- AlterTable
ALTER TABLE "pairs" ADD COLUMN     "cycle_end" TIMESTAMPTZ,
ADD COLUMN     "cycle_start" TIMESTAMPTZ,
ADD COLUMN     "proposal_at" TIMESTAMPTZ,
ADD COLUMN     "proposal_by" UUID,
ADD COLUMN     "proposal_end" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "pairs_cycle_end_idx" ON "pairs"("cycle_end");
