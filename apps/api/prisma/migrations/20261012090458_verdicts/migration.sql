-- CreateTable
CREATE TABLE "verdicts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "pair_id" UUID NOT NULL,
    "week_start" TIMESTAMPTZ NOT NULL,
    "week_end" TIMESTAMPTZ NOT NULL,
    "sealed_at" TIMESTAMPTZ NOT NULL,
    "winner_id" UUID,
    "loser_id" UUID,
    "is_tie" BOOLEAN NOT NULL,
    "snapshot" JSONB NOT NULL,
    "sentence_key" TEXT,
    "shared_at" TIMESTAMPTZ,
    "sentence_locked_at" TIMESTAMPTZ,
    "served_at" TIMESTAMPTZ,
    "confirmed_at" TIMESTAMPTZ,

    CONSTRAINT "verdicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verdicts_pair_id_week_start_key" ON "verdicts"("pair_id", "week_start");

-- AddForeignKey
ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_pair_id_fkey" FOREIGN KEY ("pair_id") REFERENCES "pairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
