import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isBooked: boolean;
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

export const bookingService = {
  getSlots: async (courtId: string, date: string): Promise<TimeSlot[]> => {
    console.log(`[API] Fetching slots for court ${courtId} on date ${date}`);
    const response = await axios.get(`${API_URL}/bookings/courts/${courtId}/slots`, {
      params: { date },
    });
    console.log("[API] Slots Response:", response.data);
    // Trả về mảng dữ liệu, hỗ trợ cả cấu trúc lồng nhau nếu có
    return response.data?.data || response.data || [];
  },

  createBooking: async (data: CreateBookingData) => {
    const token = Cookies.get("access_token");
    const response = await axios.post(`${API_URL}/bookings`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  getMyBookings: async () => {
    const token = Cookies.get("access_token");
    const response = await axios.get(`${API_URL}/bookings/my-bookings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  cancelBooking: async (id: string) => {
    const token = Cookies.get("access_token");
    const response = await axios.patch(`${API_URL}/bookings/${id}/cancel`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};
