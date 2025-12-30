-- CreateTable
CREATE TABLE "bulk_operations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(255) NOT NULL,
    "spec_id" UUID NOT NULL,
    "operation" VARCHAR(50) NOT NULL,
    "item_ids" UUID[] NOT NULL,
    "payload" JSONB NOT NULL,
    "previous_values" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bulk_operations_user_id_idx" ON "bulk_operations"("user_id");
CREATE INDEX "bulk_operations_spec_id_idx" ON "bulk_operations"("spec_id");
CREATE INDEX "bulk_operations_expires_at_idx" ON "bulk_operations"("expires_at");
