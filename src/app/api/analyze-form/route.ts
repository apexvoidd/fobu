import { NextRequest, NextResponse } from 'next/server';
import { fetchFormUrlContent } from '@/lib/urlFetcher';
import { extractPdfText } from '@/lib/pdfParser';
import { FormFieldResult, AnalyzeFormApiResponse } from '@/types/form';

export const maxDuration = 60; // Allow up to 60 seconds execution for AI generation
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `
You are FormBuddy AI, an expert document and official form vision extraction assistant.

CRITICAL INSTRUCTIONS FOR ACCURATE FIELD EXTRACTION & EXAMPLES:
1. SCAN THE ENTIRE DOCUMENT TOP TO BOTTOM: Analyze all sections, headers, parts, field labels, checkboxes, dates, instructions, signatures, and footers.
2. HYPER-REALISTIC ACTIONABLE EXAMPLES REQUIRED:
   - For EVERY field, you MUST provide a realistic, specific example entry matching the field type.
   - NEVER return generic placeholders like "John Doe", "N/A", "Text", "Sample", or "Value".
   - Examples must be concrete:
     * Full Names: "Maria Elena Rodriguez" or "Robert James Smith"
     * Dates: "04/15/1990"
     * Phone Numbers: "(555) 234-5678"
     * Addresses: "742 Evergreen Terrace, Springfield, IL 62704"
     * SSN / Tax IDs: "XXX-XX-6789" or "XX-XXXXXXX"
     * Income / Numbers: "$3,450.00 / month"
     * Checkboxes / Radio: Name the exact option selection (e.g. "Select 'Full-Time Employee'")
3. EXPLAIN WHAT TO ENTER IN SIMPLE WORDS: Explain acronyms (SSN, EIN, DOB, DBA, TIN) and legalese clearly.
4. JSON ONLY OUTPUT: You MUST respond ONLY with a raw, valid JSON object starting with '{' and ending with '}'.

JSON SCHEMA REQUIREMENT:
{
  "formTitle": "Actual Title of the Form",
  "issuingAgency": "Name of Issuing Agency or Authority",
  "summary": "Brief 2-sentence summary of the form's overall purpose",
  "estimatedTime": "Estimated completion time (e.g. 15 - 20 Minutes)",
  "requiredDocuments": [
    "List of required documents or IDs needed"
  ],
  "commonMistakes": [
    "List of common errors to avoid"
  ],
  "fields": [
    {
      "field_name": "Exact Field Name printed on the form",
      "page": 1,
      "field_type": "text | checkbox | radio | dropdown | date | signature | number | table",
      "required": true,
      "options": ["Option 1", "Option 2"],
      "simple_meaning": "Plain English explanation of what this field asks for",
      "what_to_enter": "Clear step-by-step guidance on what to type or select",
      "example": "Realistic example entry",
      "important_note": "Important warnings or pitfall notes (or empty string if none)",
      "confidence": "high | medium | low"
    }
  ]
}
`;

// Fetch Helper with Generous AbortController Timeout (55 seconds) to allow full AI completion
async function callNimWithTimeout(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: any[],
  temperature: number = 0.05
): Promise<{ ok: boolean; content?: string; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 second generous timeout

  try {
    console.log(`[FormBuddy Backend] Calling AI model "${model}" with 55s timeout (max_tokens: 4096)...`);
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: 4096
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (content && content.trim().length > 10) {
        console.log(`[FormBuddy Backend] Successfully received AI response from "${model}" (${content.length} chars).`);
        return { ok: true, content };
      }
    } else {
      const errText = await response.text();
      console.warn(`[FormBuddy Backend] Model "${model}" HTTP ${response.status}: ${errText.slice(0, 150)}`);
      return { ok: false, error: `Model ${model} status ${response.status}: ${errText.slice(0, 150)}` };
    }
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      console.warn(`[FormBuddy Backend] Model "${model}" timed out after 55 seconds.`);
      return { ok: false, error: `AI model "${model}" generation timed out after 55 seconds.` };
    }
    console.warn(`[FormBuddy Backend] Fetch error for model "${model}":`, e?.message || e);
    return { ok: false, error: e?.message || 'Network fetch error' };
  }

  return { ok: false, error: 'Failed to get valid AI response.' };
}

