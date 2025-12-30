-- Add depends_on_ids column for dependency tracking
ALTER TABLE "work_items" ADD COLUMN "depends_on_ids" TEXT[] NOT NULL DEFAULT '{}';

-- Create GIN index for efficient array queries
CREATE INDEX "work_items_depends_on_ids_idx" ON "work_items" USING GIN ("depends_on_ids");
