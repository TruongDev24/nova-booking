import apiClient from './apiClient';

export interface ChangePasswordDto {
    oldPassword: string;
    newPassword: string;
}

export interface ForgotPasswordDto {
    email: string;
}

export interface ResetPasswordDto {
    token: string;
    newPassword: string;
}

export const authService = {
    changePassword: async (data: ChangePasswordDto) => {
        const response = await apiClient.patch('/auth/change-password', data);
        return response.data;
    },

    forgotPassword: async (data: ForgotPasswordDto) => {
        const response = await apiClient.post('/auth/forgot-password', data);
        return response.data;
    },

    resetPassword: async (data: ResetPasswordDto) => {
        const response = await apiClient.post('/auth/reset-password', data);
        return response.data;
    },

    getProfile: async () => {
        const response = await apiClient.get('/auth/profile');
        return response.data;
    },
};
