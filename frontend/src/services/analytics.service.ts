import apiClient from "./apiClient";

export const analyticsService = {
    getAdminAnalytics: async (period: number = 7) => {
        const response = await apiClient.get(`/admin/analytics`, {
            params: {period},
        });
        return response.data;
    },
};
