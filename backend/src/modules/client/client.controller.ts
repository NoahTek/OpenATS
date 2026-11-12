import { Request, Response } from "express";
import { z } from "zod";
import { clientService } from "./client.service";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";
import { isTimeZone } from "../../shared/services/time-zone";

const createClientSchema = z.object({
  name: z.string().trim().min(1, "Client company name is required").max(255),
  slug: z.string().trim().max(255).optional(),
  email: z.string().email("Invalid email").optional().nullable(),
  website: z.string().url("Invalid URL").max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().url("Invalid logo URL").max(1000).optional().nullable(),
  timeZone: z
    .string()
    .max(64)
    .refine(isTimeZone, "Invalid time zone")
    .optional(),
});

const updateClientSchema = createClientSchema.partial();

export const getClients = async (_req: Request, res: Response) => {
  try {
    const data = await clientService.getAll();
    res.status(200).json({ data });
  } catch (error) {
    logger.error(`Failed to fetch clients: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
};

export const getClientById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid client ID" });
      return;
    }

    const client = await clientService.getById(id);
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    res.status(200).json({ data: client });
  } catch (error) {
    logger.error(`Failed to fetch client: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch client" });
  }
};

export const createClient = async (req: Request, res: Response) => {
  try {
    const validated = createClientSchema.parse(req.body);
    const client = await clientService.create(validated);
    res.status(201).json({ data: client });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    logger.error(`Failed to create client: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to create client" });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid client ID" });
      return;
    }

    const validated = updateClientSchema.parse(req.body);
    const client = await clientService.update(id, validated);
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    res.status(200).json({ data: client });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    logger.error(`Failed to update client: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to update client" });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid client ID" });
      return;
    }

    const deleted = await clientService.delete(id);
    if (!deleted) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    res.status(200).json({ message: "Client deleted successfully" });
  } catch (error) {
    logger.error(`Failed to delete client: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to delete client" });
  }
};

const departmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required").max(255),
});

export const getClientDepartments = async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string, 10);
    if (isNaN(clientId)) {
      res.status(400).json({ error: "Invalid client ID" });
      return;
    }
    const data = await clientService.getDepartments(clientId);
    res.status(200).json({ data });
  } catch (error) {
    logger.error(`Failed to fetch client departments: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch client departments" });
  }
};

export const createClientDepartment = async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string, 10);
    if (isNaN(clientId)) {
      res.status(400).json({ error: "Invalid client ID" });
      return;
    }
    const validated = departmentSchema.parse(req.body);
    const department = await clientService.createDepartment(clientId, validated.name);
    res.status(201).json({ data: department });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    logger.error(`Failed to create client department: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to create client department" });
  }
};

export const updateClientDepartment = async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string, 10);
    const deptId = parseInt(req.params.deptId as string, 10);
    if (isNaN(clientId) || isNaN(deptId)) {
      res.status(400).json({ error: "Invalid IDs provided" });
      return;
    }
    const validated = departmentSchema.parse(req.body);
    const updated = await clientService.updateDepartment(clientId, deptId, validated.name);
    if (!updated) {
      res.status(404).json({ error: "Department not found" });
      return;
    }
    res.status(200).json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    logger.error(`Failed to update client department: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to update client department" });
  }
};

export const deleteClientDepartment = async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string, 10);
    const deptId = parseInt(req.params.deptId as string, 10);
    if (isNaN(clientId) || isNaN(deptId)) {
      res.status(400).json({ error: "Invalid IDs provided" });
      return;
    }
    const deleted = await clientService.deleteDepartment(clientId, deptId);
    if (!deleted) {
      res.status(404).json({ error: "Department not found" });
      return;
    }
    res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    logger.error(`Failed to delete client department: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to delete client department" });
  }
};
