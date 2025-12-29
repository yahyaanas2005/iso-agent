import { api } from '../lib/api';

export const reportingService = {
    getVoucherReport: async (params: any) => {
        // Note: Assuming path based on prompt as it was missing in JSON
        const query = new URLSearchParams(params).toString();
        return api(`/api/services/app/BookKeeping/GetVoucherReport?${query}`, {
            method: 'GET',
        });
    },

    getBankInfo: async () => {
        return api('/api/services/app/Bank/GetBankInfoList', {
            method: 'GET',
        });
    }
};
