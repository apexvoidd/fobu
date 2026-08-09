/**
 * Utility to extract clean text content from PDF files for AI analysis
 */

export async function extractPdfText(buffer: Buffer): Promise<string> {
  let extractedText = '';

  // 1. Primary: Use pdf-parse library
  try {
    // Require dynamically to avoid SSR bundler issues in Next.js
    const pdfParse = require('pdf-parse');
    const parsed = await pdfParse(buffer);

    if (parsed && parsed.text && parsed.text.trim().length > 0) {
      extractedText = parsed.text.trim();
    }
  } catch (err: any) {
    console.warn('[FormBuddy PDF] pdf-parse primary extraction warning:', err?.message || err);
  }

  // 2. Fallback: Parse raw PDF text streams if pdf-parse returned empty or failed
  if (!extractedText || extractedText.length < 30) {
    try {
      const raw = buffer.toString('latin1');
      // Match text streams inside PDF objects (BT ... ET) or Tj / TJ text commands
      const textMatches = raw.match(/\(([^()]{2,})\)\s*T[jJ]|BT[\s\S]*?ET/g) || [];
      const extractedChunks: string[] = [];

      for (const chunk of textMatches) {
        const cleaned = chunk
          .replace(/BT|ET/g, '')
          .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\r/g, '\n')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\([()])/g, '$1')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\((.*?)\)\s*T[jJ]/g, '$1 ')
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleaned.length > 2) {
          extractedChunks.push(cleaned);
        }
      }

      const fallbackText = extractedChunks.join('\n');
      if (fallbackText.length > extractedText.length) {
        extractedText = fallbackText;
      }
    } catch (fallbackErr) {
      console.error('[FormBuddy PDF] Raw stream fallback error:', fallbackErr);
    }
  }

  // Clean up whitespace & control characters
  return extractedText
    .replace(/[\r\v\f]/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
