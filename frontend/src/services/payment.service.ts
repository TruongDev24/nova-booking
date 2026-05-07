import apiClient from './apiClient';

export interface PaymentLinkResponse {
    bin: string;
    checkoutUrl: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    description: string;
    orderCode: number;
    qrCode: string;
}

export const paymentService = {
    createLink: async (bookingId: string): Promise<PaymentLinkResponse> => {
        const response = await apiClient.post<PaymentLinkResponse>('/payment/create-link', {bookingId});
        return response.data;
    },
};
