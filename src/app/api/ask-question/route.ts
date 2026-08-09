import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 15;
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
    const nimModel = process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.1-8b-instruct';
    const nimBaseUrl = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';

    const getContextualAnswer = (q: string) => {
      const qLower = q.toLowerCase();
      let answer = `Based on "${formContext?.formTitle || 'Official Form'}": `;

      if (qLower.includes('document') || qLower.includes('attach') || qLower.includes('id') || qLower.includes('proof')) {
        const docs = formContext?.requiredDocuments || ['Government Photo ID', 'Proof of Address'];
        answer += `The required documents for this form are: ${docs.join(', ')}. Make sure all copies are clear and not expired.`;
      } else if (qLower.includes('time') || qLower.includes('long')) {
        answer += `The estimated completion time is approximately ${formContext?.estimatedTime || '10 - 15 minutes'}.`;
      } else if (qLower.includes('sign') || qLower.includes('ink') || qLower.includes('signature')) {
        answer += `Sign in black or dark blue ink. Ensure your signature matches your official photo ID.`;
      } else if (qLower.includes('mistake') || qLower.includes('error') || qLower.includes('avoid')) {
        const mistakes = formContext?.commonMistakes || ['Verify all required fields are filled', 'Double check spelling'];
        answer += `Common errors to avoid: ${mistakes.join('; ')}.`;
      } else {
        answer += `Complete all required fields accurately. Check the field-by-field cards on the right for step-by-step guidance and examples for each question.`;
      }
      return answer;
    };

    if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_NVIDIA_NIM_API_KEY') {
      return NextResponse.json({
        success: true,
        answer: getContextualAnswer(question),
        source: 'formbuddy-assistant'
      });
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
      'meta/llama-3.1-8b-instruct',
      'meta/llama-3.2-11b-vision-instruct'
    ];

    for (const modelCandidate of candidateModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second fast timeout

      try {
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
        }
      } catch (candidateErr: any) {
        clearTimeout(timeoutId);
      }
    }

    return NextResponse.json({
      success: true,
      answer: getContextualAnswer(question),
      source: 'formbuddy-assistant'
    });

  } catch (error: any) {
    console.error('[FormBuddy Q&A] Error in ask-question route:', error);
    return NextResponse.json({
      success: true,
      answer: 'Please ensure all required entries match your legal documents. Double-check required signatures and date fields before submitting.',
      source: 'fallback'
    });
  }
}
