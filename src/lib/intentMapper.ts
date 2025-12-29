export type IntentType = 'LOGIN' | 'RECORD_SALE' | 'RECORD_PURCHASE' | 'GET_REPORT' | 'GET_LEDGER' | 'LIST_CUSTOMERS' | 'LIST_ITEMS' | 'LIST_VENDORS' | 'SEARCH_CUSTOMER' | 'SWITCH_TENANT' | 'HELP' | 'UNKNOWN';

export interface Intent {
    type: IntentType;
    params: any;
}

export const mapIntent = (input: string): Intent => {
    const text = input.toLowerCase();

    if (text.includes('login') || text.includes('sign in') || text.includes('authenticate')) {
        const emailMatch = input.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const email = emailMatch?.[0];

        // Strategy 1: Explicit "password [code]"
        const explicitPwMatch = input.match(/password\s+([a-zA-Z0-9!@#$%^&*()_+]{3,})/i);
        // Strategy 2: "with [code]" or "and [code]"
        const genericPwMatch = input.match(/(?:is|and|with)\s+((?!email|password|tenant|login|sign)[a-zA-Z0-9!@#$%^&*()_+]{3,})/i);

        let password = explicitPwMatch ? explicitPwMatch[1] : (genericPwMatch ? genericPwMatch[1] : null);

        // Strategy 3: Positional fallback "login [email] [password]"
        if (!password && email) {
            // Find token immediately after email
            const parts = input.split(/\s+/);
            const emailIndex = parts.findIndex(p => p.includes('@'));
            if (emailIndex !== -1 && parts[emailIndex + 1] && !parts[emailIndex + 1].toLowerCase().includes('tenant')) {
                password = parts[emailIndex + 1];
            }
        }

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

    if (text.includes('customer') && (text.includes('search') || text.includes('find') || text.includes('look up'))) {
        const query = text.replace(/search|customer|find|look up|for/gi, '').trim();
        return { type: 'SEARCH_CUSTOMER', params: { query } };
    }

    // List Customers (Exclude creation commands)
    if ((text.includes('customer') || text.includes('client')) && !text.includes('create') && !text.includes('add') && !text.includes('new')) {
        return { type: 'LIST_CUSTOMERS', params: {} };
    }

    // List Items (Exclude creation commands)
    if ((text.includes('item') || text.includes('inventory') || text.includes('stock')) && !text.includes('create') && !text.includes('add') && !text.includes('new')) {
        return { type: 'LIST_ITEMS', params: {} };
    }

    // List Vendors (Exclude creation commands)
    if ((text.includes('vendor') || text.includes('supplier')) && !text.includes('create') && !text.includes('add') && !text.includes('new')) {
        return { type: 'LIST_VENDORS', params: {} };
    }

    // Enhanced Report Intent with Date Parsing
    if (text.includes('report') || text.includes('balance sheet') || text.includes('profit') || text.includes('p&l') || text.includes('pnl')) {
        let dateRange = { from: '', to: '' };
        if (text.includes('last 6 months')) {
            const d = new Date();
            d.setMonth(d.getMonth() - 6);
            dateRange.from = d.toISOString();
            dateRange.to = new Date().toISOString();
        }
        return {
            type: 'GET_REPORT',
            params: {
                isPnl: text.includes('profit') || text.includes('p&l') || text.includes('pnl'),
                dateRange
            }
        };
    }

    if ((text.includes('sale') || text.includes('invoice') || text.includes('sold')) && !text.includes('show') && !text.includes('list') && !text.includes('get')) {
        const amount = text.match(/\d+(\.\d+)?/)?.[0];
        return { type: 'RECORD_SALE', params: { amount } };
    }

    if ((text.includes('purchase') || text.includes('bill') || text.includes('bought')) && !text.includes('show') && !text.includes('list') && !text.includes('get')) {
        const amount = text.match(/\d+(\.\d+)?/)?.[0];
        return { type: 'RECORD_PURCHASE', params: { amount } };
    }

    if (text.includes('switch') || text.includes('change company') || text.includes('select tenant') || text.includes('pin')) {
        const pinMatch = input.match(/pin:?\s*([a-zA-Z0-9]+)/i);
        return { type: 'SWITCH_TENANT', params: { pin: pinMatch ? pinMatch[1] : null } };
    }

    return { type: 'UNKNOWN', params: {} };
};
