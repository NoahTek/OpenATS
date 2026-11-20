import { describe, it, expect, beforeEach, vi } from "vitest";

const deleteResume = vi.hoisted(() => vi.fn());
vi.mock("../../src/shared/services/r2.service", () => ({
  r2Service: { deleteResume },
}));

const selectMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("../../src/config/redis", () => ({
  createRedisConnection: () => ({}),
}));

let workerHandler: (job: { data: { resumeKey: string } }) => Promise<void>;

vi.mock("bullmq", () => ({
  Queue: class {},
  Worker: class {
    constructor(_queue: string, handler: (job: { data: { resumeKey: string } }) => Promise<void>) {
      workerHandler = handler;
    }
    on() {
      return this;
    }
  },
}));

import { startResumeDeleteWorker } from "../../src/queues/resume-delete/worker";

describe("resume delete worker reference check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startResumeDeleteWorker();
  });

  it("skips deletion when another candidate application still references the CV", async () => {
    // 1st query: candidates -> returns matching row
    // 2nd query: candidateProfiles -> empty
    selectMock
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: 10 }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      });

    await workerHandler({ data: { resumeKey: "resumes/shared-cv.pdf" } });

    expect(deleteResume).not.toHaveBeenCalled();
  });

  it("skips deletion when a talent pool profile still references the CV", async () => {
    // 1st query: candidates -> empty
    // 2nd query: candidateProfiles -> returns matching profile
    selectMock
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: 99 }]),
          }),
        }),
      });

    await workerHandler({ data: { resumeKey: "resumes/talent-pool-cv.pdf" } });

    expect(deleteResume).not.toHaveBeenCalled();
  });

  it("deletes the CV from storage when no candidate or profile references it", async () => {
    // Both queries return empty
    selectMock
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      });

    await workerHandler({ data: { resumeKey: "resumes/orphan-cv.pdf" } });

    expect(deleteResume).toHaveBeenCalledWith("resumes/orphan-cv.pdf");
  });
});
