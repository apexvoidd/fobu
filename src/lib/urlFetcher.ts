import { URL } from 'url';
import { extractPdfText } from '@/lib/pdfParser';

export interface FetchedFormContent {
  contentType: 'pdf' | 'html';
  url: string;
  pdfBuffer?: Buffer;
  htmlText?: string;
  extractedFieldsSummary?: string;
  title?: string;
}

// SSRF Prevention: Check if hostname resolves to localhost or private IP range
export function isUnsafeHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Block localhost, loopback, and internal TLDs
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.lan')
  ) {
    return true;
  }

  // IPv4 Private Ranges Check
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = lower.match(ipv4Regex);

  if (match) {
    const p1 = parseInt(match[1], 10);
    const p2 = parseInt(match[2], 10);

    // 10.0.0.0 – 10.255.255.255
    if (p1 === 10) return true;

    // 172.16.0.0 – 172.31.255.255
    if (p1 === 172 && p2 >= 16 && p2 <= 31) return true;

    // 192.168.0.0 – 192.168.255.255
    if (p1 === 192 && p2 === 168) return true;

    // 169.254.0.0 – 169.254.255.255 (Link-local)
    if (p1 === 169 && p2 === 254) return true;

    // 127.0.0.0 – 127.255.255.255 (Loopback)
    if (p1 === 127) return true;

    // 0.0.0.0
    if (p1 === 0) return true;
  }

  return false;
}

// Validate URL format and security
export function validateFormUrl(inputUrl: string): { valid: boolean; error?: string; parsedUrl?: URL } {
  try {
    const parsed = new URL(inputUrl);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'Invalid URL. Only HTTP and HTTPS URLs are supported.'
      };
    }

    if (isUnsafeHost(parsed.hostname)) {
      return {
        valid: false,
        error: 'Security Error: Access to localhost, private IP addresses, or internal network URLs is blocked.'
      };
    }

    return { valid: true, parsedUrl: parsed };
  } catch (err) {
    return {
      valid: false,
      error: 'Invalid URL format. Please enter a complete web link (e.g. https://www.irs.gov/pub/irs-pdf/fw9.pdf).'
    };
  }
}

// Extract form labels, inputs, instructions, checkboxes, and dropdowns from HTML
export function extractHtmlFormContent(html: string, pageUrl: string): { title: string; summaryText: string; hasFormElements: boolean } {
  // Extract Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Official Web Form';

  // Strip script, style, and navigation tags for clean text extraction
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

  // Extract Form inputs, labels, select dropdowns, fieldsets
  const formMatches = cleanHtml.match(/<(?:form|fieldset|label|input|select|textarea)[^>]*>/gi) || [];
  const hasFormElements = formMatches.length > 0 || cleanHtml.toLowerCase().includes('form') || cleanHtml.toLowerCase().includes('application');

  // Simple strip HTML tags to get raw readable text
  let bodyText = cleanHtml.replace(/<[^>]+>/g, ' ');
  bodyText = bodyText.replace(/\s+/g, ' ').trim();

  // Allow up to 25,000 characters for comprehensive extraction of long forms
  const truncatedText = bodyText.length > 25000 ? bodyText.slice(0, 25000) + '...' : bodyText;

  return {
    title,
    summaryText: truncatedText,
    hasFormElements
  };
}

// Fetch Form URL securely
export async function fetchFormUrlContent(linkUrl: string): Promise<FetchedFormContent> {
  const validation = validateFormUrl(linkUrl);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(linkUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FormBuddy/1.0',
        'Accept': 'application/pdf, text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Unable to access link: Page not found (404). Please verify the web link.');
      } else if (response.status === 403 || response.status === 401) {
        throw new Error('Unable to access link: Access forbidden or requires login.');
      } else {
        throw new Error(`Unable to access link: Server returned HTTP status ${response.status}.`);
      }
    }

    const contentType = response.headers.get('content-type') || '';
    const isPdfUrl = linkUrl.toLowerCase().endsWith('.pdf') || contentType.toLowerCase().includes('application/pdf');

    if (isPdfUrl) {
      const arrayBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      if (buffer.length < 100) {
        throw new Error('Unsupported page: The PDF document appears to be empty or corrupted.');
      }

      // Extract full text from PDF buffer
      const pdfText = await extractPdfText(buffer);

      return {
        contentType: 'pdf',
        url: linkUrl,
        pdfBuffer: buffer,
        extractedFieldsSummary: pdfText,
        title: linkUrl.split('/').pop() || 'PDF Document'
      };
    } else {
      const htmlText = await response.text();
      const extracted = extractHtmlFormContent(htmlText, linkUrl);

      if (!extracted.hasFormElements && extracted.summaryText.length < 50) {
        throw new Error('Form could not be detected: The URL does not appear to contain a valid form or document.');
      }

      return {
        contentType: 'html',
        url: linkUrl,
        htmlText,
        extractedFieldsSummary: extracted.summaryText,
        title: extracted.title
      };
    }

  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error('Unable to access link: Connection timed out after 15 seconds.');
    }

    if (err.message && err.message.startsWith('Unable to access link')) {
      throw err;
    }

    if (err.message && (err.message.startsWith('Security Error') || err.message.startsWith('Invalid URL') || err.message.startsWith('Unsupported page') || err.message.startsWith('Form could not be detected'))) {
      throw err;
    }

    throw new Error(`Unable to access link: ${err.message || 'Network connection failed'}.`);
  }
}
