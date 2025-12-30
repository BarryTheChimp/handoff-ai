-- CreateEnum
CREATE TYPE "ContextSourceType" AS ENUM ('specs', 'jira', 'document', 'confluence', 'github');

-- CreateTable
CREATE TABLE "context_sources" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "source_type" "ContextSourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "last_sync_at" TIMESTAMP(3),
    "last_error" TEXT,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_chunks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "source_type" "ContextSourceType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "heading" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "context_sources_project_id_idx" ON "context_sources"("project_id");

-- CreateIndex
CREATE INDEX "context_sources_source_type_idx" ON "context_sources"("source_type");

-- CreateIndex
CREATE INDEX "context_chunks_project_id_idx" ON "context_chunks"("project_id");

-- CreateIndex
CREATE INDEX "context_chunks_source_type_idx" ON "context_chunks"("source_type");

-- CreateIndex
CREATE INDEX "context_chunks_source_id_idx" ON "context_chunks"("source_id");

-- AddForeignKey
ALTER TABLE "context_sources" ADD CONSTRAINT "context_sources_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_chunks" ADD CONSTRAINT "context_chunks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
