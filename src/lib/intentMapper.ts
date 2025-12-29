export type IntentType = 'LOGIN' | 'RECORD_SALE' | 'RECORD_PURCHASE' | 'GET_REPORT' | 'GET_LEDGER' | 'LIST_CUSTOMERS' | 'LIST_ITEMS' | 'LIST_VENDORS' | 'SWITCH_TENANT' | 'HELP' | 'UNKNOWN';

export interface Intent {
    type: IntentType;
    params: any;
}

export const mapIntent = (input: string): Intent => {
    const text = input.toLowerCase();

    if (text.includes('login') || text.includes('sign in') || text.includes('authenticate')) {
        const email = input.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
        const explicitPwMatch = input.match(/password\s+([a-zA-Z0-9!@#$%^&*()_+]{3,})/i);
        const genericPwMatch = input.match(/(?:is|and|with)\s+((?!email|password|tenant|login|sign)[a-zA-Z0-9!@#$%^&*()_+]{3,})/i);
        const password = explicitPwMatch ? explicitPwMatch[1] : (genericPwMatch ? genericPwMatch[1] : null);
        const tenantMatch = input.match(/tenant\s+([a-zA-Z0-9]+)/i);
        const tenantId = tenantMatch ? tenantMatch[1] : null;

        return { type: 'LOGIN', params: { email, password, tenantId } };
    }

    if (text.includes('help') || text.includes('how to') || text.includes('microphone') || text.includes('what can you do')) {
        return { type: 'HELP', params: {} };
    }

    if (text.includes('ledger') || text.includes('statement for')) {
        return { type: 'GET_LEDGER', params: { account: text.replace(/ledger|account history|statement for/gi, '').trim() } };
    }

    if (text.includes('customer list') || text.includes('show customers')) {
        return { type: 'LIST_CUSTOMERS', params: {} };
    }

    if (text.includes('item list') || text.includes('inventory') || text.includes('show items')) {
        return { type: 'LIST_ITEMS', params: {} };
    }

    if (text.includes('vendor list') || text.includes('suppliers')) {
        return { type: 'LIST_VENDORS', params: {} };
    }

    if (text.includes('report') || text.includes('balance sheet') || text.includes('profit and loss') || text.includes('p&l')) {
        return { type: 'GET_REPORT', params: {} };
    }

    if (text.includes('sale') || text.includes('invoice') || text.includes('sold')) {
        const amount = text.match(/\d+(\.\d+)?/)?.[0];
        return { type: 'RECORD_SALE', params: { amount } };
    }

    if (text.includes('purchase') || text.includes('bill') || text.includes('bought')) {
        const amount = text.match(/\d+(\.\d+)?/)?.[0];
        return { type: 'RECORD_PURCHASE', params: { amount } };
    }

    if (text.includes('switch') || text.includes('change company') || text.includes('select tenant')) {
        return { type: 'SWITCH_TENANT', params: {} };
    }

    return { type: 'UNKNOWN', params: {} };
};
