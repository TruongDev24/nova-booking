import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getAuthHeader = () => {
  const token = Cookies.get('access_token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export interface Court {
  id: string;
  name: string;
  location: string;
  pricePerHour: number;
  description: string;
  openingTime: string;
  closingTime: string;
  images: string[];
  amenities: string[];
  ownerId: string;
}

export interface PaginatedCourts {
  data: Court[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

export const courtService = {
  getAll: async (page = 1, limit = 10, search = '') => {
    const response = await axios.get<PaginatedCourts>(`${API_URL}/courts`, {
      ...getAuthHeader(),
      params: { page, limit, search },
    });
    return response.data;
  },

  getOne: async (id: string) => {
    const response = await axios.get<Court>(`${API_URL}/courts/${id}`, getAuthHeader());
    return response.data;
  },

  create: async (data: FormData) => {
    const response = await axios.post<Court>(`${API_URL}/courts`, data, getAuthHeader());
    return response.data;
  },

  update: async (id: string, data: FormData) => {
    const response = await axios.patch<Court>(`${API_URL}/courts/${id}`, data, getAuthHeader());
    return response.data;
  },

  delete: async (id: string) => {
    const response = await axios.delete(`${API_URL}/courts/${id}`, getAuthHeader());
    return response.data;
  },
};