function parseAiContentToFormJson(rawText: string, defaultTitle: string = 'Analyzed Official Form'): AnalyzeFormApiResponse | null {
  const trimmed = rawText.trim();

  // Attempt 1: Direct JSON.parse
  try {
    const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const data = JSON.parse(stripped);
    if (data && typeof data === 'object' && Array.isArray(data.fields) && data.fields.length > 0) {
      return formatParsedData(data, 'nvidia-nim', defaultTitle);
    }
  } catch (e) {
    // Continue
  }

  // Attempt 2: Extract JSON substring between first '{' and last '}'
  try {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonSub = trimmed.substring(firstBrace, lastBrace + 1);
      const data = JSON.parse(jsonSub);
      if (data && typeof data === 'object' && Array.isArray(data.fields) && data.fields.length > 0) {
        return formatParsedData(data, 'nvidia-nim', defaultTitle);
      }
    }
  } catch (e) {
    // Continue
  }

  // Attempt 3: Smart Markdown Parser with Option Consolidation
  try {
    const fieldBlocks = trimmed.split(/(?:\r?\n)+(?=[*+-]\s+\*\*)/);
    const parsedFields: FormFieldResult[] = [];
    const groupedOptionsMap: Record<string, FormFieldResult> = {};

    for (const block of fieldBlocks) {
      const nameMatch = block.match(/[*+-]\s+\*\*([^*]+)\*\*/);
      if (nameMatch) {
        const rawName = nameMatch[1].replace(/:$/, '').trim();

        const typeMatch = block.match(/(?:Field type|Type):\s*([^\r\n]+)/i);
        const reqMatch = block.match(/Required:\s*(True|False|Yes|No)/i);
        const confMatch = block.match(/Confidence:\s*(High|Medium|Low)/i);
        const meaningMatch = block.match(/(?:Meaning|Description|Simple meaning):\s*([^\r\n]+)/i);
        const enterMatch = block.match(/(?:What to enter|Guidance|Instructions):\s*([^\r\n]+)/i);
        const exampleMatch = block.match(/Example:\s*([^\r\n]+)/i);

        const rawType = (typeMatch?.[1] || 'text').toLowerCase();
        let field_type: any = 'text';
        if (rawType.includes('check')) field_type = 'checkbox';
        else if (rawType.includes('radio') || rawType.includes('choice') || rawType.includes('drop')) field_type = 'radio';
        else if (rawType.includes('date')) field_type = 'date';
        else if (rawType.includes('sign')) field_type = 'signature';

        const isRequired = reqMatch ? reqMatch[1].toLowerCase() === 'true' || reqMatch[1].toLowerCase() === 'yes' : true;
        const rawConf = (confMatch?.[1] || 'high').toLowerCase();
        const confidence: 'high' | 'medium' | 'low' = rawConf === 'low' ? 'low' : rawConf === 'medium' ? 'medium' : 'high';

        const splitOptionMatch = rawName.match(/^(.+?)\s*[-:]\s*(.+)$/);

        if (splitOptionMatch && (field_type === 'checkbox' || field_type === 'radio')) {
          const parentField = splitOptionMatch[1].trim();
          const optionValue = splitOptionMatch[2].trim();

          if (groupedOptionsMap[parentField]) {
            groupedOptionsMap[parentField].options.push(optionValue);
            continue;
          } else {
            const newField: FormFieldResult = {
              field_name: parentField,
              page: 1,
              field_type,
              required: isRequired,
              options: [optionValue],
              simple_meaning: `Select the option that applies to ${parentField.toLowerCase()}.`,
              what_to_enter: `Check the box or option for ${parentField.toLowerCase()}.`,
              example: `Select ${optionValue}`,
              important_note: '',
              confidence
            };
            groupedOptionsMap[parentField] = newField;
            parsedFields.push(newField);
            continue;
          }
        }

        parsedFields.push({
          field_name: rawName,
          page: 1,
          field_type,
          required: isRequired,
          options: [],
          simple_meaning: meaningMatch?.[1] || `Enter your ${rawName.toLowerCase()} as requested on the form.`,
          what_to_enter: enterMatch?.[1] || `Provide accurate ${rawName.toLowerCase()} details.`,
          example: exampleMatch?.[1] || (field_type === 'date' ? '04/15/1990' : rawName.toLowerCase().includes('phone') ? '(555) 234-5678' : rawName.toLowerCase().includes('email') ? 'user@example.com' : 'Maria Elena Rodriguez'),
          important_note: '',
          confidence
        });
      }
    }

    if (parsedFields.length > 0) {
      const titleMatch = trimmed.match(/(?:form|shows a|registration form for)\s+([^\n.]+)/i);
      const title = titleMatch ? titleMatch[1].trim() : defaultTitle;

      return {
        success: true,
        source: 'nvidia-nim',
        formTitle: title.charAt(0).toUpperCase() + title.slice(1),
        issuingAgency: 'Official Authority',
        summary: 'Form fields extracted directly from attached document by NVIDIA NIM AI.',
        estimatedTime: '5 - 10 Minutes',
        requiredDocuments: ['Government Photo ID or Student ID'],
        commonMistakes: ['Verify contact details and selected choices before submitting.'],
        fields: parsedFields
      };
    }
  } catch (markdownErr) {
    console.error('[FormBuddy Backend] Smart Markdown parser error:', markdownErr);
  }

  // Explicitly return null if parsing failed completely
  return null;
}

