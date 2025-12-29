export type IntentType = 'LOGIN' | 'RECORD_SALE' | 'RECORD_PURCHASE' | 'GET_REPORT' | 'SWITCH_TENANT' | 'UNKNOWN';

export interface Intent {
    type: IntentType;
    params: any;
}

export const mapIntent = (input: string): Intent => {
    const text = input.toLowerCase();

    if (text.includes('login') || text.includes('sign in') || text.includes('authenticate')) {
        // Extract from ORIGINAL input to preserve case
        const email = input.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];

        // Look for password after keywords in the ORIGINAL input
        // Keywords are case-insensitive, but capture is as-is
        const pwMatch = input.match(/(?:password|with|and|is)\s+([a-zA-Z0-9!@#$%^&*()_+]{3,})/i);
        const password = pwMatch ? pwMatch[1] : null;

        // Extract Tenant ID from ORIGINAL input (e.g. "tenant O1EG681Y4V")
        const tenantMatch = input.match(/tenant\s+([a-zA-Z0-9]+)/i);
        const tenantId = tenantMatch ? tenantMatch[1] : null;

        return { type: 'LOGIN', params: { email, password, tenantId } };
    }

    // Prioritize Reports/Ledgers over recording actions
    if (text.includes('report') || text.includes('ledger') || text.includes('statement') ||
        text.includes('balance sheet') || text.includes('profit and loss') || text.includes('p&l')) {
        return {
            type: 'GET_REPORT', params: {
                isBalanceSheet: text.includes('balance'),
                isProfitLoss: text.includes('profit') || text.includes('p&l'),
                ledgerTitle: text.includes('ledger') ? 'Sales Ledger' : null
            }
        };
    }

    if (text.includes('sale') || text.includes('invoice') || text.includes('sold')) {
        const amount = text.match(/\d+(\.\d+)?/)?.[0];
        return { type: 'RECORD_SALE', params: { amount } };
    }

    if (text.includes('purchase') || text.includes('bill') || text.includes('bought')) {
        const amount = text.match(/\d+(\.\d+)?/)?.[0];
        return { type: 'RECORD_PURCHASE', params: { amount } };
    }

    if (text.includes('switch') || text.includes('change company') || text.includes('company list') || text.includes('show company')) {
        return { type: 'SWITCH_TENANT', params: {} };
    }

    return { type: 'UNKNOWN', params: {} };
};
