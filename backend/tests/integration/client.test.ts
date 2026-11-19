import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import request from "supertest";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});

import app from "../../src/app";
import { db } from "../../src/db";
import { clients, departments } from "../../src/db/schema/company";
import { users } from "../../src/db/schema/users";
import { initTestKeys, bearer } from "../helpers/jwt";

const SUFFIX = `clienttest${Date.now()}`;
let managerAuth: string;
let interviewerAuth: string;
const userIds: number[] = [];
let createdClientId: number;

const api = (auth: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set("Authorization", auth),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set("Authorization", auth).send(body),
  patch: (path: string, body: object = {}) => request(app).patch(`/api${path}`).set("Authorization", auth).send(body),
  delete: (path: string) => request(app).delete(`/api${path}`).set("Authorization", auth),
});

beforeAll(async () => {
  await initTestKeys();
  const mgr = await bearer({ email: `mgr.${SUFFIX}@example.test`, role: "hiring_manager" });
  managerAuth = mgr.authorization;
  userIds.push(mgr.user.id);

  const int = await bearer({ email: `int.${SUFFIX}@example.test`, role: "interviewer" });
  interviewerAuth = int.authorization;
  userIds.push(int.user.id);
});

afterAll(async () => {
  if (createdClientId) {
    await db.delete(clients).where(eq(clients.id, createdClientId));
  }
  if (userIds.length > 0) {
    for (const uid of userIds) {
      await db.delete(users).where(eq(users.id, uid));
    }
  }
});

describe("Client routes (/api/clients)", () => {
  it("allows managers to create a client", async () => {
    const res = await api(managerAuth).post("/clients", {
      name: `Acme Corp ${SUFFIX}`,
      email: `contact@acme.${SUFFIX}.test`,
      website: "https://acme.test",
      timeZone: "America/New_York",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe(`Acme Corp ${SUFFIX}`);
    expect(res.body.data.slug).toBeDefined();
    createdClientId = res.body.data.id;
  });

  it("prevents interviewers from creating a client", async () => {
    const res = await api(interviewerAuth).post("/clients", {
      name: `Forbidden Corp ${SUFFIX}`,
    });
    expect(res.status).toBe(403);
  });

  it("lists clients for authenticated users", async () => {
    const res = await api(interviewerAuth).get("/clients");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((c: { id: number }) => c.id === createdClientId);
    expect(found).toBeDefined();
  });

  it("retrieves a client by ID", async () => {
    const res = await api(interviewerAuth).get(`/clients/${createdClientId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdClientId);
    expect(res.body.data.name).toBe(`Acme Corp ${SUFFIX}`);
  });

  it("updates a client", async () => {
    const res = await api(managerAuth).patch(`/clients/${createdClientId}`, {
      description: "Updated client description",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe("Updated client description");
  });

  it("manages client departments", async () => {
    // Create department
    const createRes = await api(managerAuth).post(`/clients/${createdClientId}/departments`, {
      name: "Engineering",
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.name).toBe("Engineering");
    const deptId = createRes.body.data.id;

    // List departments
    const listRes = await api(interviewerAuth).get(`/clients/${createdClientId}/departments`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((d: { id: number }) => d.id === deptId)).toBe(true);

    // Update department
    const updateRes = await api(managerAuth).patch(`/clients/${createdClientId}/departments/${deptId}`, {
      name: "Core Engineering",
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe("Core Engineering");

    // Delete department
    const delRes = await api(managerAuth).delete(`/clients/${createdClientId}/departments/${deptId}`);
    expect(delRes.status).toBe(200);
  });

  it("deletes a client", async () => {
    const res = await api(managerAuth).delete(`/clients/${createdClientId}`);
    expect(res.status).toBe(200);

    const getRes = await api(managerAuth).get(`/clients/${createdClientId}`);
    expect(getRes.status).toBe(404);
    createdClientId = 0;
  });
});
