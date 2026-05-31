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

export interface PaymentMethodStats {
  method: string;
  count: number;
  amount: number;
}

export interface WeeklyDensityStats {
  day: string; // "Thứ Hai", "Thứ Ba", v.v.
  count: number;
}

export interface CancelReasonStats {
  reason: string;
  count: number;
}

export interface RecentReviewStats {
  bookingId: string;
  courtName: string;
  userName: string;
  rating: number;
  comment: string;
  bookingDate: string;
}

export interface AnalyticsResponse {
  overview: {
    totalRevenue: number;
    totalBookedHours: number;
    occupancyRate: number;
    cancelRate: number;
    totalBookings: number;
    aov: number;
    activeCustomers: number;
    debugId?: number;
  };
  revenueChart: {
    date: string;
    revenue: number;
  }[];
  courtPerformance: {
    courtName: string;
    revenue: number;
    bookings: number;
    bookedHours: number;
    occupancyRate: number;
    avgRating: number;
  }[];
  topVipCustomers: VipCustomer[];
  peakHours: PeakHour[];
  paymentMethods: PaymentMethodStats[];
  weeklyDensity: WeeklyDensityStats[];
  cancelReasons: CancelReasonStats[];
  recentReviews: RecentReviewStats[];
}
