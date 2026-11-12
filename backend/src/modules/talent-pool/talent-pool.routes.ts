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
} from "./talent-pool.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireManager } from "../../middlewares/role.middleware";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10mb limit
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported"));
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

const router: Router = Router();

router.use(authMiddleware);

router.get("/", getTalentPool);
router.post("/parse-resume", requireManager, handleResumeUpload, parseResumeForTalentPool);
router.get("/:id", getTalentPoolProfileById);
router.post("/", requireManager, createTalentPoolProfile);
router.patch("/:id", requireManager, updateTalentPoolProfile);
router.delete("/:id", requireManager, deleteTalentPoolProfile);
router.post("/:id/submit", requireManager, submitProfileToJob);

export default router;
