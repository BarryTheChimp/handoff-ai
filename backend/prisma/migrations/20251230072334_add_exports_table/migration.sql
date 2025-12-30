-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');

-- AlterTable
ALTER TABLE "jira_connections" ADD COLUMN     "site_url" TEXT;

-- CreateTable
CREATE TABLE "exports" (
    "id" TEXT NOT NULL,
    "spec_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "jira_project_key" TEXT NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'pending',
    "is_dry_run" BOOLEAN NOT NULL DEFAULT false,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "results" JSONB NOT NULL DEFAULT '[]',
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exports_spec_id_idx" ON "exports"("spec_id");

-- CreateIndex
CREATE INDEX "exports_user_id_idx" ON "exports"("user_id");

-- CreateIndex
CREATE INDEX "exports_status_idx" ON "exports"("status");
