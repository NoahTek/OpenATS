import { Router } from "express";
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientDepartments,
  createClientDepartment,
  updateClientDepartment,
  deleteClientDepartment,
} from "./client.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

router.use(authMiddleware);

router.get("/", getClients);
router.get("/:id", getClientById);
router.post("/", requireManager, createClient);
router.patch("/:id", requireManager, updateClient);
router.delete("/:id", requireManager, deleteClient);

router.get("/:id/departments", getClientDepartments);
router.post("/:id/departments", requireManager, createClientDepartment);
router.patch("/:id/departments/:deptId", requireManager, updateClientDepartment);
router.delete("/:id/departments/:deptId", requireManager, deleteClientDepartment);

export default router;
