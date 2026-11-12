import { Request, Response } from "express";
import { z } from "zod";
import { talentPoolService } from "./talent-pool.service";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";

const createProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().max(50).optional().nullable(),
  linkedinUrl: z.string().url("Invalid LinkedIn URL").max(500).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  resumeUploadId: z.string().uuid().optional().nullable(),
});

const updateProfileSchema = createProfileSchema.omit({ resumeUploadId: true }).partial();

const submitToJobSchema = z.object({
  jobId: z.number().int().positive("Job ID is required"),
  notes: z.string().optional().nullable(),
});

export const getTalentPool = async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
    const search = req.query.search as string | undefined;
    const source = req.query.source as string | undefined;
    const minExperienceYears = req.query.minExperienceYears
      ? parseFloat(req.query.minExperienceYears as string)
      : undefined;

    const result = await talentPoolService.getAll({
      page,
      limit,
      search,
      source,
      minExperienceYears,
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error(`Failed to fetch talent pool: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch talent pool" });
  }
};

export const getTalentPoolProfileById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate profile ID" });
      return;
    }

    const profile = await talentPoolService.getById(id);
    if (!profile) {
      res.status(404).json({ error: "Candidate profile not found" });
      return;
    }

    res.status(200).json({ data: profile });
  } catch (error) {
    logger.error(`Failed to fetch candidate profile: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch candidate profile" });
  }
};

export const createTalentPoolProfile = async (req: Request, res: Response) => {
  try {
    const validated = createProfileSchema.parse(req.body);
    const userId = req.user?.id ? Number(req.user.id) : null;

    const profile = await talentPoolService.createProfile({
      ...validated,
      createdBy: userId,
    });

    res.status(201).json({ data: profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    logger.error(`Failed to create candidate profile: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to source candidate into talent pool" });
  }
};

export const updateTalentPoolProfile = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate profile ID" });
      return;
    }

    const validated = updateProfileSchema.parse(req.body);
    const updated = await talentPoolService.updateProfile(id, validated);
    if (!updated) {
      res.status(404).json({ error: "Candidate profile not found" });
      return;
    }

    res.status(200).json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    logger.error(`Failed to update candidate profile: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to update candidate profile" });
  }
};

export const submitProfileToJob = async (req: Request, res: Response) => {
  try {
    const profileId = parseInt(req.params.id as string, 10);
    if (isNaN(profileId)) {
      res.status(400).json({ error: "Invalid profile ID" });
      return;
    }

    const { jobId, notes } = submitToJobSchema.parse(req.body);

    const result = await talentPoolService.submitToJob({
      profileId,
      jobId,
      notes,
    });

    res.status(201).json({
      message: "Candidate successfully submitted to job",
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    logger.error(`Failed to submit candidate to job: ${getErrorMessage(error)}`);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const deleteTalentPoolProfile = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate profile ID" });
      return;
    }

    const deleted = await talentPoolService.deleteProfile(id);
    if (!deleted) {
      res.status(404).json({ error: "Candidate profile not found" });
      return;
    }

    res.status(200).json({ message: "Candidate deleted from talent pool" });
  } catch (error) {
    logger.error(`Failed to delete candidate profile: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to delete candidate profile" });
  }
};;
