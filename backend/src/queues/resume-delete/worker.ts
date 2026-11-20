import { Worker } from "bullmq";
import { RESUME_DELETE_QUEUE, type ResumeDeleteJobData } from "./queue";
import { createRedisConnection } from "../../config/redis";
import { r2Service } from "../../shared/services/r2.service";
import logger from "../../utils/logger";
import { db } from "../../db";
import { candidateProfiles, candidates } from "../../db/schema";
import { eq } from "drizzle-orm";

export function startResumeDeleteWorker(): Worker<ResumeDeleteJobData> {
  const worker = new Worker<ResumeDeleteJobData>(
    RESUME_DELETE_QUEUE,
    async (job) => {
      const resumeKey = job.data.resumeKey;
      if (!resumeKey) return;

      // Do not erase a file that is still referenced by another candidate application
      // or by a talent pool profile (e.g. candidate was submitted from the talent pool).
      const [candidateRef] = await db
        .select({ id: candidates.id })
        .from(candidates)
        .where(eq(candidates.resumeKey, resumeKey))
        .limit(1);

      const [profileRef] = await db
        .select({ id: candidateProfiles.id })
        .from(candidateProfiles)
        .where(eq(candidateProfiles.resumeKey, resumeKey))
        .limit(1);

      if (candidateRef || profileRef) {
        logger.info(
          `[resume-delete] skipped ${resumeKey}: still in use (candidate=${candidateRef?.id ?? "none"}, profile=${profileRef?.id ?? "none"})`,
        );
        return;
      }

      // Deleting a file that is already gone succeeds, so a retry after a half-done attempt is safe.
      await r2Service.deleteResume(resumeKey);
      logger.info(`[resume-delete] erased ${resumeKey}`);
    },
    { connection: createRedisConnection(), concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    if (!job) return;
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
    logger.error(
      `[resume-delete] failed ${job.data.resumeKey} attempt=${job.attemptsMade}${exhausted ? " (gave up: delete this file by hand)" : ""}: ${err.message}`,
    );
  });

  worker.on("error", (err) => {
    logger.error(`[resume-delete] worker error: ${err.message}`);
  });

  return worker;
}
