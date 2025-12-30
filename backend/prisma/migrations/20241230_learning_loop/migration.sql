-- Learning Loop Migration
-- Adds tables for tracking story edits and learned patterns

-- Create enums
CREATE TYPE "EditField" AS ENUM ('title', 'description', 'acceptanceCriteria', 'technicalNotes', 'size', 'priority');
CREATE TYPE "EditType" AS ENUM ('addition', 'removal', 'modification', 'complete');
CREATE TYPE "SuggestionType" AS ENUM ('addToPreferences', 'addToGlossary', 'updateTemplate', 'addRequiredSection');
CREATE TYPE "PatternStatus" AS ENUM ('pending', 'suggested', 'accepted', 'dismissed', 'applied');

-- StoryEdit table
CREATE TABLE "story_edits" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "field" "EditField" NOT NULL,
    "before_value" TEXT NOT NULL,
    "after_value" TEXT NOT NULL,
    "edit_type" "EditType" NOT NULL,
    "spec_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_edits_pkey" PRIMARY KEY ("id")
);

-- LearnedPattern table
CREATE TABLE "learned_patterns" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "field" "EditField" NOT NULL,
    "context" TEXT,
    "suggestion" TEXT NOT NULL,
    "suggestion_type" "SuggestionType" NOT NULL,
    "status" "PatternStatus" NOT NULL DEFAULT 'pending',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learned_patterns_pkey" PRIMARY KEY ("id")
);

-- Indexes for story_edits
CREATE INDEX "story_edits_project_id_idx" ON "story_edits"("project_id");
CREATE INDEX "story_edits_work_item_id_idx" ON "story_edits"("work_item_id");
CREATE INDEX "story_edits_field_idx" ON "story_edits"("field");

-- Indexes for learned_patterns
CREATE INDEX "learned_patterns_project_id_idx" ON "learned_patterns"("project_id");
CREATE INDEX "learned_patterns_status_idx" ON "learned_patterns"("status");

-- Foreign keys
ALTER TABLE "story_edits" ADD CONSTRAINT "story_edits_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "story_edits" ADD CONSTRAINT "story_edits_work_item_id_fkey"
    FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learned_patterns" ADD CONSTRAINT "learned_patterns_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
