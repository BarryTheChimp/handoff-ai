-- CreateEnum
CREATE TYPE "SpecGroupStatus" AS ENUM ('pending', 'analyzing', 'conflicts_detected', 'ready', 'error');

-- CreateTable
CREATE TABLE "spec_groups" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primary_spec_id" TEXT,
    "stitched_context" TEXT,
    "status" "SpecGroupStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spec_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spec_conflicts" (
    "id" TEXT NOT NULL,
    "spec_group_id" TEXT NOT NULL,
    "spec1_id" TEXT NOT NULL,
    "spec1_section" TEXT NOT NULL,
    "spec1_text" TEXT NOT NULL,
    "spec2_id" TEXT NOT NULL,
    "spec2_section" TEXT NOT NULL,
    "spec2_text" TEXT NOT NULL,
    "conflict_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "merged_text" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "spec_conflicts_pkey" PRIMARY KEY ("id")
);

-- Add spec_group_id to specs table
ALTER TABLE "specs" ADD COLUMN "spec_group_id" TEXT;

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
