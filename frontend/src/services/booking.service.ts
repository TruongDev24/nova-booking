import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

export interface Booking {
  id: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  user?: {
    fullName: string;
    phone: string;
    email: string;
  };
  court?: {
    name: string;
    location: string;
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

const getAuthHeader = () => {
  const token = Cookies.get("access_token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const bookingService = {
  getSlots: async (courtId: string, date: string): Promise<TimeSlot[]> => {
    const response = await axios.get(`${API_URL}/bookings/courts/${courtId}/slots`, {
      params: { date },
    });
    return response.data?.data || response.data || [];
  },

  createBooking: async (data: CreateBookingData) => {
    const response = await axios.post(`${API_URL}/bookings`, data, getAuthHeader());
    return response.data;
  },

  getMyBookings: async () => {
    const response = await axios.get(`${API_URL}/bookings/my-bookings`, getAuthHeader());
    return response.data;
  },

  cancelBooking: async (id: string) => {
    const response = await axios.patch(`${API_URL}/bookings/${id}/cancel`, {}, getAuthHeader());
    return response.data;
  },

  // --- Admin Methods ---

  getAllAdmin: async (page = 1, limit = 10, search = '', status?: string, startDate?: string, endDate?: string): Promise<PaginatedBookings> => {
    const response = await axios.get(`${API_URL}/bookings/admin`, {
      ...getAuthHeader(),
      params: { page, limit, search, status, startDate, endDate },
    });
    return response.data;
  },

  confirmBookingAdmin: async (id: string) => {
    const response = await axios.patch(`${API_URL}/bookings/admin/${id}/confirm`, {}, getAuthHeader());
    return response.data;
  },

  cancelBookingAdmin: async (id: string) => {
    const response = await axios.patch(`${API_URL}/bookings/admin/${id}/cancel`, {}, getAuthHeader());
    return response.data;
  },
};
