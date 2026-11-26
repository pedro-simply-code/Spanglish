CREATE TABLE "practice_results" (
	"id" text PRIMARY KEY NOT NULL,
	"material_id" text NOT NULL,
	"student_user_id" text NOT NULL,
	"correct" integer NOT NULL,
	"total" integer NOT NULL,
	"xp" integer NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_results" ADD CONSTRAINT "practice_results_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_results" ADD CONSTRAINT "practice_results_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practice_results_material_idx" ON "practice_results" USING btree ("material_id","created_at");--> statement-breakpoint
CREATE INDEX "practice_results_student_idx" ON "practice_results" USING btree ("student_user_id","material_id");