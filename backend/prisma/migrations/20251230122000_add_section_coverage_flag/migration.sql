-- Add intentionally_uncovered flag to spec_sections for coverage tracking
ALTER TABLE "spec_sections"
ADD COLUMN "intentionally_uncovered" BOOLEAN NOT NULL DEFAULT FALSE;
