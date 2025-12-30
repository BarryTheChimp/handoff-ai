-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('architecture', 'process', 'technical', 'business', 'other');

-- CreateEnum
CREATE TYPE "ACFormat" AS ENUM ('gherkin', 'bullets', 'checklist', 'numbered');

-- CreateEnum
CREATE TYPE "Verbosity" AS ENUM ('concise', 'balanced', 'detailed');

-- CreateEnum
CREATE TYPE "TechnicalDepth" AS ENUM ('high_level', 'moderate', 'implementation');

-- CreateTable
CREATE TABLE "project_knowledge" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "brief" TEXT,
    "brief_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "glossary_terms" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "use_instead" TEXT,
    "avoid_terms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_manual" BOOLEAN NOT NULL DEFAULT true,
    "source_spec_id" TEXT,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "glossary_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_documents" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "extracted_text" TEXT,
    "summary" TEXT,
    "doc_type" "DocumentType" NOT NULL DEFAULT 'other',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT NOT NULL,

    CONSTRAINT "reference_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "heading" TEXT,
    "summary" TEXT,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_preferences_config" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "ac_format" "ACFormat" NOT NULL DEFAULT 'bullets',
    "required_sections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "max_ac_count" INTEGER NOT NULL DEFAULT 8,
    "verbosity" "Verbosity" NOT NULL DEFAULT 'balanced',
    "technical_depth" "TechnicalDepth" NOT NULL DEFAULT 'moderate',
    "custom_prefs" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_preferences_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_knowledge_project_id_key" ON "project_knowledge"("project_id");

-- CreateIndex
CREATE INDEX "glossary_terms_project_id_idx" ON "glossary_terms"("project_id");

-- CreateIndex
CREATE INDEX "glossary_terms_category_idx" ON "glossary_terms"("category");

-- CreateIndex
CREATE UNIQUE INDEX "glossary_terms_project_id_term_key" ON "glossary_terms"("project_id", "term");

-- CreateIndex
CREATE INDEX "reference_documents_project_id_idx" ON "reference_documents"("project_id");

-- CreateIndex
CREATE INDEX "document_chunks_document_id_idx" ON "document_chunks"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_preferences_config_project_id_key" ON "team_preferences_config"("project_id");

-- AddForeignKey
ALTER TABLE "project_knowledge" ADD CONSTRAINT "project_knowledge_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glossary_terms" ADD CONSTRAINT "glossary_terms_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_documents" ADD CONSTRAINT "reference_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "reference_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_preferences_config" ADD CONSTRAINT "team_preferences_config_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
