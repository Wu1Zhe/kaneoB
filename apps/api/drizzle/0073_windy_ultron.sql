ALTER TABLE "task" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "weight" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "actual_start_at" timestamp;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "actual_end_at" timestamp;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
UPDATE "column" SET "position" = "position" + 1, "updated_at" = now() WHERE "position" >= 2;--> statement-breakpoint
INSERT INTO "column" ("id", "project_id", "name", "slug", "position", "icon", "color", "is_final", "created_at", "updated_at")
SELECT md5(random()::text || clock_timestamp()::text || p."id"), p."id", 'Pending Acceptance', 'pending-acceptance', 2, NULL, NULL, false, now(), now()
FROM "project" p
WHERE EXISTS (SELECT 1 FROM "column" c WHERE c."project_id" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "column" c WHERE c."project_id" = p."id" AND c."slug" = 'pending-acceptance');