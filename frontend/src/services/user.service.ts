import apiClient from "./apiClient";

export interface BankInfo {
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
}

export interface User {
    id: string;
    fullName: string;
    email: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
}

export const userService = {
    updateBankInfo: async (data: BankInfo) => {
        const response = await apiClient.patch("/users/profile/bank", data);
        return response.data;
    },
    getProfile: async (): Promise<User> => {
        const response = await apiClient.get("/auth/profile");
        return response.data;
    }
};
