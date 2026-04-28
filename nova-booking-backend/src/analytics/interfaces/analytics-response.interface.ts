export interface VipCustomer {
  userId: string;
  name: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
}

export interface PeakHour {
  hour: string; // "00h", "01h", etc.
  count: number;
}

export interface AnalyticsResponse {
  overview: {
    totalRevenue: number;
    totalBookedHours: number;
    occupancyRate: number;
    cancelRate: number;
  };
  revenueChart: {
    date: string;
    revenue: number;
  }[];
  courtPerformance: {
    courtName: string;
    revenue: number;
    bookings: number;
  }[];
  topVipCustomers: VipCustomer[];
  peakHours: PeakHour[];
}
