import "dotenv/config";
import { isNotNull } from "drizzle-orm";
import { db } from "./index";
import { candidateProfiles } from "./schema";
import { talentPoolService } from "../modules/talent-pool/talent-pool.service";

async function main() {
  const rows = await db
    .select({ id: candidateProfiles.id, resumeKey: candidateProfiles.resumeKey })
    .from(candidateProfiles)
    .where(isNotNull(candidateProfiles.resumeKey));

  console.log(`Found ${rows.length} candidate profile(s) with resumes.`);
  for (const row of rows) {
    if (row.resumeKey) {
      console.log(`Extracting CV for profile ${row.id} (${row.resumeKey})...`);
      await talentPoolService.extractAndSaveProfileCvText(row.id, row.resumeKey);
    }
  }
  console.log("Finished extracting CV text for talent pool profiles.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
