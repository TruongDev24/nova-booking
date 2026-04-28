export interface VipCustomer {
  userId: string;
  name: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
}

export interface PeakHour {
  hour: string;
  count: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface CourtPerformance {
  courtName: string;
  revenue: number;
  bookings: number;
}

export interface AnalyticsOverview {
  totalRevenue: number;
  totalBookedHours: number;
  occupancyRate: number;
  cancelRate: number;
}

export interface AnalyticsResponse {
  overview: AnalyticsOverview;
  revenueChart: RevenueData[];
  courtPerformance: CourtPerformance[];
  topVipCustomers: VipCustomer[];
  peakHours: PeakHour[];
}
