import apiClient from "@/services/apiClient";

export interface Review {
    id: string;
    userId: string;
    courtId: string;
    bookingId: string;
    rating: number;
    comment: string;
    createdAt: string;
    user: {
        fullName: string;
        avatar?: string | null;
    };
}

export interface PaginatedReviews {
    data: Review[];
    meta: {
        total: number;
        page: number;
        limit: number;
        lastPage: number;
    };
}

export const reviewService = {
    getCourtReviews: async (courtId: string, page = 1, limit = 10): Promise<PaginatedReviews> => {
        const response = await apiClient.get<PaginatedReviews>(`/reviews/court/${courtId}`, {
            params: { page, limit },
        });
        return response.data;
    },
};
