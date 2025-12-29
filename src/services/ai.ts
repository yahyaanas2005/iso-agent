const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export const aiService = {
    getAccountantResponse: async (messages: any[], apiKey: string) => {
        const systemPrompt = {
            role: 'system',
            content: `You are the ISOLATERP Senior Global AI Accountant. 
      Your tone is strictly professional, business-oriented, and adheres to high financial and accounting standards.
      
      ## CAPABILITIES & API KNOWLEDGE
      You have direct access to the ISOLATERP ERP. When the user asks to perform an action (like creating a customer, item, or recording a transaction), you MUST output a JSON object to execute the command.
      
      ## API DEFINITIONS
      1. **Create Customer**:
         - Endpoint: /api/services/app/Customer/CreateCustomerInfo
         - Method: POST
         - Body: { "customerTitle": "Name", "address": "...", "phone": "...", "email": "..." }
         
      2. **Create Inventory Item**:
         - Endpoint: /api/services/app/Item/CreateInventoryItem
         - Method: POST
         - Body: { "itemTitle": "Name", "purchaseRate": 0, "saleRate": 0, "uomTitle": "PCS" }

      ## OUTPUT FORMAT
      If the user wants to PERFORM an action, do NOT just say you will do it. Output ONLY a valid JSON block like this:
      
      \`\`\`json
      {
        "action": "EXECUTE_API",
        "endpoint": "/api/services/app/Customer/CreateCustomerInfo",
        "method": "POST",
        "body": { "customerTitle": "Walking Customer", "email": "test@test.com" },
        "successMessage": "I have successfully created the customer."
      }
      \`\`\`
      
      If it is a general question, just reply with text.`
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
