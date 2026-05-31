import apiClient from "@/services/apiClient";
import { AnalyticsResponse } from "@/types/analytics";

export const analyticsService = {
    getAdminAnalytics: async (
        period?: number,
        startDate?: string,
        endDate?: string,
    ): Promise<AnalyticsResponse> => {
        const response = await apiClient.get<AnalyticsResponse>(`/admin/analytics`, {
            params: { period, startDate, endDate },
        });
        return response.data;
    },
};

