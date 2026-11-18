export type CvFileType = "pdf" | "docx" | "doc";

/**
 * The file type from the bytes themselves. The name and the content type come from whoever
 * uploaded the file, so they are never used to decide how it is parsed.
 */
export function detectFileType(file: Buffer): CvFileType | null {
  // The PDF header may be preceded by a little junk, so look in the first kilobyte.
  if (file.subarray(0, 1024).includes("%PDF-")) return "pdf";

  // A .docx is a zip archive holding word/document.xml.
  const isZip =
    file.length > 4 && file[0] === 0x50 && file[1] === 0x4b && file[2] === 0x03 && file[3] === 0x04;
  if (isZip && file.includes("word/document.xml")) return "docx";

  // OLE2 Compound Document (legacy Microsoft Word 97-2004 .doc)
  // Magic bytes: 0xD0 0xCF 0x11 0xE0 0xA1 0xB1 0x1A 0xE1
  if (
    file.length > 8 &&
    file[0] === 0xd0 &&
    file[1] === 0xcf &&
    file[2] === 0x11 &&
    file[3] === 0xe0 &&
    file[4] === 0xa1 &&
    file[5] === 0xb1 &&
    file[6] === 0x1a &&
    file[7] === 0xe1
  ) {
    return "doc";
  }

  // Common job-board quirk: HTML documents with .doc extension
  // Matches Office HTML (e.g. schemas-microsoft-com, mso-) or XHTML doctype used in portal web exports
  const headerPreview = file.subarray(0, 1024).toString("utf-8").toLowerCase();
  if (
    headerPreview.includes("urn:schemas-microsoft-com:office") ||
    headerPreview.includes("progid=\"word.document\"") ||
    headerPreview.includes("mso-") ||
    (headerPreview.includes("<!doctype html") && (headerPreview.includes("xhtml") || headerPreview.includes("w3c")))
  ) {
    return "doc";
  }

  return null;
}
