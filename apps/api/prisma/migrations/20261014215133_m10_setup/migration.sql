-- AlterTable
ALTER TABLE "custom_crimes" ADD COLUMN     "chore_for_joiner" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pairs" ADD COLUMN     "crimes_off" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cycle_days" INTEGER,
ADD COLUMN     "first_end" TIMESTAMPTZ;
