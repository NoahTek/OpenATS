import { Router } from "express";
import {
  getTalentPool,
  getTalentPoolProfileById,
  createTalentPoolProfile,
  updateTalentPoolProfile,
  submitProfileToJob,
  deleteTalentPoolProfile,
} from "./talent-pool.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

router.use(authMiddleware);

router.get("/", getTalentPool);
router.get("/:id", getTalentPoolProfileById);
router.post("/", requireManager, createTalentPoolProfile);
router.patch("/:id", requireManager, updateTalentPoolProfile);
router.delete("/:id", requireManager, deleteTalentPoolProfile);
router.post("/:id/submit", requireManager, submitProfileToJob);

export default router;
