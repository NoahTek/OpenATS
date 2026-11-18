import { describe, expect, it } from "vitest";
import {
  deduceNameFromFilename,
  cleanCandidateName,
  isValidCandidateName,
  toTitleCase,
  inferCandidateName,
  splitFullName,
  isInitial,
} from "../../src/modules/talent-pool/candidate-name";

describe("candidate-name", () => {
  describe("toTitleCase", () => {
    it("handles standard names", () => {
      expect(toTitleCase("ajay bhatia")).toBe("Ajay Bhatia");
      expect(toTitleCase("MANOJ REGAR")).toBe("Manoj Regar");
    });

    it("preserves single-letter initials with or without dots", () => {
      expect(toTitleCase("JAYABHARATHI K")).toBe("Jayabharathi K");
      expect(toTitleCase("sivanesan k.")).toBe("Sivanesan K.");
      expect(toTitleCase("m karthik")).toBe("M Karthik");
    });
  });

  describe("isInitial", () => {
    it("detects single letter initials with or without dot", () => {
      expect(isInitial("R")).toBe(true);
      expect(isInitial("R.")).toBe(true);
      expect(isInitial("M.")).toBe(true);
      expect(isInitial("K")).toBe(true);
      expect(isInitial("V.K.")).toBe(true);
      expect(isInitial("VK")).toBe(true);
    });

    it("does not treat full names as initials", () => {
      expect(isInitial("Arunkumar")).toBe(false);
      expect(isInitial("Karthik")).toBe(false);
      expect(isInitial("Ed")).toBe(false);
      expect(isInitial("Al")).toBe(false);
      expect(isInitial("John")).toBe(false);
    });
  });

  describe("splitFullName", () => {
    it("moves leading initials to lastName so an initial is never firstName", () => {
      expect(splitFullName("R. Arunkumar")).toEqual({
        firstName: "Arunkumar",
        lastName: "R.",
      });
      expect(splitFullName("M. Karthik")).toEqual({
        firstName: "Karthik",
        lastName: "M.",
      });
      expect(splitFullName("M Karthik")).toEqual({
        firstName: "Karthik",
        lastName: "M",
      });
      expect(splitFullName("V. K. Prasath")).toEqual({
        firstName: "Prasath",
        lastName: "V. K.",
      });
      expect(splitFullName("C. Sathish Kumar")).toEqual({
        firstName: "Sathish",
        lastName: "Kumar C.",
      });
    });

    it("keeps trailing initials in lastName", () => {
      expect(splitFullName("Jayabharathi K")).toEqual({
        firstName: "Jayabharathi",
        lastName: "K",
      });
      expect(splitFullName("Balakumar S.")).toEqual({
        firstName: "Balakumar",
        lastName: "S.",
      });
      expect(splitFullName("Sivanesan K")).toEqual({
        firstName: "Sivanesan",
        lastName: "K",
      });
    });

    it("handles standard multi-word names", () => {
      expect(splitFullName("Ajay Bhatia")).toEqual({
        firstName: "Ajay",
        lastName: "Bhatia",
      });
      expect(splitFullName("Manoj Regar")).toEqual({
        firstName: "Manoj",
        lastName: "Regar",
      });
    });

    it("handles single-word names", () => {
      expect(splitFullName("Jayabharathi")).toEqual({
        firstName: "Jayabharathi",
        lastName: "",
      });
      expect(splitFullName("")).toEqual({
        firstName: "",
        lastName: "",
      });
    });
  });

  describe("deduceNameFromFilename", () => {
    it("strips .doc, .docx, and .pdf extensions", () => {
      expect(deduceNameFromFilename("Jayabharathi.docx")).toEqual({
        firstName: "Jayabharathi",
        lastName: "",
      });
      expect(deduceNameFromFilename("Ajay Bhatia.pdf")).toEqual({
        firstName: "Ajay",
        lastName: "Bhatia",
      });
    });

    it("strips Naukri prefix and bracketed experience tags", () => {
      expect(deduceNameFromFilename("Naukri_SivanesanK[8y_0m].doc")).toEqual({
        firstName: "Sivanesan",
        lastName: "K",
      });
      expect(deduceNameFromFilename("Naukri_BalaKumar[5y_0m].doc")).toEqual({
        firstName: "Bala",
        lastName: "Kumar",
      });
      expect(deduceNameFromFilename("Naukri_AkashKachhawa[5y_6m].docx")).toEqual({
        firstName: "Akash",
        lastName: "Kachhawa",
      });
    });

    it("strips common noise tokens like Updated, CV, Resume and moves leading initials to lastName", () => {
      expect(deduceNameFromFilename("M Karthik Updated CV.docx")).toEqual({
        firstName: "Karthik",
        lastName: "M",
      });
      expect(deduceNameFromFilename("John_Doe_Resume_2024.pdf")).toEqual({
        firstName: "John",
        lastName: "Doe",
      });
    });
  });

  describe("cleanCandidateName", () => {
    it("extracts name before pipe or bullet delimiters", () => {
      expect(
        cleanCandidateName(
          "Jayabharathi K | Phone: 9952441966 | Email: jbgopinath@gmail.com",
        ),
      ).toBe("Jayabharathi K");

      expect(
        cleanCandidateName("John Doe • john@example.com • 123-456-7890"),
      ).toBe("John Doe");
    });

    it("normalizes dot initials", () => {
      expect(
        cleanCandidateName("BALAKUMAR.S\t\tbalakumarsforce@gmail.com"),
      ).toBe("BALAKUMAR S.");
      expect(cleanCandidateName("K.Sivanesan")).toBe("K. Sivanesan");
    });

    it("strips titles like Mrs, Mr, Dr", () => {
      expect(cleanCandidateName("Mrs. Jayabharathi K")).toBe("Jayabharathi K");
      expect(cleanCandidateName("Dr. Jane Smith")).toBe("Jane Smith");
    });
  });

  describe("inferCandidateName", () => {
    it("extracts name from header line with contact details", () => {
      const text = `
RESUME

Jayabharathi K | Phone: 9952441966 | Email: jbgopinath@gmail.com

Career objectives:
To build my career in a progressive organization...
`;
      const res = inferCandidateName(text, "Jayabharathi.docx");
      expect(res).toEqual({
        firstName: "Jayabharathi",
        lastName: "K",
      });
    });

    it("extracts name with dot initial and attached email", () => {
      const text = `
BALAKUMAR.S \t balakumarsforce@gmail.com
+91-8248420367

10/8, 6TH STREET THIRUNAGAR,
VADAPALANI, CHENNAI . PIN: 600026
TAMILNADU,
INDIA.
`;
      const res = inferCandidateName(text, "Naukri_BalaKumar[5y_0m].doc");
      expect(res.firstName).toBe("Balakumar");
      expect(res.lastName).toMatch(/^S\.?$/);
    });

    it("extracts name from explicit Name: label", () => {
      const text = `
PERSONAL DETAILS
Name : Sivanesan K
Gender : Male
Marital Status : Married
`;
      const res = inferCandidateName(text, "Naukri_SivanesanK[8y_0m].doc");
      expect(res).toEqual({
        firstName: "Sivanesan",
        lastName: "K",
      });
    });

    it("falls back cleanly to sanitized filename when text is empty", () => {
      const res = inferCandidateName("", "Naukri_SivanesanK[8y_0m].doc");
      expect(res).toEqual({
        firstName: "Sivanesan",
        lastName: "K",
      });
    });

    it("moves leading initials to lastName when extracted from resume text", () => {
      const text = `
R. ARUNKUMAR
Email: arunkumar@example.com
Phone: +91-9876543210
`;
      const res = inferCandidateName(text, "Arunkumar.pdf");
      expect(res).toEqual({
        firstName: "Arunkumar",
        lastName: "R.",
      });
    });
  });
});
