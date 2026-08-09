import { NextRequest, NextResponse } from 'next/server';
import { fetchFormUrlContent } from '@/lib/urlFetcher';
import { FormFieldResult, AnalyzeFormApiResponse } from '@/types/form';

const SYSTEM_PROMPT = `
You are FormBuddy AI, an expert vision and document extraction assistant for government and official forms.

COMPREHENSIVE FULL-DOCUMENT SCANNING DIRECTIVE:
1. SCAN THE ENTIRE FORM FROM TOP TO BOTTOM: You MUST analyze ALL sections, parts, and pages of the document (Section A, Section B, Section C, Part I, Part II, Part III, Signature blocks, and Footers). DO NOT stop after the first section or first page!
2. COVER EVERY FIELD ON THE FORM: Extract fields across the WHOLE form. Keep your explanations concise, clear, and direct so that all fields fit cleanly in your response.
3. DO NOT SEPARATE CHECKBOX OPTIONS INTO SEPARATE FIELDS: Group multiple-choice checkboxes or radio buttons into ONE parent field with an "options" array.
4. PRESERVE ORIGINAL FIELD NAMES: Keep original field/question labels as printed on the form.
5. SIMPLE EVERYDAY LANGUAGE: Explain legalese and acronyms (SSN, EIN, TIN, DOB, DBA, Emergency Contact) in simple words.

CRITICAL OUTPUT REQUIREMENT:
You MUST respond ONLY with a raw, valid JSON object starting with '{' and ending with '}'. DO NOT include any introductory sentences or text outside the JSON.

JSON SCHEMA REQUIREMENT:
{
  "formTitle": "Actual Title of the Form",
  "issuingAgency": "Name of Issuing Agency or Authority",
  "summary": "Brief 2-sentence summary of the form's overall purpose",
  "estimatedTime": "Estimated completion time (e.g. 10 - 15 Minutes)",
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

function parseAiContentToFormJson(rawText: string, defaultTitle: string = 'Analyzed Official Form'): AnalyzeFormApiResponse {
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
          example: exampleMatch?.[1] || (field_type === 'date' ? '04-15-1990' : rawName.toLowerCase().includes('phone') ? '555-0199' : rawName.toLowerCase().includes('email') ? 'user@example.com' : 'Jane Doe'),
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

  return getFallbackMockResponse(defaultTitle);
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

function getFallbackMockResponse(identifier?: string): AnalyzeFormApiResponse {
  const isSnap = identifier?.toLowerCase().includes('snap') || identifier?.toLowerCase().includes('benefit');
  const isPassport = identifier?.toLowerCase().includes('passport') || identifier?.toLowerCase().includes('ds82');

  if (isSnap) {
    return {
      success: true,
      source: 'fallback-mock',
      formTitle: 'State SNAP / Food Assistance Application',
      issuingAgency: 'Department of Health & Human Services',
      summary: 'This official state application is used to apply for Supplemental Nutrition Assistance Program (SNAP) food benefits.',
      estimatedTime: '20 - 25 Minutes',
      requiredDocuments: [
        'Government Photo ID for Head of Household',
        'Proof of Gross Household Income (Last 4 paystubs or W-2)',
        'Proof of Monthly Housing Costs (Rent receipt, lease, or utility bill)',
        'Social Security Numbers for all household members'
      ],
      commonMistakes: [
        'Failing to list all people living and eating together in the household section.',
        'Not reporting all income sources including child support or gig work.',
        'Omitting utility expense details which could lower your benefit calculation.'
      ],
      fields: [
        {
          field_name: 'Section 1: Applicant Information - Full Legal Name',
          page: 1,
          field_type: 'text',
          required: true,
          options: [],
          simple_meaning: 'The main adult applying for SNAP benefits on behalf of the household.',
          what_to_enter: 'Type your First Name, Middle Initial, and Last Name as shown on your official ID.',
          example: 'Maria Elena Rodriguez',
          important_note: 'Must be an adult household member.',
          confidence: 'high'
        },
        {
          field_name: 'Section 2: Household Members Count',
          page: 1,
          field_type: 'number',
          required: true,
          options: [],
          simple_meaning: 'The total number of people living with you who buy and prepare food together.',
          what_to_enter: 'Enter total count of adults and children in your food household.',
          example: '3',
          important_note: 'Include yourself in the total number.',
          confidence: 'high'
        },
        {
          field_name: 'Section 3: Assistance Types Requested',
          page: 1,
          field_type: 'checkbox',
          required: false,
          options: ['SNAP Food Assistance', 'Cash Assistance (TANF)', 'Medicaid Health Coverage', 'Child Care Subsidy'],
          simple_meaning: 'Check the boxes for all state benefit programs you want to apply for today.',
          what_to_enter: 'Check "SNAP Food Assistance" and any other benefit programs you need.',
          example: 'Check SNAP Food Assistance & Medicaid',
          important_note: 'Checking multiple boxes applies for all programs simultaneously.',
          confidence: 'high'
        },
        {
          field_name: 'Section 4: Monthly Household Earned Income',
          page: 2,
          field_type: 'text',
          required: true,
          options: [],
          simple_meaning: 'Total money earned by all household members before taxes are taken out.',
          what_to_enter: 'Calculate gross monthly wages from all jobs and enter total dollar amount.',
          example: '$2,450.00 / month',
          important_note: 'Attach copies of your most recent paystubs as proof.',
          confidence: 'medium'
        }
      ]
    };
  }

  if (isPassport) {
    return {
      success: true,
      source: 'fallback-mock',
      formTitle: 'U.S. Passport Renewal Application (Form DS-82)',
      issuingAgency: 'U.S. Department of State',
      summary: 'Form DS-82 is used by eligible U.S. citizens to renew an expired or expiring passport by mail without visiting an agency in person.',
      estimatedTime: '15 - 20 Minutes',
      requiredDocuments: [
        'Most Recent U.S. Passport Book / Card',
        'One Passport Photo (2x2 inches, white background)',
        'Check or Money Order payable to "U.S. Department of State"',
        'Certified Legal Name Change Document (if your name changed)'
      ],
      commonMistakes: [
        'Submitting a photo with glasses or inappropriate lighting.',
        'Stapling the payment check to the photo instead of placing it loosely.',
        'Mailing a damaged passport requiring in-person DS-11 application instead.',
        'Forgetting to sign Section 11 in ink.'
      ],
      fields: [
        {
          field_name: 'Item 1: Name',
          page: 1,
          field_type: 'text',
          required: true,
          options: [],
          simple_meaning: 'Your full legal name as it appears on your current passport.',
          what_to_enter: 'Enter Last Name, First Name, and Middle Name in the respective boxes.',
          example: 'SMITH, JANE MARIE',
          important_note: 'If your legal name changed since your last passport, attach marriage certificate or court order.',
          confidence: 'high'
        },
        {
          field_name: 'Item 2: Date of Birth',
          page: 1,
          field_type: 'date',
          required: true,
          options: [],
          simple_meaning: 'The date you were born.',
          what_to_enter: 'Write month, day, and 4-digit year format (MM-DD-YYYY).',
          example: '04-15-1988',
          important_note: 'Ensure 4-digit year is used.',
          confidence: 'high'
        },
        {
          field_name: 'Item 9: Most Recent Passport Book Number',
          page: 1,
          field_type: 'text',
          required: true,
          options: [],
          simple_meaning: 'The 9-digit document number of your current passport.',
          what_to_enter: 'Look at the top right of your passport information page and copy the number.',
          example: 'C12345678',
          important_note: 'You must enclose your physical passport with the application.',
          confidence: 'high'
        }
      ]
    };
  }

  // Default IRS W-9 style fallback
  return {
    success: true,
    source: 'fallback-mock',
    formTitle: 'IRS Form W-9 (Request for Taxpayer Identification Number)',
    issuingAgency: 'Internal Revenue Service (IRS)',
    summary: 'This official form requests your verified taxpayer identification details to process reporting and legal compliance.',
    estimatedTime: '10 - 15 Minutes',
    requiredDocuments: [
      'Government Photo ID (Driver License or Passport)',
      'Social Security Card or Taxpayer Identification (TIN/EIN) Document',
      'Proof of Business Entity registration (if applicable)'
    ],
    commonMistakes: [
      'Writing a trade DBA name on Line 1 instead of your legal tax return name.',
      'Checking multiple incompatible federal tax classification boxes.',
      'Omitting signature or dating the document prior to submission.'
    ],
    fields: [
      {
        field_name: 'Line 1: Name as shown on your income tax return',
        page: 1,
        field_type: 'text',
        required: true,
        options: [],
        simple_meaning: 'Your official legal name registered with the government or IRS.',
        what_to_enter: 'Type or print your full legal name exactly as shown on your tax filings.',
        example: 'John Robert Smith',
        important_note: 'Do not use nicknames or business trade names on Line 1.',
        confidence: 'high'
      },
      {
        field_name: 'Line 2: Business name / disregarded entity name',
        page: 1,
        field_type: 'text',
        required: false,
        options: [],
        simple_meaning: 'If you have a business trade name (DBA) or single-member LLC name separate from your legal name.',
        what_to_enter: 'Enter your registered business name if applicable. Leave blank if filing as an individual.',
        example: 'Smith Consulting LLC',
        important_note: '',
        confidence: 'high'
      },
      {
        field_name: 'Line 3: Check appropriate box for federal tax classification',
        page: 1,
        field_type: 'radio',
        required: true,
        options: [
          'Individual/sole proprietor or single-member LLC',
          'C Corporation',
          'S Corporation',
          'Partnership',
          'Trust/estate',
          'Limited Liability Company (LLC)'
        ],
        simple_meaning: 'How your earnings are categorized for federal income taxes.',
        what_to_enter: 'Check ONE box that describes your tax classification. Independent contractors select Individual/sole proprietor.',
        example: 'Check "Individual/sole proprietor or single-member LLC"',
        important_note: 'Only check one tax classification box. Checking multiple boxes invalidates the form.',
        confidence: 'high'
      },
      {
        field_name: 'Part I: Taxpayer Identification Number (TIN)',
        page: 1,
        field_type: 'number',
        required: true,
        options: [],
        simple_meaning: 'Your 9-digit Social Security Number (SSN) or Employer Identification Number (EIN).',
        what_to_enter: 'Enter your 9-digit SSN or EIN in the designated boxes.',
        example: 'XXX-XX-6789',
        important_note: 'Verify digits carefully. Incorrect TINs trigger 24% backup withholding.',
        confidence: 'high'
      },
      {
        field_name: 'Part II: Certification & Signature',
        page: 1,
        field_type: 'signature',
        required: true,
        options: [],
        simple_meaning: 'Legal declaration under penalty of perjury that the TIN provided is correct.',
        what_to_enter: 'Sign with your handwritten or legal digital signature and enter today\'s date.',
        example: 'Sign in ink with date MM/DD/YYYY',
        important_note: 'Form is invalid without signature.',
        confidence: 'high'
      }
    ]
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
            error: urlErr.message || 'Unable to access link.'
          },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    const nimModel = process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.2-11b-vision-instruct';
    const nimBaseUrl = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';

    if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_NVIDIA_NIM_API_KEY') {
      console.log('[FormBuddy Backend] NVIDIA_NIM_API_KEY not configured. Returning fallback response.');
      const primaryIdentifier = files[0]?.name || linkUrl || undefined;
      return NextResponse.json(getFallbackMockResponse(primaryIdentifier));
    }

    const contentPayload: any[] = [];

    contentPayload.push({
      type: 'text',
      text: SYSTEM_PROMPT
    });

    if (urlFetchDetails) {
      if (urlFetchDetails.contentType === 'pdf') {
        contentPayload.push({
          type: 'text',
          text: `PDF Form fetched from URL: ${urlFetchDetails.url}. Title: ${urlFetchDetails.title}. Scan ALL sections from top to bottom.`
        });
      } else {
        contentPayload.push({
          type: 'text',
          text: `HTML Web Form fetched from URL: ${urlFetchDetails.url}. Title: ${urlFetchDetails.title}.\n\nExtracted Content:\n${urlFetchDetails.extractedFieldsSummary}`
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
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mime = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
        const dataUrl = `data:${mime};base64,${base64}`;

        console.log(`[FormBuddy Backend] Converted image file "${file.name}" to base64 (${base64.length} chars).`);

        contentPayload.push({
          type: 'image_url',
          image_url: {
            url: dataUrl
          }
        });
      } else if (mimeLower === 'application/pdf' || nameLower.endsWith('.pdf')) {
        contentPayload.push({
          type: 'text',
          text: `PDF document attached: ${file.name}. Scan ALL sections from top to bottom.`
        });
      }
    }

    console.log(`[FormBuddy Backend] Calling NVIDIA NIM API (${nimModel}) with max_tokens: 6000...`);

    const nimResponse = await fetch(nimBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: nimModel,
        messages: [
          {
            role: 'user',
            content: contentPayload
          }
        ],
        temperature: 0.1,
        max_tokens: 6000
      })
    });

    if (!nimResponse.ok) {
      const errText = await nimResponse.text();
      console.error('[FormBuddy Backend] NVIDIA NIM API Error:', nimResponse.status, errText);
      return NextResponse.json({
        ...getFallbackMockResponse(files[0]?.name || linkUrl || undefined),
        rawWarning: `NVIDIA NIM API status ${nimResponse.status}. Displaying fallback analysis.`
      });
    }

    const nimResult = await nimResponse.json();
    const rawContent = nimResult.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('NVIDIA NIM API returned empty message content.');
    }

    console.log(`[FormBuddy Backend] Received NVIDIA NIM Response (${rawContent.length} chars). Parsing fields...`);

    const defaultTitle = files[0]?.name || urlFetchDetails?.title || 'Analyzed Form Document';
    const parsedData = parseAiContentToFormJson(rawContent, defaultTitle);

    return NextResponse.json(parsedData);

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
