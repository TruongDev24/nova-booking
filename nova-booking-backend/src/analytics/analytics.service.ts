import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsResponse,
  VipCustomer,
} from './interfaces/analytics-response.interface';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAdminAnalytics(
    userId: string,
    period?: number,
    startDateParam?: string,
    endDateParam?: string,
  ): Promise<AnalyticsResponse> {
    // 1. Date Range Handling (Vietnam Timezone)
    const getVNDateString = (date: Date) => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date);
    };

    const getDaysDiff = (startStr: string, endStr: string): number => {
      try {
        const startParts = startStr.split('-').map(Number);
        const endParts = endStr.split('-').map(Number);
        if (startParts.length === 3 && endParts.length === 3) {
          const startDateObj = new Date(
            startParts[0],
            startParts[1] - 1,
            startParts[2],
          );
          const endDateObj = new Date(
            endParts[0],
            endParts[1] - 1,
            endParts[2],
          );
          const diffTime = endDateObj.getTime() - startDateObj.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          return isNaN(diffDays) || diffDays < 0 ? 7 : diffDays + 1;
        }
      } catch {
        return 7;
      }
      return 7;
    };

    let startDateStr: string;
    let endDateStr: string;
    let periodDays = period || 7;

    if (startDateParam && endDateParam) {
      startDateStr = startDateParam;
      endDateStr = endDateParam;
      periodDays = getDaysDiff(startDateParam, endDateParam);
    } else {
      const now = new Date();
      endDateStr = getVNDateString(now);
      const startDateObj = new Date(now);
      startDateObj.setDate(now.getDate() - periodDays + 1);
      startDateStr = getVNDateString(startDateObj);
    }

    const startParts = startDateStr.split('-').map(Number);
    const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);

    // 2. Fetch Base Data
    const courts = await this.prisma.court.findMany({
      where: { ownerId: userId },
    });
    const courtIds = courts.map((c) => c.id);

    // FETCH BOOKINGS with payment and review details
    const allBookings = await this.prisma.booking.findMany({
      where: { courtId: { in: courtIds } },
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
        payment: { select: { method: true, amount: true } },
        review: { select: { rating: true, comment: true, createdAt: true } },
      },
    });

    // Filtered by current period for calculations and charts
    const periodBookings = allBookings.filter(
      (b) => b.bookingDate >= startDateStr && b.bookingDate <= endDateStr,
    );

    // 3. Logic for SUCCESS (Revenue/Hours) - PERIOD BOUND
    const successPeriod = periodBookings.filter((b) => {
      const isPaid = b.paymentStatus === 'PAID';
      const isCompleted = b.status === 'COMPLETED';
      const isCancelled = b.status === 'CANCELLED';
      const isRefunded = b.paymentStatus === 'REFUNDED';
      return (isPaid || isCompleted) && !isCancelled && !isRefunded;
    });

    // Helper to calculate hours difference
    const getBookingHours = (start: string, end: string): number => {
      try {
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);
        const diff = endHour * 60 + endMin - (startHour * 60 + startMin);
        return diff > 0 ? diff / 60 : 1;
      } catch {
        return 1;
      }
    };

    // 4. Aggregations for Overview (Period bound)
    const totalRevenue = successPeriod.reduce(
      (sum, b) => sum + b.totalPrice,
      0,
    );

    const totalBookedHours = successPeriod.reduce(
      (sum, b) => sum + getBookingHours(b.startTime, b.endTime),
      0,
    );

    // Cancellation Rate for the Period: PAID & then CANCELLED in this period
    const paidBookingsPeriod = periodBookings.filter(
      (b) =>
        b.paymentStatus === 'PAID' ||
        b.paymentStatus === 'REFUNDED' ||
        b.status === 'COMPLETED',
    );
    const cancelledPaidPeriod = paidBookingsPeriod.filter(
      (b) => b.status === 'CANCELLED',
    );

    const cancellationRate =
      paidBookingsPeriod.length > 0
        ? (cancelledPaidPeriod.length / paidBookingsPeriod.length) * 100
        : 0;

    // Occupancy Rate (For the period)
    let totalAvailableSlotsPeriod = 0;
    courts.forEach((court) => {
      const openHour =
        parseInt((court.openingTime || '05:00').split(':')[0], 10) || 5;
      let closeHour =
        parseInt((court.closingTime || '22:00').split(':')[0], 10) || 22;
      if (closeHour <= openHour) closeHour += 24;
      const dailySlots = Math.max(0, closeHour - openHour);
      totalAvailableSlotsPeriod += dailySlots * periodDays;
    });

    const occupancyRate =
      totalAvailableSlotsPeriod > 0
        ? (successPeriod.length / totalAvailableSlotsPeriod) * 100
        : 0;

    const totalBookings = successPeriod.length;
    const aov = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const activeCustomers = new Set(successPeriod.map((b) => b.userId)).size;

    // 5. Revenue Trend (CHART - PERIOD-BOUND)
    const revenueMap = new Map<string, number>();
    for (let i = 0; i < periodDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dStr = getVNDateString(d);
      revenueMap.set(dStr, 0);
    }

    successPeriod.forEach((b) => {
      if (revenueMap.has(b.bookingDate)) {
        const current = revenueMap.get(b.bookingDate) || 0;
        revenueMap.set(b.bookingDate, current + b.totalPrice);
      }
    });

    const revenueTrend = Array.from(revenueMap.entries()).map(
      ([date, revenue]) => ({
        date: date.split('-').slice(1).reverse().join('/'),
        revenue,
      }),
    );

    // 6. Court Performance (Period bound)
    const courtPerf = courts.map((c) => {
      const successCourtPeriod = successPeriod.filter(
        (b) => b.courtId === c.id,
      );
      const revenue = successCourtPeriod.reduce(
        (sum, b) => sum + b.totalPrice,
        0,
      );
      const bookings = successCourtPeriod.length;

      const bookedHours = successCourtPeriod.reduce(
        (sum, b) => sum + getBookingHours(b.startTime, b.endTime),
        0,
      );

      const openHour =
        parseInt((c.openingTime || '05:00').split(':')[0], 10) || 5;
      let closeHour =
        parseInt((c.closingTime || '22:00').split(':')[0], 10) || 22;
      if (closeHour <= openHour) closeHour += 24;
      const dailySlots = Math.max(0, closeHour - openHour);
      const availableSlots = dailySlots * periodDays;
      const occupancyRate =
        availableSlots > 0
          ? (successCourtPeriod.length / availableSlots) * 100
          : 0;

      return {
        courtName: c.name,
        revenue,
        bookings,
        bookedHours: Math.round(bookedHours * 100) / 100,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        avgRating: c.avgRating || 0,
      };
    });

    // 7. VIP Customers (Period bound)
    const userMap = new Map<string, VipCustomer>();
    successPeriod.forEach((b) => {
      if (!b.user) return;
      const existing = userMap.get(b.userId);
      if (existing) {
        existing.totalBookings += 1;
        existing.totalSpent += b.totalPrice;
      } else {
        userMap.set(b.userId, {
          userId: b.userId,
          name: b.user.fullName,
          phone: b.user.phone,
          totalBookings: 1,
          totalSpent: b.totalPrice,
        });
      }
    });

    const topVipCustomers = Array.from(userMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // 8. Peak Hours (Period bound for current trends)
    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourMap.set(h, 0);
    successPeriod.forEach((b) => {
      const hour = parseInt(b.startTime.split(':')[0], 10);
      if (!isNaN(hour)) {
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      }
    });

    const peakHours = Array.from(hourMap.entries()).map(([hour, count]) => ({
      hour: `${hour.toString().padStart(2, '0')}h`,
      count,
    }));

    // 9. Payment Methods stats (Period bound)
    const paymentMethodStatsMap = new Map<
      string,
      { count: number; amount: number }
    >();
    paymentMethodStatsMap.set('CASH', { count: 0, amount: 0 });
    paymentMethodStatsMap.set('BANK_TRANSFER', { count: 0, amount: 0 });
    paymentMethodStatsMap.set('E_WALLET', { count: 0, amount: 0 });

    successPeriod.forEach((b) => {
      const method = b.payment?.method || 'CASH';
      const stats = paymentMethodStatsMap.get(method) || {
        count: 0,
        amount: 0,
      };
      stats.count += 1;
      stats.amount += b.totalPrice;
      paymentMethodStatsMap.set(method, stats);
    });

    const paymentMethods = Array.from(paymentMethodStatsMap.entries()).map(
      ([method, stats]) => ({
        method,
        count: stats.count,
        amount: stats.amount,
      }),
    );

    // 10. Weekly Booking Density (Period bound)
    const dayNames = [
      'Chủ Nhật',
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
    ];
    const weeklyMap = new Map<number, number>();
    for (let i = 0; i < 7; i++) weeklyMap.set(i, 0);

    successPeriod.forEach((b) => {
      const parts = b.bookingDate.split('-').map(Number);
      if (parts.length === 3) {
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        const dayIdx = dateObj.getDay();
        weeklyMap.set(dayIdx, (weeklyMap.get(dayIdx) || 0) + 1);
      }
    });

    const weeklyDensity = Array.from(weeklyMap.entries()).map(
      ([dayIdx, count]) => ({
        day: dayNames[dayIdx],
        count,
      }),
    );
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Thứ Hai -> Chủ Nhật
    weeklyDensity.sort(
      (a, b) =>
        dayOrder.indexOf(dayNames.indexOf(a.day)) -
        dayOrder.indexOf(dayNames.indexOf(b.day)),
    );

    // 11. Cancel Reasons analysis (Period bound)
    const cancelReasonsMap = new Map<string, number>();
    const cancelledPeriod = periodBookings.filter(
      (b) => b.status === 'CANCELLED',
    );
    cancelledPeriod.forEach((b) => {
      const reason = b.cancelReason?.trim() || 'Khác / Không nêu lý do';
      cancelReasonsMap.set(reason, (cancelReasonsMap.get(reason) || 0) + 1);
    });

    const cancelReasons = Array.from(cancelReasonsMap.entries())
      .map(([reason, count]) => ({
        reason,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 12. Recent Reviews (Period bound)
    const recentReviews = periodBookings
      .filter((b) => b.review)
      .map((b) => ({
        bookingId: b.id,
        courtName: courts.find((c) => c.id === b.courtId)?.name || 'Sân ẩn',
        userName: b.user?.fullName || 'Khách hàng',
        rating: b.review?.rating || 0,
        comment: b.review?.comment || '',
        bookingDate: b.bookingDate,
      }))
      .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate))
      .slice(0, 10);

    return {
      overview: {
        totalRevenue,
        totalBookedHours: Math.round(totalBookedHours * 100) / 100,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        cancelRate: Math.round(cancellationRate * 100) / 100,
        totalBookings,
        aov: Math.round(aov),
        activeCustomers,
        debugId: Date.now(),
      },
      revenueChart: revenueTrend,
      courtPerformance: courtPerf,
      topVipCustomers,
      peakHours,
      paymentMethods,
      weeklyDensity,
      cancelReasons,
      recentReviews,
    };
  }
}
