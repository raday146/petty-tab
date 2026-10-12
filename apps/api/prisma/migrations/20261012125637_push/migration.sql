-- AlterTable
ALTER TABLE "charges" ADD COLUMN     "pushed_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "verdicts" ADD COLUMN     "reminded_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "push_subs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subs_endpoint_key" ON "push_subs"("endpoint");

-- CreateIndex
CREATE INDEX "push_subs_user_id_idx" ON "push_subs"("user_id");

-- AddForeignKey
ALTER TABLE "push_subs" ADD CONSTRAINT "push_subs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
