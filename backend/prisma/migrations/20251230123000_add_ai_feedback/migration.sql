-- CreateTable
CREATE TABLE "ai_feedback" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_preferences" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "preference" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "learned_from" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_feedback_work_item_id_idx" ON "ai_feedback"("work_item_id");

-- CreateIndex
CREATE INDEX "ai_feedback_user_id_idx" ON "ai_feedback"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_feedback_work_item_id_user_id_key" ON "ai_feedback"("work_item_id", "user_id");

-- CreateIndex
CREATE INDEX "team_preferences_project_id_idx" ON "team_preferences"("project_id");

-- CreateIndex
CREATE INDEX "team_preferences_active_idx" ON "team_preferences"("active");

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_preferences" ADD CONSTRAINT "team_preferences_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
