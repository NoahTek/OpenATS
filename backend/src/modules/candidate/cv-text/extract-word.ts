import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import sanitizeHtml from "sanitize-html";
import type { CvFileType } from "./detect";
import logger from "../../../utils/logger";

const wordExtractor = new WordExtractor();

export async function extractWordText(
  file: Buffer,
  fileType: "docx" | "doc",
): Promise<{ text: string; pageCount: number }> {
  if (fileType === "docx") {
    const result = await mammoth.extractRawText({ buffer: file });
    const text = result.value || "";
    // Estimate page count: roughly 3000 chars per standard resume page
    const pageCount = Math.max(1, Math.ceil(text.length / 3000));
    return { text, pageCount };
  }

  // Check if .doc is actually an HTML document
  const headerPreview = file.subarray(0, 512).toString("utf-8").toLowerCase();
  if (
    headerPreview.includes("<!doctype html") ||
    headerPreview.includes("<html") ||
    headerPreview.includes("<head")
  ) {
    const rawHtml = file.toString("utf-8");
    const plainText = sanitizeHtml(rawHtml, {
      allowedTags: ["br", "p", "div", "tr", "td", "li"],
      allowedAttributes: {},
      nonTextTags: ["style", "script", "textarea", "option", "noscript", "head"],
    })
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|li)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\r\n/g, "\n");

    const pageCount = Math.max(1, Math.ceil(plainText.length / 3000));
    return { text: plainText, pageCount };
  }

  // OLE2 Binary .doc file
  try {
    const doc = await wordExtractor.extract(file);
    const body = doc.getBody() || "";
    const headers = doc.getHeaders({ includeFooters: true }) || "";
    const text = headers ? `${headers}\n${body}` : body;
    const pageCount = Math.max(1, Math.ceil(text.length / 3000));
    return { text, pageCount };
  } catch (err) {
    logger.warn(`word-extractor failed to parse OLE2 doc: ${(err as Error).message}`);
    throw err;
  }
}
