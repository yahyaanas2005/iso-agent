import { api } from '../lib/api';

export const bookkeepingService = {
    recordSale: async (data: any) => {
        return api('/api/services/app/InvoiceInfo/CreateInventoryItemInvoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json-patch+json'
            },
            body: JSON.stringify(data),
        });
    },

    recordPurchase: async (data: any) => {
        return api('/api/services/app/BillingInfo/CreateInventoryItemBilling', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json-patch+json'
            },
            body: JSON.stringify(data),
        });
    }
};
