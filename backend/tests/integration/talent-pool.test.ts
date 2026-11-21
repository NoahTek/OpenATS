import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import request from "supertest";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});

const requestResumeDeletion = vi.fn(async (_keys: Array<string | null | undefined>) => undefined);
vi.mock("../../src/queues/resume-delete/queue", () => ({
  requestResumeDeletion: (keys: Array<string | null | undefined>) => requestResumeDeletion(keys),
}));

import app from "../../src/app";
import { db } from "../../src/db";
import { company } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobHiringTeam, jobPipelineStages } from "../../src/db/schema/pipeline";
import { candidateProfiles, candidateProfileCvText, candidates } from "../../src/db/schema/candidates";
import { users } from "../../src/db/schema/users";
import { initTestKeys, bearer } from "../helpers/jwt";

const SUFFIX = `tpooltest${Date.now()}`;
let managerAuth: string;
let interviewerAuth: string;
const userIds: number[] = [];
let companyId: number;
let jobId: number;
let createdProfileId: number;

const api = (auth: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set("Authorization", auth),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set("Authorization", auth).send(body),
  patch: (path: string, body: object = {}) => request(app).patch(`/api${path}`).set("Authorization", auth).send(body),
  delete: (path: string) => request(app).delete(`/api${path}`).set("Authorization", auth),
});

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db
    .insert(company)
    .values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` })
    .returning();
  companyId = co!.id;

  const mgr = await bearer({ email: `mgr.${SUFFIX}@example.test`, role: "hiring_manager" });
  managerAuth = mgr.authorization;
  userIds.push(mgr.user.id);

  const int = await bearer({ email: `int.${SUFFIX}@example.test`, role: "interviewer" });
  interviewerAuth = int.authorization;
  userIds.push(int.user.id);

  const [j] = await db
    .insert(jobs)
    .values({
      slug: `job-${SUFFIX}`,
      title: `Job ${SUFFIX}`,
      employmentType: "full_time",
      status: "published",
      createdBy: mgr.user.id,
    })
    .returning();
  jobId = j!.id;

  await db.insert(jobHiringTeam).values({ jobId, userId: mgr.user.id });

  await db
    .insert(jobPipelineStages)
    .values({
      jobId,
      name: "Applied",
      position: 1,
    });
});

afterAll(async () => {
  if (createdProfileId) {
    await db.delete(candidateProfiles).where(eq(candidateProfiles.id, createdProfileId));
  }
  if (jobId) {
    await db.delete(candidates).where(eq(candidates.jobId, jobId));
    await db.delete(jobPipelineStages).where(eq(jobPipelineStages.jobId, jobId));
    await db.delete(jobHiringTeam).where(eq(jobHiringTeam.jobId, jobId));
    await db.delete(jobs).where(eq(jobs.id, jobId));
  }
  if (companyId) {
    await db.delete(company).where(eq(company.id, companyId));
  }
  if (userIds.length > 0) {
    for (const uid of userIds) {
      await db.delete(users).where(eq(users.id, uid));
    }
  }
});

describe("Talent Pool routes (/api/talent-pool)", () => {
  it("allows managers to source a candidate into talent pool", async () => {
    const res = await api(managerAuth).post("/talent-pool", {
      firstName: "Jane",
      lastName: "Doe",
      email: `jane.doe.${SUFFIX}@example.test`,
      phone: "+1234567890",
      linkedinUrl: "https://linkedin.com/in/janedoe",
      source: "LinkedIn",
      notes: "Strong candidate",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.firstName).toBe("Jane");
    expect(res.body.data.lastName).toBe("Doe");
    createdProfileId = res.body.data.id;
  });

  it("prevents interviewers from creating a talent pool profile", async () => {
    const res = await api(interviewerAuth).post("/talent-pool", {
      firstName: "John",
      lastName: "Smith",
      email: `john.smith.${SUFFIX}@example.test`,
    });
    expect(res.status).toBe(403);
  });

  it("lists talent pool profiles with pagination and search", async () => {
    const res = await api(interviewerAuth).get(`/talent-pool?search=Jane`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    const found = res.body.data.find((p: { id: number }) => p.id === createdProfileId);
    expect(found).toBeDefined();
    expect(found.cvSnippet).toBeNull();
  });

  it("returns highlighted cvSnippet when searching talent pool by CV content", async () => {
    await db.insert(candidateProfileCvText).values({
      profileId: createdProfileId,
      resumeKey: `resumes/${createdProfileId}.pdf`,
      status: "done",
      text: "Senior software engineer with 8 years of experience building distributed systems.",
      searchText: "Senior software engineer with 8 years of experience building distributed systems.",
    });

    const res = await api(interviewerAuth).get(`/talent-pool?search=engineer`);
    expect(res.status).toBe(200);
    const found = res.body.data.find((p: { id: number }) => p.id === createdProfileId);
    expect(found).toBeDefined();
    expect(found.cvSnippet).toBeDefined();
    expect(found.cvSnippet).toContain("[[engineer]]");

    await db.delete(candidateProfileCvText).where(eq(candidateProfileCvText.profileId, createdProfileId));
  });

  it("fetches a single talent pool profile with submissions", async () => {
    const res = await api(interviewerAuth).get(`/talent-pool/${createdProfileId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdProfileId);
    expect(Array.isArray(res.body.data.submissions)).toBe(true);
    expect(res.body.data.submissions.length).toBe(0);
  });

  it("updates a talent pool profile", async () => {
    const res = await api(managerAuth).patch(`/talent-pool/${createdProfileId}`, {
      notes: "Updated note after initial interview",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.notes).toBe("Updated note after initial interview");
  });

  it("submits a talent pool profile to a job", async () => {
    const res = await api(managerAuth).post(`/talent-pool/${createdProfileId}/submit`, {
      jobId,
      notes: "Submitting to backend engineering job",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.profileId).toBe(createdProfileId);
    expect(res.body.data.jobId).toBe(jobId);
    expect(res.body.data.applicationId).toBeDefined();

    // Verify candidate row is linked to profile
    const profileRes = await api(interviewerAuth).get(`/talent-pool/${createdProfileId}`);
    expect(profileRes.body.data.submissions.length).toBe(1);
    expect(profileRes.body.data.submissions[0].jobId).toBe(jobId);
  });

  it("deletes a talent pool profile", async () => {
    const res = await api(managerAuth).delete(`/talent-pool/${createdProfileId}`);
    expect(res.status).toBe(200);

    const getRes = await api(managerAuth).get(`/talent-pool/${createdProfileId}`);
    expect(getRes.status).toBe(404);
    createdProfileId = 0;
  });
});
