CREATE TABLE "candidate_profile_cv_text" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"resume_key" varchar(1000) NOT NULL,
	"status" "cv_text_status" DEFAULT 'pending' NOT NULL,
	"method" varchar(10),
	"file_type" varchar(10),
	"text" text,
	"search_text" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("candidate_profile_cv_text"."search_text", ''))) STORED,
	"page_count" integer,
	"char_count" integer,
	"sections" jsonb,
	"experience_years" numeric(4, 1),
	"education_level" varchar(20),
	"contacts" jsonb,
	"extractor_version" integer DEFAULT 1 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_profile_cv_text_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
ALTER TABLE "candidate_profile_cv_text" ADD CONSTRAINT "candidate_profile_cv_text_profile_id_candidate_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."candidate_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_candidate_profile_cv_text_search" ON "candidate_profile_cv_text" USING gin ("search_vector");