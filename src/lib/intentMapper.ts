export type IntentType = 'LOGIN' | 'RECORD_SALE' | 'RECORD_PURCHASE' | 'GET_REPORT' | 'SWITCH_TENANT' | 'UNKNOWN';

export interface Intent {
    type: IntentType;
    params: any;
}

export const mapIntent = (input: string): Intent => {
    const text = input.toLowerCase();

    if (text.includes('login') || text.includes('sign in')) {
        return { type: 'LOGIN', params: {} };
    }

    if (text.includes('sale') || text.includes('invoice') || text.includes('sold')) {
        // Basic extraction logic
        const amount = text.match(/\d+(\.\d+)?/)?.[0];
        return { type: 'RECORD_SALE', params: { amount } };
    }

    if (text.includes('purchase') || text.includes('bill') || text.includes('bought')) {
        const amount = text.match(/\d+(\.\d+)?/)?.[0];
        return { type: 'RECORD_PURCHASE', params: { amount } };
    }

    if (text.includes('report') || text.includes('how is the company doing')) {
        return { type: 'GET_REPORT', params: {} };
    }

    if (text.includes('switch') || text.includes('change company')) {
        return { type: 'SWITCH_TENANT', params: {} };
    }

    return { type: 'UNKNOWN', params: {} };
};
