/**
 * Candidate Name Extraction and Filename Sanitization for Talent Pool Ingestion.
 *
 * Employs a multi-tier heuristic strategy:
 * 1. Explicit name labels in text (e.g., "Name :", "Candidate Name :")
 * 2. Header parsing with delimiter awareness (|;•\t) and filename token anchoring
 * 3. General header scanning filtering out resume boilerplate and noise words
 * 4. Resilient filename fallback that strips portal prefixes, bracketed tags,
 *    and splits CamelCase tokens.
 */

const HEADER_NOISE_WORDS = new Set([
  "resume",
  "curriculum vitae",
  "curriculum",
  "vitae",
  "cv",
  "summary",
  "profile",
  "contact",
  "phone",
  "email",
  "address",
  "page",
  "portfolio",
  "career objective",
  "objective",
  "professional summary",
  "executive summary",
  "expertise",
  "responsibility",
  "responsibilities",
  "work experience",
  "experience",
  "education",
  "educational qualification",
  "academic qualification",
  "qualification",
  "qualifications",
  "naukri",
  "declaration",
  "personal details",
  "projects",
  "current designation",
  "current company",
  "current location",
  "functional area",
  "industry",
  "key skills",
  "professional certification",
  "certifications",
  "company",
  "institution",
  "passing",
  "percentage",
  "mobile",
  "completed",
  "designation",
  "location",
  "annual salary",
  "expected ctc",
  "notice period",
  "skills",
  "personal profile",
  "employment history",
  "about me",
]);

const DISALLOWED_NAME_WORDS = new Set([
  "limited",
  "ltd",
  "pvt",
  "securities",
  "bank",
  "banking",
  "advisory",
  "broking",
  "services",
  "solutions",
  "technology",
  "technologies",
  "university",
  "college",
  "school",
  "tamilnadu",
  "india",
  "street",
  "nagar",
  "sector",
  "house",
  "road",
  "apartment",
  "chawl",
  "option",
  "trading",
  "completed",
  "mobile",
  "financial",
  "current",
  "designation",
  "location",
  "annual",
  "salary",
  "degree",
  "passing",
  "percentage",
  "board",
  "marks",
  "grade",
  "examination",
  "course",
]);

const NAME_PREFIX_REGEX =
  /^\s*(?:name|candidate\s*name|full\s*name)\s*[-:]\s*([^\n\r,;]{2,50})/i;

const TITLE_PREFIX_REGEX = /^(?:mr|mrs|ms|dr|prof)\.?\s+/i;

/**
 * Normalizes words to Title Case, preserving single-letter initials and dotted initials.
 * e.g., "JAYABHARATHI K" -> "Jayabharathi K"
 * e.g., "BALAKUMAR.S" -> "Balakumar S."
 */
export function toTitleCase(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words
    .map((w) => {
      let cleanW = w;
      let hasDot = false;
      if (cleanW.endsWith(".")) {
        hasDot = true;
        cleanW = cleanW.slice(0, -1);
      }
      if (cleanW.length === 1) {
        return cleanW.toUpperCase() + (hasDot ? "." : "");
      }
      return cleanW.charAt(0).toUpperCase() + cleanW.slice(1).toLowerCase() + (hasDot ? "." : "");
    })
    .join(" ");
}

/**
 * Cleans a candidate name candidate string by removing HTML, headers,
 * contact delimiters, trailing contacts, and noise terms.
 */
