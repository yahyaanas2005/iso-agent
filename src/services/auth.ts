import { api } from '../lib/api';

export const authService = {
    login: async (credentials: any) => {
        return api('/api/TokenAuth/Authenticate', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    },

    getTenants: async (email: string) => {
        return api(`/api/services/app/Account/GetLoginTenants?emailAddress=${encodeURIComponent(email)}`, {
            method: 'GET',
        });
    }
};
