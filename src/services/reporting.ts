import { api } from '../lib/api';

export const reportingService = {
    getVoucherReport: async (params: any) => {
        const query = new URLSearchParams(params).toString();
        return api(`/api/services/app/BookKeeping/GetVoucherReport?${query}`, {
            method: 'GET',
        });
    },
    getBalanceSheet: async (date: string) => {
        return api('/api/Reports/BalanceSheet', {
            method: 'POST',
            body: JSON.stringify({ todate: date }),
        });
    },
    getPNL: async (fromDate: string, toDate: string) => {
        return api('/api/Reports/PNL', {
            method: 'POST',
            body: JSON.stringify({ fromdate: fromDate, todate: toDate }),
        });
    },
    getInvoices: async () => {
        return api('/api/services/app/InvoiceInfo/GetInvoiceInfoList', {
            method: 'GET'
        });
    },
    getBills: async () => {
        return api('/api/services/app/BillingInfo/GetBillingInfoList', {
            method: 'GET'
        });
    },
    getBanks: async () => {
        return api('/api/services/app/Bank/GetBanks', {
            method: 'GET'
        });
    },
    getCustomers: async (title: string = '') => {
        const query = title ? `title=${encodeURIComponent(title)}` : 'title=%20';
        return api(`/api/services/app/Customer/GetCustomersTitleResponse?${query}`, {
            method: 'GET'
        });
    },
    getVendors: async (title: string = '') => {
        const query = title ? `title=${encodeURIComponent(title)}` : 'title=%20';
        return api(`/api/services/app/Supplier/GetVendorsTitleResponse?${query}`, {
            method: 'GET'
        });
    },
    getItems: async (title: string = '') => {
        const query = title ? `title=${encodeURIComponent(title)}` : 'title=%20';
        return api(`/api/services/app/Item/GetItemsTitleResponse?${query}`, {
            method: 'GET'
        });
    },
    getBankInfo: async () => {
        return api('/api/services/app/Bank/GetBankInfoList', {
            method: 'GET',
        });
    }
};
