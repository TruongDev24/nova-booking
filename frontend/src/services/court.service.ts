import apiClient from './apiClient';

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
  avgRating: number;
  totalReviews: number;
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
  getAll: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) => {
    const response = await apiClient.get<PaginatedCourts>('/courts', { params });
    return response.data;
  },

  getOne: async (id: string) => {
    const response = await apiClient.get<Court>(`/courts/${id}`);
    return response.data;
  },

  create: async (data: FormData) => {
    const response = await apiClient.post<Court>('/courts', data);
    return response.data;
  },

  update: async (id: string, data: FormData) => {
    const response = await apiClient.patch<Court>(`/courts/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/courts/${id}`);
    return response.data;
  },
};
