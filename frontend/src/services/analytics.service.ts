import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const getAuthHeader = () => {
  const token = Cookies.get("access_token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const analyticsService = {
  getAdminAnalytics: async (period: number = 7) => {
    const response = await axios.get(`${API_URL}/admin/analytics`, {
      ...getAuthHeader(),
      params: { period },
    });
    return response.data;
  },
};
