-- Project Health Migration
-- Adds table for caching project health scores

-- Create enum
CREATE TYPE "HealthLevel" AS ENUM ('minimal', 'basic', 'good', 'excellent');

-- ProjectHealth table
CREATE TABLE "project_health" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "level" "HealthLevel" NOT NULL,
    "brief_score" INTEGER NOT NULL,
    "glossary_score" INTEGER NOT NULL,
    "prefs_score" INTEGER NOT NULL,
    "specs_score" INTEGER NOT NULL,
    "sources_score" INTEGER NOT NULL,
    "learning_score" INTEGER NOT NULL,
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "calculated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_health_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on project_id
CREATE UNIQUE INDEX "project_health_project_id_key" ON "project_health"("project_id");

-- Foreign key
ALTER TABLE "project_health" ADD CONSTRAINT "project_health_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
