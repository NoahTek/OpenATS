ALTER TABLE "jobs" DROP CONSTRAINT "jobs_department_id_departments_id_fk";
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "department_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_client_id_name_unique" UNIQUE("client_id","name");