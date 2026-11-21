import { describe, it, expect } from "vitest";
import {
  bulkCreateSchema,
  MAX_BULK_PARSE_ITEMS,
  MAX_ENTRY_UNCOMPRESSED_BYTES,
  MAX_TOTAL_UNCOMPRESSED_BYTES,
  MAX_ZIP_ENTRIES_SCANNED,
} from "../../src/modules/talent-pool/talent-pool.controller";

describe("Talent Pool Bulk Ingest Limits & Validation", () => {
  it("exports expected safety constants", () => {
    expect(MAX_BULK_PARSE_ITEMS).toBe(50);
    expect(MAX_ENTRY_UNCOMPRESSED_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_TOTAL_UNCOMPRESSED_BYTES).toBe(100 * 1024 * 1024);
    expect(MAX_ZIP_ENTRIES_SCANNED).toBe(200);
  });

  it("validates valid payload within limits", () => {
    const validPayload = {
      profiles: [
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          phone: "+1234567890",
        },
      ],
      jobId: 1,
    };
    const parsed = bulkCreateSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it("rejects empty profiles array", () => {
    const invalidPayload = {
      profiles: [],
      jobId: 1,
    };
    const parsed = bulkCreateSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });

  it("rejects payloads exceeding MAX_BULK_PARSE_ITEMS (50 profiles)", () => {
    const oversizedProfiles = Array.from({ length: 51 }, (_, i) => ({
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `user${i}@example.com`,
    }));

    const parsed = bulkCreateSchema.safeParse({ profiles: oversizedProfiles });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("Maximum 50");
    }
  });

  it("accepts payloads exactly at the limit of 50 profiles", () => {
    const boundaryProfiles = Array.from({ length: 50 }, (_, i) => ({
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `user${i}@example.com`,
    }));

    const parsed = bulkCreateSchema.safeParse({ profiles: boundaryProfiles });
    expect(parsed.success).toBe(true);
  });
});
