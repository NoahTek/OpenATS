import { Request, Response } from "express";
import { z } from "zod";
import { talentPoolService } from "./talent-pool.service";
import { splitSections } from "../candidate/cv-text/sections";
import { extractContacts } from "../candidate/cv-text/contacts";
import { detectFileType } from "../candidate/cv-text/detect";
import { resumeUploadService } from "../upload/resume-upload.service";
import { resumeContentDisposition } from "../candidate/resume-filename";
import { DuplicateApplicationError } from "../candidate/candidate.service";
import { r2Service } from "../../shared/services/r2.service";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";
import { inferCandidateName, deduceNameFromFilename } from "./candidate-name";

const createProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().max(50).optional().nullable(),
  linkedinUrl: z
    .string()
    .trim()
    .max(500)
    .transform((val) => {
      if (!val) return null;
      if (!/^https?:\/\//i.test(val)) return `https://${val}`;
      return val;
    })
    .pipe(z.string().url("Invalid LinkedIn URL").nullable())
    .optional()
    .nullable(),
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
    if (error instanceof DuplicateApplicationError) {
      res.status(409).json({ error: "This candidate has already been submitted to this job" });
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
};



import { extractCvText } from "../candidate/cv-text";
import AdmZip from "adm-zip";

const bulkCreateProfileItemSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().max(100).default(""),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().max(50).optional().nullable(),
  linkedinUrl: z
    .string()
    .trim()
    .max(500)
    .transform((val) => {
      if (!val) return null;
      if (!/^https?:\/\//i.test(val)) return `https://${val}`;
      return val;
    })
    .pipe(z.string().url("Invalid LinkedIn URL").nullable())
    .optional()
    .nullable(),
  source: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  resumeUploadId: z.string().uuid().optional().nullable(),
  updateIfDuplicate: z.boolean().optional().default(false),
});

export const MAX_BULK_PARSE_ITEMS = 50;
export const MAX_ENTRY_UNCOMPRESSED_BYTES = 10 * 1024 * 1024; // 10MB per resume file
export const MAX_TOTAL_UNCOMPRESSED_BYTES = 100 * 1024 * 1024; // 100MB total per zip archive
export const MAX_ZIP_ENTRIES_SCANNED = 200; // Cap total entries scanned to prevent zip bombs

export const bulkCreateSchema = z.object({
  profiles: z
    .array(bulkCreateProfileItemSchema)
    .min(1, "At least one candidate profile is required")
    .max(MAX_BULK_PARSE_ITEMS, `Maximum ${MAX_BULK_PARSE_ITEMS} candidate profiles per bulk request`),
  jobId: z.number().int().positive().optional().nullable(),
});

