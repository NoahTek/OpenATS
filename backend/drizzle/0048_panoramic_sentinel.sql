ALTER TABLE "candidates" DROP CONSTRAINT "candidates_candidate_profile_id_candidate_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_candidate_profile_id_candidate_profiles_id_fk" FOREIGN KEY ("candidate_profile_id") REFERENCES "public"."candidate_profiles"("id") ON DELETE set null ON UPDATE no action;