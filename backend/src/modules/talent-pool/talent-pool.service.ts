import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  candidateProfiles,
  candidates,
  jobPipelineStages,
  jobs,
} from "../../db/schema";
import { candidateService } from "../candidate/candidate.service";
import { resumeUploadService } from "../upload/resume-upload.service";
import { requestResumeDeletion } from "../../queues/resume-delete/queue";
import logger from "../../utils/logger";
import { cleanObject as clean } from "../../utils/object.utils";

export type CreateTalentPoolProfileInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  linkedinUrl?: string | null;
  source?: string | null;
  notes?: string | null;
  resumeUploadId?: string | null;
  createdBy?: number | null;
};

export type UpdateTalentPoolProfileInput = Partial<
  Omit<CreateTalentPoolProfileInput, "resumeUploadId">
>;

export type TalentPoolFilters = {
  search?: string;
  minExperienceYears?: number;
  source?: string;
  page?: number;
  limit?: number;
};

export type SubmitToJobInput = {
  profileId: number;
  jobId: number;
  notes?: string | null;
};

export const talentPoolService = {
  /**
   * List talent pool candidate profiles with search (name, email, or CV text content)
   */
  async getAll(filters: TalentPoolFilters = {}) {
    const { page = 1, limit = 25, search, minExperienceYears, source } = filters;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (source) {
      conditions.push(eq(candidateProfiles.source, source));
    }

    if (search) {
      const searchNormalized = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          ilike(candidateProfiles.firstName, searchNormalized),
          ilike(candidateProfiles.lastName, searchNormalized),
          ilike(candidateProfiles.email, searchNormalized),
          sql`exists (
            select 1 from candidate_cv_text cvt
            join candidates c on c.id = cvt.candidate_id
            where c.candidate_profile_id = ${candidateProfiles.id}
              and cvt.search_vector @@ websearch_to_tsquery('english', ${search})
          )`,
        ),
      );
    }

    if (minExperienceYears !== undefined) {
      conditions.push(
        sql`exists (
          select 1 from candidate_cv_text cvt
          join candidates c on c.id = cvt.candidate_id
          where c.candidate_profile_id = ${candidateProfiles.id}
            and cvt.experience_years >= ${minExperienceYears}
        )`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [countRow]] = await Promise.all([
      db
        .select({
          id: candidateProfiles.id,
          firstName: candidateProfiles.firstName,
          lastName: candidateProfiles.lastName,
          email: candidateProfiles.email,
          phone: candidateProfiles.phone,
          linkedinUrl: candidateProfiles.linkedinUrl,
          source: candidateProfiles.source,
          notes: candidateProfiles.notes,
          hasResume: sql<boolean>`${candidateProfiles.resumeKey} is not null`.as("has_resume"),
          createdAt: candidateProfiles.createdAt,
          updatedAt: candidateProfiles.updatedAt,
          submissionCount: sql<number>`(
            select count(*)::int from candidates c where c.candidate_profile_id = "candidate_profiles"."id"
          )`.as("submission_count"),
        })
        .from(candidateProfiles)
        .where(whereClause)
        .orderBy(desc(candidateProfiles.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(candidateProfiles)
        .where(whereClause),
    ]);

    const total = countRow?.count ?? 0;

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  /**
   * Get a single talent pool profile by ID with its past and active job submissions
   */
  async getById(id: number) {
    const [profile] = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.id, id))
      .limit(1);

    if (!profile) return null;

    // Fetch all submissions of this profile across client jobs
    const submissions = await db
      .select({
        applicationId: candidates.id,
        jobId: candidates.jobId,
        jobTitle: jobs.title,
        clientId: jobs.clientId,
        status: candidates.status,
        currentStageId: candidates.currentStageId,
        stageName: jobPipelineStages.name,
        appliedAt: candidates.appliedAt,
        totalScore: candidates.totalScore,
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .leftJoin(
        jobPipelineStages,
        eq(candidates.currentStageId, jobPipelineStages.id),
      )
      .where(eq(candidates.candidateProfileId, id))
      .orderBy(desc(candidates.appliedAt));

    return {
      ...profile,
      submissions,
    };
  },

  /**
   * Directly source a candidate into the central talent pool (with optional CV upload)
   */
  async createProfile(input: CreateTalentPoolProfileInput) {
    const { resumeUploadId, ...fields } = input;

    return await db.transaction(async (tx) => {
      let resumeKey: string | null = null;
      if (resumeUploadId) {
        resumeKey = await resumeUploadService.claim(resumeUploadId, tx);
      }

      const [created] = await tx
        .insert(candidateProfiles)
        .values(
          clean({
            ...fields,
            resumeKey: resumeKey ?? undefined,
          }),
        )
        .returning();

      if (!created) {
        throw new Error("Failed to create candidate profile");
      }

      return created;
    });
  },

  /**
   * Update talent pool candidate profile information
   */
  async updateProfile(id: number, input: UpdateTalentPoolProfileInput) {
    const [updated] = await db
      .update(candidateProfiles)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(candidateProfiles.id, id))
      .returning();

    return updated ?? null;
  },

  /**
   * Submit an existing talent pool candidate to a client's job pipeline
   */
  async submitToJob(input: SubmitToJobInput) {
    const profile = await this.getById(input.profileId);
    if (!profile) {
      throw new Error("Candidate profile not found");
    }

    // Verify job exists
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, input.jobId))
      .limit(1);

    if (!job) {
      throw new Error("Job not found");
    }

    // Submit into candidate application pipeline via existing apply flow
    const application = await candidateService.apply(input.jobId, {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone ?? undefined,
    });

    // Ensure candidate row is linked back to the candidateProfile
    await db
      .update(candidates)
      .set({
        candidateProfileId: profile.id,
        resumeKey: profile.resumeKey,
      })
      .where(eq(candidates.id, application.id));

    return {
      applicationId: application.id,
      jobId: input.jobId,
      profileId: profile.id,
    };
  },

  /**
   * Delete candidate profile from the talent pool.
   * Cascades through candidates submissions and queues CV file deletion from storage.
   */
  async deleteProfile(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(candidateProfiles)
      .where(eq(candidateProfiles.id, id))
      .returning({ id: candidateProfiles.id, resumeKey: candidateProfiles.resumeKey });

    if (!deleted) return false;

    if (deleted.resumeKey) {
      await requestResumeDeletion([deleted.resumeKey]);
    }

    return true;
  },

  /**
   * Get resume file info for a talent pool profile.
   */
  async getResumeFile(id: number) {
    const [profile] = await db
      .select({
        id: candidateProfiles.id,
        resumeKey: candidateProfiles.resumeKey,
        firstName: candidateProfiles.firstName,
        lastName: candidateProfiles.lastName,
      })
      .from(candidateProfiles)
      .where(eq(candidateProfiles.id, id));

    return profile?.resumeKey ? profile : null;
  },

  /**
   * Check which emails from a given list already exist in the talent pool
   */
  async checkExistingEmails(emails: string[]): Promise<Set<string>> {
    if (emails.length === 0) return new Set();
    const normalized = emails.map((e) => e.trim().toLowerCase());
    const existing = await db
      .select({ email: candidateProfiles.email })
      .from(candidateProfiles)
      .where(sql`lower(${candidateProfiles.email}) in ${normalized}`);

    return new Set(existing.map((r) => r.email.toLowerCase()));
  },

  /**
   * Bulk create profiles in the talent pool, optionally submitting each to a job
   */
  async bulkCreateProfiles(
    profiles: Array<CreateTalentPoolProfileInput & { updateIfDuplicate?: boolean }>,
    jobId?: number,
  ): Promise<{
    created: number;
    updated: number;
    submitted: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    let createdCount = 0;
    let updatedCount = 0;
    let submittedCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const item of profiles) {
      const email = item.email.trim().toLowerCase();
      try {
        const [existing] = await db
          .select({ id: candidateProfiles.id, resumeKey: candidateProfiles.resumeKey })
          .from(candidateProfiles)
          .where(eq(candidateProfiles.email, email))
          .limit(1);

        let profileId: number;

        if (existing) {
          if (item.updateIfDuplicate) {
            await db.transaction(async (tx) => {
              let newResumeKey: string | null = null;
              if (item.resumeUploadId) {
                newResumeKey = await resumeUploadService.claim(item.resumeUploadId, tx);
              }
              await tx
                .update(candidateProfiles)
                .set(
                  clean({
                    firstName: item.firstName,
                    lastName: item.lastName,
                    phone: item.phone,
                    linkedinUrl: item.linkedinUrl,
                    source: item.source,
                    notes: item.notes,
                    resumeKey: newResumeKey ?? undefined,
                    updatedAt: new Date(),
                  }),
                )
                .where(eq(candidateProfiles.id, existing.id));
            });

            profileId = existing.id;
            updatedCount++;
          } else {
            // Skipped as duplicate
            continue;
          }
        } else {
          const newProfile = await this.createProfile(item);
          profileId = newProfile.id;
          createdCount++;
        }

        // If a target job was requested, submit candidate to the job
        if (jobId) {
          try {
            await this.submitToJob({ profileId, jobId });
            submittedCount++;
          } catch (subErr) {
            logger.warn(`Failed to submit bulk profile ${email} to job ${jobId}: ${(subErr as Error).message}`);
          }
        }
      } catch (err) {
        logger.error(`Failed to ingest profile ${email}: ${(err as Error).message}`);
        errors.push({ email, error: (err as Error).message });
      }
    }

    return {
      created: createdCount,
      updated: updatedCount,
      submitted: submittedCount,
      errors,
    };
  },
};