function toSafeString(val: any, defaultVal: string = ''): string {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    return val.map(item => toSafeString(item)).filter(Boolean).join(', ');
  }
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${toSafeString(v)}`)
      .join(', ');
  }
  return String(val);
}

function formatParsedData(data: any, source: 'nvidia-nim' | 'fallback-mock', defaultTitle: string): AnalyzeFormApiResponse {
  const formattedFields: FormFieldResult[] = (data.fields || []).map((f: any, idx: number) => {
    const rawConf = (f.confidence || 'high').toString().toLowerCase();
    const confidence: 'high' | 'medium' | 'low' = 
      rawConf === 'low' ? 'low' : rawConf === 'medium' ? 'medium' : 'high';

    const rawType = (f.field_type || f.fieldType || 'text').toString().toLowerCase();

    return {
      field_name: toSafeString(f.field_name || f.fieldName, `Field ${idx + 1}`),
      page: f.page || 1,
      field_type: rawType as any,
      required: typeof f.required === 'boolean' ? f.required : true,
      options: Array.isArray(f.options) ? f.options.map((o: any) => toSafeString(o)) : [],
      simple_meaning: toSafeString(f.simple_meaning || f.simpleMeaning, 'Field description'),
      what_to_enter: toSafeString(f.what_to_enter || f.whatToEnter, 'Enter requested value'),
      example: toSafeString(f.example, 'N/A'),
      important_note: toSafeString(f.important_note || f.importantNote, ''),
      confidence
    };
  });

  return {
    success: true,
    source,
    formTitle: data.formTitle || defaultTitle,
    issuingAgency: data.issuingAgency || 'Issuing Authority',
    summary: data.summary || 'Form analyzed successfully with context understanding.',
    estimatedTime: data.estimatedTime || '10 Minutes',
    requiredDocuments: Array.isArray(data.requiredDocuments) ? data.requiredDocuments : ['Government Photo ID'],
    commonMistakes: Array.isArray(data.commonMistakes) ? data.commonMistakes : ['Verify entries before submitting.'],
    fields: formattedFields
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const linkUrl = formData.get('linkUrl') as string | null;

    console.log(`[FormBuddy Backend] POST /api/analyze-form - Received ${files.length} file(s), linkUrl: "${linkUrl || ''}"`);

    let urlFetchDetails: any = null;

    if (linkUrl && linkUrl.trim() !== '') {
      const trimmedUrl = linkUrl.trim();
      try {
        urlFetchDetails = await fetchFormUrlContent(trimmedUrl);
      } catch (urlErr: any) {
        return NextResponse.json(
          {
            success: false,
            error: urlErr.message || 'Unable to access web link.'
          },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    const nimBaseUrl = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';

    if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_NVIDIA_NIM_API_KEY') {
      console.error('[FormBuddy Backend] NVIDIA_NIM_API_KEY is not configured in environment variables.');
      return NextResponse.json(
        {
          success: false,
          error: 'NVIDIA NIM API key is missing or unconfigured. Please configure NVIDIA_NIM_API_KEY in your environment variables to analyze documents.'
        },
        { status: 401 }
      );
    }

    const contentPayload: any[] = [];
    let hasImages = false;

    contentPayload.push({
      type: 'text',
      text: SYSTEM_PROMPT
    });

    if (urlFetchDetails) {
      if (urlFetchDetails.contentType === 'pdf') {
        contentPayload.push({
          type: 'text',
          text: `PDF Form fetched from URL: ${urlFetchDetails.url}. Title: ${urlFetchDetails.title}.\n\nExtracted PDF Document Text:\n${urlFetchDetails.extractedFieldsSummary || 'No text could be extracted directly from PDF URL.'}\n\nPlease analyze ALL form fields, labels, inputs, checkboxes, instructions, and sections from top to bottom.`
        });
      } else {
        contentPayload.push({
          type: 'text',
          text: `HTML Web Form fetched from URL: ${urlFetchDetails.url}. Title: ${urlFetchDetails.title}.\n\nExtracted Web Page Content:\n${urlFetchDetails.extractedFieldsSummary}\n\nPlease analyze all input fields, labels, options, dropdowns, and instructions.`
        });
      }
    }

    for (const file of files) {
      const nameLower = file.name ? file.name.toLowerCase() : '';
      const mimeLower = file.type ? file.type.toLowerCase() : '';
      
      const isImg = mimeLower.startsWith('image/') || 
        nameLower.endsWith('.jpg') || 
        nameLower.endsWith('.jpeg') || 
        nameLower.endsWith('.png') || 
        nameLower.endsWith('.webp') || 
        nameLower.endsWith('.heic');

      if (isImg) {
        hasImages = true;
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mime = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
        const dataUrl = `data:${mime};base64,${base64}`;

        console.log(`[FormBuddy Backend] Processing image "${file.name}" as vision input (${base64.length} chars).`);

        contentPayload.push({
          type: 'text',
          text: `Visual Image Document attached: ${file.name}. Read all visible printed text, form titles, questions, checkboxes, input lines, signatures, and instructions carefully across the entire image.`
        });

        contentPayload.push({
          type: 'image_url',
          image_url: {
            url: dataUrl
          }
        });
      } else if (mimeLower === 'application/pdf' || nameLower.endsWith('.pdf')) {
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const extractedPdfContent = await extractPdfText(buffer);

        console.log(`[FormBuddy Backend] Extracted ${extractedPdfContent.length} chars from uploaded PDF "${file.name}"`);

        if (!extractedPdfContent || extractedPdfContent.trim().length < 10) {
          console.warn(`[FormBuddy Backend] Uploaded PDF "${file.name}" contains no readable text stream.`);
        }

        contentPayload.push({
          type: 'text',
          text: `Uploaded PDF Document (${file.name}):\n\n${extractedPdfContent || 'PDF document contains no readable text stream. Scan for document structure.'}\n\nPlease analyze ALL fields, questions, sections, and instructions contained in this PDF.`
        });
      }
    }

    // Candidate models with generous execution window
    const candidateModels = hasImages
      ? [
          process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.2-11b-vision-instruct',
          'meta/llama-3.2-90b-vision-instruct'
        ]
      : [
          process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.3-70b-instruct',
          'meta/llama-3.1-8b-instruct',
          'meta/llama-3.1-70b-instruct'
        ];

    let lastErrorDetails = '';

    for (const modelCandidate of candidateModels) {
      const result = await callNimWithTimeout(nimBaseUrl, apiKey, modelCandidate, [{ role: 'user', content: contentPayload }], 0.05);

      if (result.ok && result.content) {
        const defaultTitle = files[0]?.name || urlFetchDetails?.title || 'Analyzed Form Document';
        const parsedData = parseAiContentToFormJson(result.content, defaultTitle);
        
        if (parsedData) {
          return NextResponse.json(parsedData);
        } else {
          lastErrorDetails = 'AI model generated unparseable response content.';
        }
      } else {
        lastErrorDetails = result.error || 'Model execution failed.';
      }
    }

    console.error('[FormBuddy Backend] All candidate models failed. Returning explicit error response.');
    return NextResponse.json(
      {
        success: false,
        error: `Form analysis failed: ${lastErrorDetails || 'Unable to process document with AI models. Please check your API key or file format.'}`
      },
      { status: 502 }
    );

  } catch (error: any) {
    console.error('[FormBuddy Backend] Error in analyze-form route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Server error occurred while analyzing form.'
      },
      { status: 500 }
    );
  }
}
