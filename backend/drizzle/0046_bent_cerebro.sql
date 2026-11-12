CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"email" varchar(255),
	"website" varchar(500),
	"phone" varchar(50),
	"address" text,
	"description" text,
	"logo_url" varchar(1000),
	"time_zone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "candidate_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"linkedin_url" varchar(500),
	"source" varchar(100),
	"notes" text,
	"resume_key" varchar(1000),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "company_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "department_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "client_id" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "client_id" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "candidate_profile_id" integer;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_candidate_profiles_email" ON "candidate_profiles" USING btree ("email");--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_candidate_profile_id_candidate_profiles_id_fk" FOREIGN KEY ("candidate_profile_id") REFERENCES "public"."candidate_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Backfill candidate_profiles from existing candidates
INSERT INTO "candidate_profiles" ("first_name", "last_name", "email", "phone", "resume_key", "created_at", "updated_at")
SELECT DISTINCT ON (LOWER("email"))
  "first_name",
  "last_name",
  "email",
  "phone",
  "resume_key",
  "applied_at" as "created_at",
  "updated_at"
FROM "candidates"
ORDER BY LOWER("email"), "applied_at" DESC
ON CONFLICT ("email") DO NOTHING;--> statement-breakpoint
-- Link existing candidates to their newly created candidate_profile
UPDATE "candidates" c
SET "candidate_profile_id" = cp."id"
FROM "candidate_profiles" cp
WHERE LOWER(c."email") = LOWER(cp."email")
  AND c."candidate_profile_id" IS NULL;