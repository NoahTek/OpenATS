import { describe, it, expect, beforeEach, vi } from "vitest";

const selectMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/db", () => ({
  db: {
    select: selectMock,
    insert: vi.fn(),
  },
}));

vi.mock("../../src/modules/offer/offer.repository", () => ({
  offerRepository: {
    findByCandidateAndJob: vi.fn(),
  },
}));

vi.mock("../../src/modules/candidate/candidate-activity.service", () => ({
  candidateActivityService: {
    create: vi.fn(),
  },
}));

import { offerService } from "../../src/modules/offer/offer.service";

describe("offerService.create job validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws an error when the candidate belongs to a different job", async () => {
    // Candidate applied to jobId: 1
    selectMock.mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([{ id: 10, jobId: 1 }]),
      }),
    });

    await expect(
      offerService.create({
        candidateId: 10,
        jobId: 2, // Mismatched jobId!
        createdBy: 1,
      }),
    ).rejects.toThrow("Candidate does not belong to this job");
  });
});