export function cleanCandidateName(raw: string): string {
  let s = raw.replace(/<[^>]+>/g, " ");

  // Normalize dot initials: "BALAKUMAR.S" -> "BALAKUMAR S.", "K.Sivanesan" -> "K. Sivanesan"
  s = s.replace(/\b([a-zA-Z])\.([a-zA-Z]{2,})\b/g, "$1. $2");
  s = s.replace(/\b([a-zA-Z]{2,})\.([a-zA-Z])\b/g, "$1 $2.");
  s = s.trim().replace(/^[#* \t]+/, "");

  // If delimited by |, ;, •, or tabs (e.g. "Jayabharathi K | Phone: ..."), take the first segment
  const delimIdx = s.search(/[|;•\t]/);
  if (delimIdx !== -1) {
    s = s.slice(0, delimIdx);
  }

  // If email or http link is attached to the same line, strip from the last delimiter before it
  const atIdx = s.indexOf("@");
  if (atIdx !== -1) {
    const lastSpace = s.slice(0, atIdx).search(/[ \t|,;][^ \t|,;]*$/);
    s = lastSpace !== -1 ? s.slice(0, lastSpace) : "";
  }
  const httpIdx = s.toLowerCase().indexOf("http");
  if (httpIdx !== -1) {
    const lastSpace = s.slice(0, httpIdx).search(/[ \t|,;][^ \t|,;]*$/);
    s = lastSpace !== -1 ? s.slice(0, lastSpace) : "";
  }

  // Strip common resume labels and degree suffixes
  for (const kw of [
    "present address",
    "permanent address",
    "address",
    "email",
    "phone",
    "mobile",
    "contact",
    "dob",
    "curriculum",
    "resume",
    "m.com",
    "b.com",
    "b.e",
    "b.tech",
    "mba",
    "m.sc",
    "b.sc",
  ]) {
    const idx = s.toLowerCase().indexOf(kw);
    if (idx !== -1) {
      s = s.slice(0, idx);
    }
  }

  // Strip title prefixes like "Mr.", "Mrs.", "Ms."
  s = s.trim().replace(TITLE_PREFIX_REGEX, "");

  const rawWords = s.split(/\s+/).filter(Boolean);
  const validWords: string[] = [];

  for (const w of rawWords) {
    // If the word contains digits, stop name parsing
    if (/\d/.test(w)) break;

    // Strip punctuation at edges, preserving trailing dot for single-letter initials (e.g. "S.")
    let cleanWord = w.replace(/[^a-zA-Z\s.-]/g, "").replace(/^[-.–—:•*"'|#]+/, "");
    if (!(cleanWord.length === 2 && cleanWord.endsWith("."))) {
      cleanWord = cleanWord.replace(/[-.–—:•*"'|#]+$/, "");
    }
    if (!cleanWord || cleanWord === "-" || cleanWord === "–" || cleanWord === "—") continue;

    const lower = cleanWord.toLowerCase();
    if (
      lower === "no" ||
      lower === "no." ||
      lower === "flat" ||
      lower === "plot" ||
      lower === "door" ||
      lower === "street" ||
      lower === "road" ||
      lower === "nagar" ||
      lower === "sector" ||
      lower === "option" ||
      lower === "trading" ||
      lower === "nism" ||
      lower === "financial" ||
      lower === "current" ||
      lower === "designation" ||
      lower === "location"
    ) {
      break;
    }

    validWords.push(cleanWord);
  }

  return validWords.join(" ");
}

/**
 * Validates whether a cleaned string looks like a legitimate candidate name.
 */
export function isValidCandidateName(val: string): boolean {
  if (val.length < 2 || val.length > 40) return false;

  const lower = val.toLowerCase();
  for (const noise of HEADER_NOISE_WORDS) {
    if (lower === noise || lower.startsWith(noise + " ") || lower.endsWith(" " + noise)) {
      return false;
    }
  }

  for (const prep of ["of ", "the ", "and ", "for ", "in ", "at ", "to "]) {
    if (lower.startsWith(prep)) return false;
  }

  const words = val.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 4) return false;

  for (const dw of DISALLOWED_NAME_WORDS) {
    if (words.some((w) => w.toLowerCase() === dw)) {
      return false;
    }
  }

  return /[a-zA-Z]/.test(val);
}

/**
 * Deduce candidate name from filename fallback.
 * Cleans portal prefixes (Naukri_), brackets ([8y_0m]), extensions (.doc, .docx, .pdf),
 * and splits CamelCase (SivanesanK -> Sivanesan K).
 */
export function deduceNameFromFilename(filename: string): { firstName: string; lastName: string } {
  if (!filename) return { firstName: "", lastName: "" };

  const base = filename.split(/[/\\]/).pop() || filename;
  // Strip any file extension (.pdf, .docx, .doc, etc.)
  let stem = base.replace(/\.[^/.]+$/, "");

  // Strip job portal prefixes
  stem = stem.replace(/^(?:naukri|indeed|monster|linkedin)[-_ ]+/i, "");

  // Strip bracketed experience annotations (e.g. [8y_0m], [5y 0m])
  stem = stem.replace(/\[.*?\]/g, " ");

  // CamelCase splitting (e.g. "SivanesanK" -> "Sivanesan K", "BalaKumar" -> "Bala Kumar")
  stem = stem.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Replace delimiters with spaces
  stem = stem.replace(/[_\-.]+/g, " ");

  const noiseTokens = new Set([
    "resume",
    "cv",
    "draft",
    "final",
    "v1",
    "v2",
    "v3",
    "updated",
    "naukri",
    "curriculum",
    "vitae",
    "profile",
    "latest",
    "new",
    "doc",
    "docx",
    "pdf",
  ]);

  const words = stem.split(/\s+/).filter(Boolean);
  const filtered: string[] = [];

  for (const w of words) {
    const lower = w.toLowerCase();
    if (noiseTokens.has(lower) || lower.includes("gmaildotcom") || lower.includes("@")) {
      continue;
    }
    // Skip tokens containing numbers (e.g. "8y", "0m", "2024")
    if (/\d/.test(w)) continue;

    filtered.push(w);
  }

  if (filtered.length === 0) {
    return { firstName: "", lastName: "" };
  }

  const titleCased = toTitleCase(filtered.join(" "));
  return splitFullName(titleCased);
}

/**
 * Determines whether a name token is an initial rather than a given name.
 * e.g., "R", "R.", "M", "M.", "V.K.", "VK" -> true
 * e.g., "Ed", "Al", "Karthik", "John" -> false
 */
export function isInitial(word: string): boolean {
  const clean = word.trim();
  // Single letter with optional dot, e.g. "R", "R.", "M", "M."
  if (/^[a-zA-Z]\.?$/.test(clean)) return true;
  // Multiple dotted letters, e.g. "V.K.", "V.K", "A.B."
  if (/^(?:[a-zA-Z]\.){1,}[a-zA-Z]?\.?$/.test(clean)) return true;
  // All uppercase 2 letters like "VK"
  if (/^[A-Z]{2}$/.test(clean)) return true;
  return false;
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };

  // If the leading part(s) are initials (e.g. "R. Arunkumar" or "M. Karthik"),
  // an initial is never the First Name. Move the initial(s) into the Last Name.
  if (isInitial(parts[0]!)) {
    const leadingInitials: string[] = [];
    let i = 0;
    while (i < parts.length && isInitial(parts[i]!)) {
      leadingInitials.push(parts[i]!);
      i++;
    }

    const remainingNames = parts.slice(i);
    if (remainingNames.length > 0) {
      const firstName = remainingNames[0]!;
      const otherNames = remainingNames.slice(1);
      const lastName = [...otherNames, ...leadingInitials].join(" ");
      return { firstName, lastName };
    }
  }

  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Infer candidate name using multi-tier heuristics:
 * 1. Explicit name label in text
 * 2. Filename token anchored matching against top 15 lines
 * 3. General header scan for clean name
 * 4. Sanitized filename fallback
 */
export function inferCandidateName(
  text: string,
  filename?: string,
): { firstName: string; lastName: string } {
  const rawLines = text.split("\n");

  // Tier 1: Check explicit "Name :" or "Candidate Name :" label in the text
  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    const match = trimmed.match(NAME_PREFIX_REGEX);
    if (match && match[1]) {
      const val = cleanCandidateName(match[1]);
      if (isValidCandidateName(val)) {
        return splitFullName(toTitleCase(val));
      }
    }
  }

  // Pre-process non-empty lines, splitting wide multi-column gaps
  const lines: string[] = [];
  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    const wideSpaceIdx = rawLine.indexOf("      ");
    if (wideSpaceIdx !== -1) {
      const rightPart = rawLine.slice(wideSpaceIdx).trim();
      if (!rightPart.startsWith(":") && !rightPart.startsWith("-")) {
        const leftPart = rawLine.slice(0, wideSpaceIdx).trim();
        if (leftPart) {
          lines.push(leftPart);
          lines.push(rightPart);
          continue;
        }
      }
    }
    lines.push(trimmed);
  }

  // Prepare filename fallback and tokens for Tier 2 anchor matching
  let fnTokens: string[] = [];
  let fnFallback = { firstName: "", lastName: "" };
  if (filename) {
    fnFallback = deduceNameFromFilename(filename);
    const fnFull = [fnFallback.firstName, fnFallback.lastName].filter(Boolean).join(" ");
    fnTokens = fnFull
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3);
  }

  // Tier 2: Match filename tokens against the top 15 lines
  if (fnTokens.length > 0) {
    const scanLimit = Math.min(lines.length, 15);
    for (let i = 0; i < scanLimit; i++) {
      const line = lines[i]!;
      const cleaned = cleanCandidateName(line);
      if (!isValidCandidateName(cleaned)) continue;

      const lowerClean = cleaned.toLowerCase();
      for (const token of fnTokens) {
        const pattern = new RegExp(`\\b${token}\\b`, "i");
        if (pattern.test(lowerClean) || (token.length >= 4 && lowerClean.includes(token))) {
          // Check if the next line holds the last name (e.g. MANI RATNAM \n TYAGI)
          if (i + 1 < lines.length) {
            const nextClean = cleanCandidateName(lines[i + 1]!);
            if (isValidCandidateName(nextClean) && nextClean.split(/\s+/).length === 1) {
              for (const tok2 of fnTokens) {
                if (nextClean.toLowerCase() === tok2) {
                  return splitFullName(toTitleCase(`${cleaned} ${nextClean}`));
                }
              }
            }
          }
          return splitFullName(toTitleCase(cleaned));
        }
      }
    }
  }

  // Tier 3: Header scanning (top 10 lines) for any clean candidate name
  const headerLimit = Math.min(lines.length, 10);
  for (let i = 0; i < headerLimit; i++) {
    const line = lines[i]!;
    const cleaned = cleanCandidateName(line);
    if (isValidCandidateName(cleaned)) {
      return splitFullName(toTitleCase(cleaned));
    }
  }

  // Tier 4: Fallback to sanitized filename
  if (fnFallback.firstName) {
    return fnFallback;
  }

  return { firstName: "", lastName: "" };
}