export const parseResumeForTalentPool = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No resume file uploaded" });
      return;
    }

    const fileType = detectFileType(req.file.buffer);
    if (!fileType) {
      res.status(400).json({ error: "Only PDF, DOCX, and DOC files are supported" });
      return;
    }

    // 1. Upload to storage and create uploadId
    const key = await r2Service.uploadResume(req.file);
    const uploadId = await resumeUploadService.create(key).catch(async (error) => {
      await r2Service.deleteResume(key).catch(() => undefined);
      throw error;
    });

    // 2. Extract text from resume
    let text = "";
    try {
      const extracted = await extractCvText(req.file.buffer);
      text = extracted.text;
    } catch (err) {
      logger.warn(`Failed to extract text from uploaded resume: ${getErrorMessage(err)}`);
    }

    // 3. Extract contacts and infer name
    const sections = splitSections(text);
    const contacts = extractContacts(text, sections);
    const name = inferCandidateName(text, req.file.originalname);

    const linkedinUrl = contacts.links.find(
      (l) => l.includes("linkedin.com") || l.startsWith("linkedin.com"),
    );

    res.status(200).json({
      data: {
        uploadId,
        firstName: name.firstName,
        lastName: name.lastName,
        email: contacts.emails[0] ?? "",
        phone: contacts.phones[0]?.replace(/\s+/g, " ").trim() ?? "",
        linkedinUrl: linkedinUrl
          ? linkedinUrl.startsWith("http")
            ? linkedinUrl
            : `https://${linkedinUrl}`
          : "",
      },
    });
  } catch (error) {
    logger.error(`Failed to parse resume: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to parse resume" });
  }
};

interface ProcessedFileItem {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export const bulkParseResumes = async (req: Request, res: Response) => {
  try {
    const rawFiles = (req.files as Express.Multer.File[]) ?? [];
    if (rawFiles.length === 0 && !req.file) {
      res.status(400).json({ error: "No files or zip uploaded" });
      return;
    }

    const allUploaded = req.file ? [req.file, ...rawFiles] : rawFiles;
    const itemsToProcess: ProcessedFileItem[] = [];
    let totalUncompressedBytes = 0;

    for (const f of allUploaded) {
      if (itemsToProcess.length >= MAX_BULK_PARSE_ITEMS) break;

      const isZip =
        f.originalname.toLowerCase().endsWith(".zip") ||
        f.mimetype === "application/zip" ||
        f.mimetype === "application/x-zip-compressed" ||
        (f.buffer.length > 4 && f.buffer[0] === 0x50 && f.buffer[1] === 0x4b && f.buffer[2] === 0x03 && f.buffer[3] === 0x04 && !f.buffer.includes("word/document.xml"));

      if (isZip) {
        try {
          const zip = new AdmZip(f.buffer);
          const zipEntries = zip.getEntries();
          let scannedEntries = 0;

          for (const entry of zipEntries) {
            if (itemsToProcess.length >= MAX_BULK_PARSE_ITEMS) break;
            scannedEntries++;
            if (scannedEntries > MAX_ZIP_ENTRIES_SCANNED) {
              logger.warn(`Bulk parse: exceeded max zip entries scanned (${MAX_ZIP_ENTRIES_SCANNED}) in ${f.originalname}`);
              break;
            }

            if (entry.isDirectory) continue;
            const entryName = entry.entryName;
            if (entryName.startsWith("__MACOSX") || entryName.includes("/.") || entryName.startsWith(".")) {
              continue;
            }
            const lowerName = entryName.toLowerCase();
            if (lowerName.endsWith(".pdf") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
              if (entry.header.size > MAX_ENTRY_UNCOMPRESSED_BYTES) {
                logger.warn(`Skipping zip entry ${entryName} exceeding max uncompressed size: ${entry.header.size} bytes`);
                continue;
              }
              if (totalUncompressedBytes + entry.header.size > MAX_TOTAL_UNCOMPRESSED_BYTES) {
                logger.warn(`Bulk parse: archive exceeded total uncompressed size limit (${MAX_TOTAL_UNCOMPRESSED_BYTES} bytes)`);
                break;
              }

              const entryBuffer = entry.getData();
              if (entryBuffer.length > MAX_ENTRY_UNCOMPRESSED_BYTES) {
                logger.warn(`Skipping zip entry ${entryName} with actual decompressed size exceeding max: ${entryBuffer.length} bytes`);
                continue;
              }

              totalUncompressedBytes += entryBuffer.length;
              const baseName = entryName.split("/").pop() || entryName;
              itemsToProcess.push({
                buffer: entryBuffer,
                originalname: baseName,
                mimetype: lowerName.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
              });
            }
          }
        } catch (zipErr) {
          logger.warn(`Failed to decompress zip ${f.originalname}: ${getErrorMessage(zipErr)}`);
        }
      } else {
        const lowerName = f.originalname.toLowerCase();
        if (lowerName.endsWith(".pdf") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
          if (f.buffer.length > MAX_ENTRY_UNCOMPRESSED_BYTES) {
            logger.warn(`Skipping uploaded file ${f.originalname} exceeding max size: ${f.buffer.length} bytes`);
            continue;
          }
          itemsToProcess.push({
            buffer: f.buffer,
            originalname: f.originalname,
            mimetype: f.mimetype,
          });
        }
      }
    }

    if (itemsToProcess.length === 0) {
      res.status(400).json({ error: "No valid resume files found (supported: PDF, DOCX, DOC)" });
      return;
    }

    // Process up to 50 items
    const boundedItems = itemsToProcess.slice(0, MAX_BULK_PARSE_ITEMS);
    const parsedResults: Array<{
      id: string;
      fileName: string;
      uploadId: string | null;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      linkedinUrl: string;
      status: "ready" | "duplicate" | "missing_email" | "error";
      errorMessage?: string;
    }> = [];

    const foundEmails: string[] = [];

    for (let i = 0; i < boundedItems.length; i++) {
      const item = boundedItems[i]!;
      const rowId = `item-${i}-${Date.now()}`;

      try {
        const fileType = detectFileType(item.buffer);
        if (!fileType) {
          parsedResults.push({
            id: rowId,
            fileName: item.originalname,
            uploadId: null,
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            linkedinUrl: "",
            status: "error",
            errorMessage: "Unsupported document format",
          });
          continue;
        }

        // Upload resume to R2
        const multerLike: Express.Multer.File = {
          buffer: item.buffer,
          originalname: item.originalname,
          mimetype: item.mimetype,
          fieldname: "file",
          encoding: "7bit",
          size: item.buffer.length,
          stream: null as unknown as Express.Multer.File["stream"],
          destination: "",
          filename: item.originalname,
          path: "",
        };

        const key = await r2Service.uploadResume(multerLike);
        const uploadId = await resumeUploadService.create(key).catch(async (error) => {
          await r2Service.deleteResume(key).catch(() => undefined);
          throw error;
        });

        // Extract CV text
        let text = "";
        try {
          const cvResult = await extractCvText(item.buffer);
          text = cvResult.text;
        } catch (err) {
          logger.warn(`Failed to extract text from ${item.originalname}: ${getErrorMessage(err)}`);
        }

        const sections = splitSections(text);
        const contacts = extractContacts(text, sections);
        const name = inferCandidateName(text, item.originalname);

        const email = contacts.emails[0]?.trim().toLowerCase() ?? "";
        if (email) foundEmails.push(email);

        const linkedinUrl = contacts.links.find(
          (l) => l.includes("linkedin.com") || l.startsWith("linkedin.com"),
        );

        const fallback = deduceNameFromFilename(item.originalname);
        parsedResults.push({
          id: rowId,
          fileName: item.originalname,
          uploadId,
          firstName: name.firstName || fallback.firstName || "Candidate",
          lastName: name.firstName ? name.lastName : fallback.lastName,
          email,
          phone: contacts.phones[0]?.replace(/\s+/g, " ").trim() ?? "",
          linkedinUrl: linkedinUrl
            ? linkedinUrl.startsWith("http")
              ? linkedinUrl
              : `https://${linkedinUrl}`
            : "",
          status: email ? "ready" : "missing_email",
        });
      } catch (err) {
        logger.error(`Bulk parse error for ${item.originalname}: ${getErrorMessage(err)}`);
        parsedResults.push({
          id: rowId,
          fileName: item.originalname,
          uploadId: null,
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          linkedinUrl: "",
          status: "error",
          errorMessage: getErrorMessage(err),
        });
      }
    }

    // Check existing emails in database
    const existingEmails = await talentPoolService.checkExistingEmails(foundEmails);

    // Update status to duplicate if already exists in talent pool
    for (const r of parsedResults) {
      if (r.status === "ready" && existingEmails.has(r.email.toLowerCase())) {
        r.status = "duplicate";
      }
    }

    res.status(200).json({ data: parsedResults });
  } catch (error) {
    logger.error(`Failed to bulk parse resumes: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to bulk parse resumes" });
  }
};

export const bulkCreateTalentPoolProfiles = async (req: Request, res: Response) => {
  try {
    const validated = bulkCreateSchema.parse(req.body);
    const userId = req.user?.id ? Number(req.user.id) : null;

    const profilesWithUser = validated.profiles.map((p) => ({
      ...p,
      createdBy: userId,
    }));

    const result = await talentPoolService.bulkCreateProfiles(
      profilesWithUser,
      validated.jobId ?? undefined,
    );

    res.status(201).json({
      message: `Bulk ingest complete: ${result.created} created, ${result.updated} updated, ${result.submitted} submitted to job`,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    logger.error(`Failed to bulk create profiles: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to ingest candidate profiles" });
  }
};

export const getTalentPoolProfileResume = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid profile ID" });
      return;
    }

    const file = await talentPoolService.getResumeFile(id);
    if (!file || !file.resumeKey) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    const resume = await r2Service.getResume(file.resumeKey);
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    let contentType = "application/pdf";
    let ext = "pdf";
    const lowerKey = file.resumeKey.toLowerCase();
    if (lowerKey.endsWith(".docx")) {
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      ext = "docx";
    } else if (lowerKey.endsWith(".doc")) {
      contentType = "application/msword";
      ext = "doc";
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      resumeContentDisposition(file.firstName, file.lastName, ext),
    );
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(resume);
  } catch (error) {
    logger.error(
      `Failed to stream talent pool resume id=${req.params.id}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to load resume" });
  }
};
