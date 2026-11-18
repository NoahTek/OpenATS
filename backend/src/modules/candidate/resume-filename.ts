const slug = (value: string, keep: RegExp) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(keep, "-")
    .replace(/^-+|-+$/g, "");

/**
 * The Content-Disposition for a candidate's CV: shown inline, and saved as
 * `nimal-fernando-cv.pdf` instead of the last part of the URL. Names are not always ASCII, so the
 * real name goes in `filename*` and a plain one in `filename` for anything that cannot read it.
 */
export function resumeContentDisposition(firstName: string, lastName: string, ext: string = "pdf"): string {
  const name = `${firstName} ${lastName}`;
  const full = slug(name, /[^\p{L}\p{M}\p{N}]+/gu);
  const ascii = slug(name, /[^a-z0-9]+/g);

  const cleanExt = ext.replace(/^\./, "") || "pdf";
  const fallback = ascii ? `${ascii}-cv.${cleanExt}` : `cv.${cleanExt}`;
  const encoded = encodeURIComponent(full ? `${full}-cv.${cleanExt}` : `cv.${cleanExt}`);

  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
