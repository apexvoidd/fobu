import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Allow up to 60 seconds execution for AI Q&A
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { question, formContext, conversationHistory } = await req.json();

    if (!question || typeof question !== 'string' || question.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Question is required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    const nimModel = process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.3-70b-instruct';
    const nimBaseUrl = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';

    if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_NVIDIA_NIM_API_KEY') {
      return NextResponse.json(
        {
          success: false,
          error: 'NVIDIA NIM API key is missing or unconfigured. Please configure NVIDIA_NIM_API_KEY to ask questions.'
        },
        { status: 401 }
      );
    }

    const systemPrompt = `
You are FormBuddy Q&A Assistant, a helpful official document expert.
The user is filling out the form: "${formContext?.formTitle || 'Official Form'}", issued by: "${formContext?.issuingAgency || 'Issuing Authority'}".

Form Summary: ${formContext?.summary || 'Official application form'}
Required Documents: ${(formContext?.requiredDocuments || []).join(', ')}
Common Mistakes to Avoid: ${(formContext?.commonMistakes || []).join(', ')}

Extracted Fields Context:
${(formContext?.fields || []).slice(0, 30).map((f: any) => `- ${f.field_name} (Type: ${f.field_type}, Required: ${f.required}): ${f.simple_meaning}. How to enter: ${f.what_to_enter}. Example: ${f.example}`).join('\n')}

Instructions:
Answer the user's specific question about this form clearly, accurately, and concisely in 2-4 sentences. Give direct practical advice.
`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (Array.isArray(conversationHistory)) {
      conversationHistory.slice(-4).forEach((item: any) => {
        if (item.question) messages.push({ role: 'user', content: item.question });
        if (item.answer) messages.push({ role: 'assistant', content: item.answer });
      });
    }

    messages.push({ role: 'user', content: question.trim() });

    const candidateModels = [
      nimModel,
      'meta/llama-3.3-70b-instruct',
      'meta/llama-3.1-8b-instruct',
      'meta/llama-3.1-70b-instruct'
    ];

    let lastErrorMsg = '';

    for (const modelCandidate of candidateModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for Q&A

      try {
        console.log(`[FormBuddy Q&A] Calling model "${modelCandidate}" (30s timeout)...`);
        const nimRes = await fetch(nimBaseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelCandidate,
            messages,
            temperature: 0.3,
            max_tokens: 1024
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (nimRes.ok) {
          const resData = await nimRes.json();
          const answerText = resData.choices?.[0]?.message?.content?.trim();
          if (answerText) {
            return NextResponse.json({
              success: true,
              answer: answerText,
              source: modelCandidate
            });
          }
        } else {
          lastErrorMsg = await nimRes.text();
        }
      } catch (candidateErr: any) {
        clearTimeout(timeoutId);
        lastErrorMsg = candidateErr?.message || 'Request error';
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: `Q&A assistant error: ${lastErrorMsg.slice(0, 100) || 'Unable to fetch answer from AI model.'}`
      },
      { status: 502 }
    );

  } catch (error: any) {
    console.error('[FormBuddy Q&A] Error in ask-question route:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process question.' },
      { status: 500 }
    );
  }
}
