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
    bookedHours: number;
    occupancyRate: number;
    avgRating: number;
}

export interface AnalyticsOverview {
    totalRevenue: number;
    totalBookedHours: number;
    occupancyRate: number;
    cancelRate: number;
    totalBookings: number;
    aov: number;
    activeCustomers: number;
}

export interface PaymentMethodStats {
    method: string;
    count: number;
    amount: number;
}

export interface WeeklyDensityStats {
    day: string;
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
    overview: AnalyticsOverview;
    revenueChart: RevenueData[];
    courtPerformance: CourtPerformance[];
    topVipCustomers: VipCustomer[];
    peakHours: PeakHour[];
    paymentMethods: PaymentMethodStats[];
    weeklyDensity: WeeklyDensityStats[];
    cancelReasons: CancelReasonStats[];
    recentReviews: RecentReviewStats[];
}

