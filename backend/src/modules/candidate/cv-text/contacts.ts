import type { CvSection } from "./sections";

export interface CvContacts {
  emails: string[];
  phones: string[];
  links: string[];
}

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
const LINK = /(?:https?:\/\/|www\.)[^\s<>()]+|(?:linkedin\.com|github\.com|gitlab\.com|behance\.net)\/[^\s<>()]+/gi;
const PHONE = /(?:\+|00)?\d[\d \t().-]{7,18}\d/g;

const DOMAIN_FIXES: Record<string, string> = {
  "giail.coi": "gmail.com",
  "gmail.coi": "gmail.com",
  "gmaii.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
};

function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim();
  const atIdx = lower.lastIndexOf("@");
  if (atIdx === -1) return lower;
  const domain = lower.slice(atIdx + 1);
  if (DOMAIN_FIXES[domain]) {
    return lower.slice(0, atIdx + 1) + DOMAIN_FIXES[domain];
  }
  return lower;
}

function cleanPhone(raw: string): string {
  let p = raw.trim();
  // If digits are separated by spaces (e.g. '8 8 8 8 5 8 5 6 9 5'), collapse them
  if (/(?:\d\s+){5,}\d/.test(p)) {
    p = p.replace(/(?<=\d)\s+(?=\d)/g, "");
  }
  // Trim trailing space + short digit sequences if prefix is already a valid phone
  p = p.replace(/\s+\d{1,3}$/, "");
  return p;
}

const unique = (values: string[]) => [...new Set(values)].slice(0, 5);

/**
 * The email addresses, phone numbers and links written in the CV. Phone numbers are only taken
 * from the top of the CV: further down, a run of digits is far more often a date range or a
 * registration number than a phone.
 */
export function extractContacts(text: string, sections: CvSection[]): CvContacts {
  const header = sections[0]?.key === "header" ? sections[0].text : "";
  const top = header.length >= 40 ? header : text.slice(0, 600);

  const phones = (top.match(PHONE) ?? [])
    .map(cleanPhone)
    .filter((phone) => {
      const digits = phone.replace(/\D/g, "").length;
      return digits >= 9 && digits <= 15;
    });

  const emails = (text.match(EMAIL) ?? []).map(normalizeEmail);
  if (emails.length === 0) {
    const rawLines = text.split("\n");
    for (const line of rawLines) {
      if (line.includes("@")) {
        const deSpaced = line.replace(/\s+/g, "");
        const match = deSpaced.match(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/u);
        if (match?.[0]) {
          emails.push(normalizeEmail(match[0]));
        }
      }
    }
  }

  return {
    emails: unique(emails),
    phones: unique(phones),
    links: unique((text.match(LINK) ?? []).map((link) => link.replace(/[.,;]+$/, ""))),
  };
}
