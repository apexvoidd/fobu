import { NextRequest, NextResponse } from 'next/server';

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

    // If API Key is missing or default placeholder, provide intelligent contextual answer
    if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_NVIDIA_NIM_API_KEY') {
      const qLower = question.toLowerCase();
      let mockAnswer = `Based on your form "${formContext?.formTitle || 'Official Form'}": `;

      if (qLower.includes('document') || qLower.includes('attach') || qLower.includes('id') || qLower.includes('proof')) {
        const docs = formContext?.requiredDocuments || ['Government Photo ID', 'Proof of Address'];
        mockAnswer += `The required documents listed for this form are: ${docs.join(', ')}. Make sure all copies are legible and not expired.`;
      } else if (qLower.includes('time') || qLower.includes('long')) {
        mockAnswer += `The estimated time to complete this form is approximately ${formContext?.estimatedTime || '15 - 20 minutes'}.`;
      } else if (qLower.includes('sign') || qLower.includes('ink') || qLower.includes('signature')) {
        mockAnswer += `Signatures should be signed in black or dark blue ink. Do not use pencil or felt tip markers that bleed through paper.`;
      } else if (qLower.includes('mistake') || qLower.includes('error') || qLower.includes('avoid')) {
        const mistakes = formContext?.commonMistakes || ['Double check spelling', 'Verify all required fields are filled'];
        mockAnswer += `Key common mistakes to avoid for this form: ${mistakes.join('; ')}.`;
      } else {
        mockAnswer += `Make sure to complete all required fields accurately. If you need step-by-step guidance on any field, click on that field card above for detailed examples.`;
      }

      return NextResponse.json({
        success: true,
        answer: mockAnswer,
        source: 'context-assistant'
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

    // Try primary text model, fallback to secondary model if needed
    const candidateModels = [
      nimModel,
      'meta/llama-3.3-70b-instruct',
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.2-11b-vision-instruct',
      'mistralai/mixtral-8x22b-instruct'
    ];

    let lastError = '';

    for (const modelCandidate of candidateModels) {
      try {
        console.log(`[FormBuddy Q&A] Attempting model ${modelCandidate}...`);
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
          })
        });

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
          lastError = await nimRes.text();
          console.warn(`[FormBuddy Q&A] Model ${modelCandidate} HTTP ${nimRes.status}: ${lastError.slice(0, 150)}`);
        }
      } catch (candidateErr: any) {
        console.warn(`[FormBuddy Q&A] Error calling model ${modelCandidate}:`, candidateErr?.message || candidateErr);
      }
    }

    // Fallback contextual answer if model APIs fail
    return NextResponse.json({
      success: true,
      answer: `For "${formContext?.formTitle || 'this form'}", ensure all required entries match your legal documents. Key required items include: ${(formContext?.requiredDocuments || ['Government ID']).join(', ')}.`,
      source: 'fallback'
    });

  } catch (error: any) {
    console.error('[FormBuddy Q&A] Error in ask-question route:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process question.' },
      { status: 500 }
    );
  }
}
