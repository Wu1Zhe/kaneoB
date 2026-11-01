CREATE TABLE "dashboard_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"created_by" text,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_revision" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"task_id" text NOT NULL,
	"operation" text NOT NULL,
	"recorded_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "reporting_started_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "dashboard_snapshot" ADD CONSTRAINT "dashboard_snapshot_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_snapshot" ADD CONSTRAINT "dashboard_snapshot_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dashboard_snapshot_project_idx" ON "dashboard_snapshot" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "task_revision_project_time_idx" ON "task_revision" USING btree ("project_id","recorded_at");--> statement-breakpoint
CREATE INDEX "task_revision_task_time_idx" ON "task_revision" USING btree ("task_id","recorded_at");
--> statement-breakpoint
-- Requirement workflows are isolated from regular projects. Used legacy columns
-- other than To Do are retained, so an existing business state is never guessed.
INSERT INTO "column" (id, project_id, name, slug, position, is_final)
SELECT 'req-' || p.id || '-' || v.slug, p.id, v.name, v.slug, v.position, v.final
FROM project p CROSS JOIN (VALUES
 ('Backlog','backlog',0,false),('Discussing','discussing',1,false),('Planned','requirement-planned',2,false),
 ('Design','design',3,false),('Dev','dev',4,false),('Cross Test','cross-test',5,false),('UAT','uat',6,false),
 ('Pirun','pirun',7,false),('Prod','prod',8,false),('Closed','closed',9,true),('Rejected','rejected',10,true)
) AS v(name,slug,position,final)
WHERE p.kind='requirement' AND NOT EXISTS (SELECT 1 FROM "column" c WHERE c.project_id=p.id AND c.slug=v.slug);
--> statement-breakpoint
UPDATE task t SET status='backlog', column_id=c.id FROM project p, "column" c
WHERE t.project_id=p.id AND p.kind='requirement' AND t.status='to-do' AND c.project_id=p.id AND c.slug='backlog';
--> statement-breakpoint
DELETE FROM "column" c USING project p WHERE c.project_id=p.id AND p.kind='requirement'
AND c.slug IN ('to-do','in-progress','pending-acceptance','in-review','done')
AND NOT EXISTS (SELECT 1 FROM task t WHERE t.column_id=c.id OR (t.project_id=p.id AND t.status=c.slug));
--> statement-breakpoint
-- Preserve existing overall dates; pre-existing node values take precedence.
UPDATE task t SET requirement_data = coalesce(requirement_data,'{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
 'reference',coalesce(nullif(requirement_data->>'reference',''),p.slug||'-'||t.number),
 'designStartPlannedAt',coalesce(requirement_data->>'designStartPlannedAt',to_char(t.start_date,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
 'designStartActualAt',coalesce(requirement_data->>'designStartActualAt',to_char(t.actual_start_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
 'prodPlannedAt',coalesce(requirement_data->>'prodPlannedAt',to_char(t.due_date,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
 'prodActualAt',coalesce(requirement_data->>'prodActualAt',to_char(t.actual_end_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))))
FROM project p WHERE t.project_id=p.id AND p.kind='requirement';
--> statement-breakpoint
CREATE FUNCTION kaneo_requirement_dates() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE key_name text; column_name text; value_text text; new_row jsonb; old_row jsonb;
BEGIN
 IF (SELECT kind FROM project WHERE id=NEW.project_id) <> 'requirement' THEN RETURN NEW; END IF;
 NEW.requirement_data:=coalesce(NEW.requirement_data,'{}'::jsonb);
 new_row:=to_jsonb(NEW); old_row:=CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
 FOR key_name,column_name IN SELECT * FROM (VALUES ('designStartPlannedAt','start_date'),('designStartActualAt','actual_start_at'),('prodPlannedAt','due_date'),('prodActualAt','actual_end_at')) pairs LOOP
   IF (TG_OP='INSERT' AND NOT (NEW.requirement_data ? key_name) AND new_row->>column_name IS NOT NULL) OR (TG_OP='UPDATE' AND (new_row->column_name) IS DISTINCT FROM (old_row->column_name)
      AND (NEW.requirement_data->key_name) IS NOT DISTINCT FROM (OLD.requirement_data->key_name)) THEN
     value_text:=new_row->>column_name;
     NEW.requirement_data:=jsonb_set(NEW.requirement_data,ARRAY[key_name],coalesce(to_jsonb(CASE WHEN value_text IS NULL THEN NULL ELSE to_char(value_text::timestamp,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END),'null'::jsonb));
   END IF;
   value_text:=NEW.requirement_data->>key_name;
   new_row:=jsonb_set(new_row,ARRAY[column_name],coalesce(to_jsonb(value_text::timestamptz AT TIME ZONE 'UTC'),'null'::jsonb));
 END LOOP;
 NEW.start_date:=(new_row->>'start_date')::timestamp; NEW.due_date:=(new_row->>'due_date')::timestamp;
 NEW.actual_start_at:=(new_row->>'actual_start_at')::timestamp; NEW.actual_end_at:=(new_row->>'actual_end_at')::timestamp;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER requirement_dates BEFORE INSERT OR UPDATE ON task FOR EACH ROW EXECUTE FUNCTION kaneo_requirement_dates();
--> statement-breakpoint
UPDATE task t SET requirement_data=t.requirement_data FROM project p WHERE p.id=t.project_id AND p.kind='requirement';
--> statement-breakpoint
CREATE FUNCTION kaneo_report_task_payload(t task) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('id',t.id,'projectId',t.project_id,'number',t.number,'title',t.title,
 'description',left(coalesce(t.description,''),1000),'status',t.status,'columnId',t.column_id,'priority',t.priority,
 'progress',t.progress,'weight',t.weight,'userId',t.assignee_id,'createdBy',t.created_by,'updatedBy',t.updated_by,
 'startDate',t.start_date,'dueDate',t.due_date,'actualStartAt',t.actual_start_at,'actualEndAt',t.actual_end_at,
 'createdAt',t.created_at,'updatedAt',t.updated_at,'requirementData',t.requirement_data-'benefit'-'notes',
 'assigneeName',(SELECT name FROM "user" WHERE id=t.assignee_id),
 'creatorName',(SELECT name FROM "user" WHERE id=t.created_by),
 'updaterName',(SELECT name FROM "user" WHERE id=t.updated_by),
 'statusName',coalesce((SELECT name FROM "column" WHERE id=t.column_id),t.status),
 'isFinal',coalesce((SELECT is_final FROM "column" WHERE id=t.column_id),t.status IN ('done','archived','closed','rejected')));
$$;
--> statement-breakpoint
INSERT INTO task_revision(project_id,task_id,operation,recorded_at,data)
SELECT project_id,id,'baseline',clock_timestamp() AT TIME ZONE 'utc',kaneo_report_task_payload(task) FROM task;
--> statement-breakpoint
CREATE FUNCTION kaneo_capture_task_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE payload jsonb; entered jsonb;
BEGIN
 IF TG_OP='DELETE' THEN
   INSERT INTO task_revision(project_id,task_id,operation,recorded_at,data) VALUES(OLD.project_id,OLD.id,'delete',clock_timestamp() AT TIME ZONE 'utc',kaneo_report_task_payload(OLD)); RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'position'-'updated_at'-'updated_by')=(to_jsonb(OLD)-'position'-'updated_at'-'updated_by') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.project_id<>OLD.project_id THEN
   INSERT INTO task_revision(project_id,task_id,operation,recorded_at,data) VALUES(OLD.project_id,OLD.id,'delete',clock_timestamp() AT TIME ZONE 'utc',kaneo_report_task_payload(OLD));
 END IF;
 IF TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN entered:=to_jsonb(to_char(clock_timestamp() AT TIME ZONE 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
 ELSE SELECT data->'statusEnteredAt' INTO entered FROM task_revision WHERE task_id=NEW.id ORDER BY id DESC LIMIT 1; END IF;
 payload:=kaneo_report_task_payload(NEW)||jsonb_build_object('statusEnteredAt',entered);
 INSERT INTO task_revision(project_id,task_id,operation,recorded_at,data) VALUES(NEW.project_id,NEW.id,lower(TG_OP),clock_timestamp() AT TIME ZONE 'utc',payload); RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER capture_task_revision AFTER INSERT OR UPDATE OR DELETE ON task FOR EACH ROW EXECUTE FUNCTION kaneo_capture_task_revision();
