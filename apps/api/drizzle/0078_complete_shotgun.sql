CREATE TABLE "portal_link" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"owner_id" text,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"group_name" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT 'Globe' NOT NULL,
	"color" text DEFAULT 'blue' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
	"updated_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_read" (
	"user_id" text PRIMARY KEY NOT NULL,
	"release_sequence" integer DEFAULT 0 NOT NULL,
	"read_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"task_id" text,
	"created_by" text,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "collaborator_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_link" ADD CONSTRAINT "portal_link_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_link" ADD CONSTRAINT "portal_link_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_read" ADD CONSTRAINT "release_read_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_attachment" ADD CONSTRAINT "requirement_attachment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_attachment" ADD CONSTRAINT "requirement_attachment_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_attachment" ADD CONSTRAINT "requirement_attachment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portal_link_scope_idx" ON "portal_link" USING btree ("workspace_id","owner_id","position");--> statement-breakpoint
CREATE INDEX "requirement_attachment_task_idx" ON "requirement_attachment" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "requirement_attachment_draft_idx" ON "requirement_attachment" USING btree ("created_by","created_at");--> statement-breakpoint
CREATE INDEX "task_collaborators_idx" ON "task" USING gin ("collaborator_ids");
--> statement-breakpoint
-- Grant the requested assignment permission once; later administrator changes remain editable.
UPDATE workspace_role SET permission=jsonb_set(permission::jsonb,'{task}',
  coalesce(permission::jsonb->'task','[]'::jsonb)||'"assign"'::jsonb)::text, updated_at=(now() AT TIME ZONE 'utc')
WHERE role='member' AND NOT (coalesce(permission::jsonb->'task','[]'::jsonb) ? 'assign');
--> statement-breakpoint
-- Keep every assignment entry point consistent, including bulk operations and imports.
CREATE FUNCTION kaneob_prepare_task_collaborators() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT coalesce(jsonb_agg(value ORDER BY value), '[]'::jsonb)
  INTO NEW.collaborator_ids
  FROM (SELECT DISTINCT value FROM jsonb_array_elements_text(NEW.collaborator_ids)
        WHERE value <> coalesce(NEW.assignee_id, '') AND value <> '') members;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER kaneob_prepare_task_collaborators BEFORE INSERT OR UPDATE OF assignee_id, collaborator_ids ON task
FOR EACH ROW EXECUTE FUNCTION kaneob_prepare_task_collaborators();
--> statement-breakpoint
CREATE FUNCTION kaneob_remove_user_collaborations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE task SET collaborator_ids = collaborator_ids - OLD.id
  WHERE collaborator_ids @> jsonb_build_array(OLD.id);
  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER kaneob_remove_user_collaborations AFTER DELETE ON "user"
FOR EACH ROW EXECUTE FUNCTION kaneob_remove_user_collaborations();
--> statement-breakpoint
CREATE FUNCTION kaneob_remove_workspace_collaborations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE task SET collaborator_ids = collaborator_ids - OLD.user_id
  WHERE project_id IN (SELECT id FROM project WHERE workspace_id = OLD.workspace_id)
    AND collaborator_ids @> jsonb_build_array(OLD.user_id);
  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER kaneob_remove_workspace_collaborations AFTER DELETE ON workspace_member
FOR EACH ROW EXECUTE FUNCTION kaneob_remove_workspace_collaborations();
