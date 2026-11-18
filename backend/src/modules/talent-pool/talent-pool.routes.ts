import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import {
  getTalentPool,
  getTalentPoolProfileById,
  createTalentPoolProfile,
  updateTalentPoolProfile,
  submitProfileToJob,
  deleteTalentPoolProfile,
  parseResumeForTalentPool,
  bulkParseResumes,
  bulkCreateTalentPoolProfiles,
  getTalentPoolProfileResume,
} from "./talent-pool.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireManager } from "../../middlewares/role.middleware";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50mb limit for bulk / zip
  },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    if (
      name.endsWith(".pdf") ||
      name.endsWith(".docx") ||
      name.endsWith(".doc") ||
      name.endsWith(".zip") ||
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/zip" ||
      file.mimetype.includes("word")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, Word (.docx, .doc), and ZIP files are supported"));
    }
  },
});

function handleResumeUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "resume", maxCount: 1 },
  ])(req, res, (err: unknown) => {
    if (err) {
      const message =
        err instanceof Error ? err.message : "Invalid file upload";
      res.status(400).json({ error: message });
      return;
    }
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    req.file = files?.file?.[0] || files?.resume?.[0];
    next();
  });
}

function handleBulkResumeUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.array("files", 50)(req, res, (err: unknown) => {
    if (err) {
      const message =
        err instanceof Error ? err.message : "Invalid bulk file upload";
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}

const router: Router = Router();

router.use(authMiddleware);

router.get("/", getTalentPool);
router.get("/:id/resume", getTalentPoolProfileResume);
router.post("/parse-resume", requireManager, handleResumeUpload, parseResumeForTalentPool);
router.post("/bulk-parse", requireManager, handleBulkResumeUpload, bulkParseResumes);
router.post("/bulk-create", requireManager, bulkCreateTalentPoolProfiles);
router.get("/:id", getTalentPoolProfileById);
router.post("/", requireManager, createTalentPoolProfile);
router.patch("/:id", requireManager, updateTalentPoolProfile);
router.delete("/:id", requireManager, deleteTalentPoolProfile);
router.post("/:id/submit", requireManager, submitProfileToJob);

export default router;
