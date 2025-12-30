-- CreateEnum
CREATE TYPE "SpecStatus" AS ENUM ('uploaded', 'extracting', 'ready', 'translating', 'translated', 'error');

-- CreateEnum
CREATE TYPE "WorkItemType" AS ENUM ('epic', 'feature', 'story');

-- CreateEnum
CREATE TYPE "WorkItemStatus" AS ENUM ('draft', 'ready_for_review', 'approved', 'exported');

-- CreateEnum
CREATE TYPE "SizeEstimate" AS ENUM ('S', 'M', 'L', 'XL');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jira_project_key" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "extracted_text" TEXT,
    "status" "SpecStatus" NOT NULL DEFAULT 'uploaded',
    "spec_type" TEXT NOT NULL DEFAULT 'api-spec',
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "error_message" TEXT,

    CONSTRAINT "specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spec_sections" (
    "id" TEXT NOT NULL,
    "spec_id" TEXT NOT NULL,
    "section_ref" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "spec_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_items" (
    "id" TEXT NOT NULL,
    "spec_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "type" "WorkItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "acceptance_criteria" TEXT,
    "technical_notes" TEXT,
    "size_estimate" "SizeEstimate",
    "status" "WorkItemStatus" NOT NULL DEFAULT 'draft',
    "order_index" INTEGER NOT NULL,
    "jira_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_item_sources" (
    "work_item_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "relevance_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "work_item_sources_pkey" PRIMARY KEY ("work_item_id","section_id")
);

-- CreateTable
CREATE TABLE "work_item_history" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "field_changed" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_item_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "cloud_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "specs_project_id_idx" ON "specs"("project_id");

-- CreateIndex
CREATE INDEX "specs_status_idx" ON "specs"("status");

-- CreateIndex
CREATE INDEX "spec_sections_spec_id_idx" ON "spec_sections"("spec_id");

-- CreateIndex
CREATE INDEX "work_items_spec_id_idx" ON "work_items"("spec_id");

-- CreateIndex
CREATE INDEX "work_items_parent_id_idx" ON "work_items"("parent_id");

-- CreateIndex
CREATE INDEX "work_items_type_idx" ON "work_items"("type");

-- CreateIndex
CREATE INDEX "work_items_status_idx" ON "work_items"("status");

-- CreateIndex
CREATE INDEX "work_item_history_work_item_id_idx" ON "work_item_history"("work_item_id");

-- CreateIndex
CREATE INDEX "work_item_history_changed_at_idx" ON "work_item_history"("changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "jira_connections_user_id_key" ON "jira_connections"("user_id");

-- AddForeignKey
ALTER TABLE "specs" ADD CONSTRAINT "specs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spec_sections" ADD CONSTRAINT "spec_sections_spec_id_fkey" FOREIGN KEY ("spec_id") REFERENCES "specs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_spec_id_fkey" FOREIGN KEY ("spec_id") REFERENCES "specs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_item_sources" ADD CONSTRAINT "work_item_sources_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_item_sources" ADD CONSTRAINT "work_item_sources_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "spec_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_item_history" ADD CONSTRAINT "work_item_history_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
