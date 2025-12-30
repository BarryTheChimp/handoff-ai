-- CreateTable
CREATE TABLE "story_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
    "ac_format" VARCHAR(20) NOT NULL DEFAULT 'bullets',
    "required_sections" VARCHAR(50)[] DEFAULT '{}',
    "custom_fields" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "story_templates_project_id_name_key" UNIQUE ("project_id", "name")
);

-- CreateIndex
CREATE INDEX "story_templates_project_id_idx" ON "story_templates"("project_id");

-- AddForeignKey
ALTER TABLE "story_templates" ADD CONSTRAINT "story_templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add template reference and custom fields to work_items
ALTER TABLE "work_items" ADD COLUMN "template_id" UUID;
ALTER TABLE "work_items" ADD COLUMN "custom_fields" JSONB NOT NULL DEFAULT '{}';
