import apiClient from "@/services/apiClient";
import { AnalyticsResponse } from "@/types/analytics";

export const analyticsService = {
    getAdminAnalytics: async (period: number = 7): Promise<AnalyticsResponse> => {
        const response = await apiClient.get<AnalyticsResponse>(`/admin/analytics`, {
            params: {period},
        });
        return response.data;
    },
};

