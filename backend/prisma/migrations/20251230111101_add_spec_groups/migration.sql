-- CreateEnum
CREATE TYPE "SpecGroupStatus" AS ENUM ('pending', 'analyzing', 'conflicts_detected', 'ready', 'error');

-- CreateTable
CREATE TABLE "spec_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "primary_spec_id" UUID,
    "stitched_context" TEXT,
    "status" "SpecGroupStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spec_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spec_conflicts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "spec_group_id" UUID NOT NULL,
    "spec1_id" UUID NOT NULL,
    "spec1_section" VARCHAR(200) NOT NULL,
    "spec1_text" TEXT NOT NULL,
    "spec2_id" UUID NOT NULL,
    "spec2_section" VARCHAR(200) NOT NULL,
    "spec2_text" TEXT NOT NULL,
    "conflict_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'warning',
    "description" TEXT NOT NULL,
    "resolution" VARCHAR(50),
    "merged_text" TEXT,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "spec_conflicts_pkey" PRIMARY KEY ("id")
);

-- Add spec_group_id to specs table
ALTER TABLE "specs" ADD COLUMN "spec_group_id" UUID;

-- CreateIndex
CREATE INDEX "spec_groups_project_id_idx" ON "spec_groups"("project_id");
CREATE INDEX "spec_groups_status_idx" ON "spec_groups"("status");
CREATE INDEX "spec_conflicts_spec_group_id_idx" ON "spec_conflicts"("spec_group_id");
CREATE INDEX "spec_conflicts_resolution_idx" ON "spec_conflicts"("resolution");
CREATE INDEX "specs_spec_group_id_idx" ON "specs"("spec_group_id");

-- AddForeignKey
ALTER TABLE "spec_groups" ADD CONSTRAINT "spec_groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spec_conflicts" ADD CONSTRAINT "spec_conflicts_spec_group_id_fkey" FOREIGN KEY ("spec_group_id") REFERENCES "spec_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specs" ADD CONSTRAINT "specs_spec_group_id_fkey" FOREIGN KEY ("spec_group_id") REFERENCES "spec_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
