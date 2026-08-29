/**
 * Text out of an uploaded document, page by page.
 *
 * PDFs go through unpdf (pdf.js under the hood, pure JS, serverless-
 * safe). Plain text and markdown pass through, split on form feeds
 * when present. A scanned-image PDF yields empty pages and the job
 * fails HONESTLY with a message naming the OCR gap rather than
 * pretending the document was read.
 */
import { extractText as unpdfExtract, getDocumentProxy } from "unpdf";

export async function extractText(
  bytes: Buffer | Uint8Array,
  contentType: string,
  filename: string,
): Promise<string[]> {
  const isPdf =
    contentType.includes("pdf") || filename.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await unpdfExtract(pdf, { mergePages: false });
    return (Array.isArray(text) ? text : [text]).map((t) => String(t ?? ""));
  }

  const raw = Buffer.from(bytes).toString("utf8");
  /* form feed is a page break where present; otherwise one page */
  const pages = raw.split("\f");
  return pages.length > 1 ? pages : [raw];
}
