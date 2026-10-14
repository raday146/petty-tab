-- CreateTable
CREATE TABLE "custom_crimes" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "pair_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sticker" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "chore_owner_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ,

    CONSTRAINT "custom_crimes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chore_days" (
    "crime_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "done_at" TIMESTAMPTZ,
    "charge_id" UUID,

    CONSTRAINT "chore_days_pkey" PRIMARY KEY ("crime_id","day")
);

-- CreateIndex
CREATE INDEX "custom_crimes_pair_id_idx" ON "custom_crimes"("pair_id");

-- AddForeignKey
ALTER TABLE "custom_crimes" ADD CONSTRAINT "custom_crimes_pair_id_fkey" FOREIGN KEY ("pair_id") REFERENCES "pairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_crimes" ADD CONSTRAINT "custom_crimes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_crimes" ADD CONSTRAINT "custom_crimes_chore_owner_id_fkey" FOREIGN KEY ("chore_owner_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_days" ADD CONSTRAINT "chore_days_crime_id_fkey" FOREIGN KEY ("crime_id") REFERENCES "custom_crimes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
