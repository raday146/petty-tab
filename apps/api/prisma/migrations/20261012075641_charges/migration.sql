-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('pending', 'guilty', 'appealed', 'upheld', 'dropped');

-- CreateTable
CREATE TABLE "charges" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "pair_id" UUID NOT NULL,
    "week_start" TIMESTAMPTZ NOT NULL,
    "filer_id" UUID NOT NULL,
    "accused_id" UUID NOT NULL,
    "crime_key" TEXT NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pleaded_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "charges_pair_id_week_start_idx" ON "charges"("pair_id", "week_start");

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_pair_id_fkey" FOREIGN KEY ("pair_id") REFERENCES "pairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_filer_id_fkey" FOREIGN KEY ("filer_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_accused_id_fkey" FOREIGN KEY ("accused_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
