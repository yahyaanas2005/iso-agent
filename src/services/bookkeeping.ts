import { api } from '../lib/api';

export const bookkeepingService = {
    recordSale: async (data: any) => {
        return api('/api/services/app/InvoiceInfo/CreateInventoryItemInvoice', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    recordPurchase: async (data: any) => {
        // Note: Assuming path based on prompt as it was missing in JSON
        return api('/api/services/app/BillingInfo/CreateInventoryItemBilling', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
};
