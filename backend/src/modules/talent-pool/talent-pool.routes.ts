import { Router } from "express";
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
});

const router: Router = Router();

router.use(authMiddleware);

router.get("/", getTalentPool);
router.post("/parse-resume", requireManager, upload.single("file"), parseResumeForTalentPool);
router.get("/:id", getTalentPoolProfileById);
router.post("/", requireManager, createTalentPoolProfile);
router.patch("/:id", requireManager, updateTalentPoolProfile);
router.delete("/:id", requireManager, deleteTalentPoolProfile);
router.post("/:id/submit", requireManager, submitProfileToJob);

export default router;
