const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export const aiService = {
    getAccountantResponse: async (messages: any[], apiKey: string) => {
        const systemPrompt = {
            role: 'system',
            content: `You are the ISOLATERP Senior Global AI Accountant. 
      Your tone is strictly professional, business-oriented, and adheres to high financial and accounting standards.
      Your goal is to assist users with ERP actions (bookkeeping, reports, tenant management).
      You adapt to different worldwide styles of querying (regional terminology) but always interpret them into professional accounting actions.
      Stay concise and proactive. When you learn a user's style, offer it as a suggestion in future turns without forcing it.`
        };

        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [systemPrompt, ...messages],
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            throw new Error('AI Service failed to respond.');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }
};
