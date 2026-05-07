import apiClient from "./apiClient";

export interface TimeSlot {
    startTime: string;
    endTime: string;
    isBooked: boolean;
    isPast: boolean;
    isClosed: boolean;
    price: number;
}

export interface CreateBookingData {
    courtId: string;
    bookingDate: string;
    slots: string[];
    startTime?: string;
    endTime?: string;
    totalPrice: number;
}

export interface CreateBookingResponse {
    checkoutUrl: string;
    orderCode: number;
}

export interface Booking {
    id: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    refundStatus: 'NONE' | 'PENDING' | 'COMPLETED';
    createdAt: string;
    user?: {
        id: string;
        fullName: string;
        phone: string;
        email: string;
        bankName?: string;
        bankAccountNumber?: string;
        bankAccountName?: string;
    };
    court?: {
        name: string;
        location: string;
    };
    review?: {
        id: string;
        rating: number;
        comment: string;
    };
}

export interface PaginatedBookings {
    data: Booking[];
    meta: {
        total: number;
        page: number;
        limit: number;
        lastPage: number;
    };
}

export const bookingService = {
    getSlots: async (courtId: string, date: string): Promise<TimeSlot[]> => {
        const response = await apiClient.get(`/bookings/courts/${courtId}/slots`, {
            params: {date},
        });
        return response.data?.data || response.data || [];
    },

    createBooking: async (data: CreateBookingData): Promise<CreateBookingResponse> => {
        const response = await apiClient.post(`/bookings`, data);
        return response.data;
    },

    getMyBookings: async () => {
        const response = await apiClient.get(`/bookings/my-bookings`);
        return response.data;
    },

    cancelBooking: async (id: string) => {
        const response = await apiClient.patch(`/bookings/${id}/cancel`, {});
        return response.data;
    },

    // --- Admin Methods ---

    getAllAdmin: async (params: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        refundStatus?: string;
        startDate?: string;
        endDate?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    } = {}): Promise<PaginatedBookings> => {
        const response = await apiClient.get(`/bookings/admin`, {params});
        return response.data;
    },

    confirmBookingAdmin: async (id: string) => {
        const response = await apiClient.patch(`/bookings/admin/${id}/confirm`, {});
        return response.data;
    },

    cancelBookingAdmin: async (id: string) => {
        const response = await apiClient.patch(`/bookings/admin/${id}/cancel`, {});
        return response.data;
    },

    markAsRefundedAdmin: async (id: string) => {
        const response = await apiClient.patch(`/bookings/admin/${id}/refund`, {});
        return response.data;
    },
};
