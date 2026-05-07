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
    period: number = 7,
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

    const now = new Date();
    const endDateStr = getVNDateString(now);
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - period + 1);
    const startDateStr = getVNDateString(startDate);

    // 2. Fetch Base Data
    const courts = await this.prisma.court.findMany({
      where: { ownerId: userId },
    });
    const courtIds = courts.map((c) => c.id);

    // FETCH ALL BOOKINGS for global metrics to handle inconsistent test data
    // (In production, we might want to keep this time-bound, but for now we need visibility)
    const allBookings = await this.prisma.booking.findMany({
      where: { courtId: { in: courtIds } },
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
      },
    });

    // Filtered by current period for charts
    const periodBookings = allBookings.filter(
      (b) => b.bookingDate >= startDateStr && b.bookingDate <= endDateStr,
    );

    // 3. Logic for SUCCESS (Revenue/Hours)
    const successAll = allBookings.filter((b) => {
      const isPaid = b.paymentStatus === 'PAID';
      const isCompleted = b.status === 'COMPLETED';
      const isCancelled = b.status === 'CANCELLED';
      const isRefunded = b.paymentStatus === 'REFUNDED';
      return (isPaid || isCompleted) && !isCancelled && !isRefunded;
    });

    const successPeriod = periodBookings.filter((b) => {
      const isPaid = b.paymentStatus === 'PAID';
      const isCompleted = b.status === 'COMPLETED';
      const isCancelled = b.status === 'CANCELLED';
      const isRefunded = b.paymentStatus === 'REFUNDED';
      return (isPaid || isCompleted) && !isCancelled && !isRefunded;
    });

    const cancelledAll = allBookings.filter((b) => b.status === 'CANCELLED');

    // 4. Aggregations (Using ALL for overview to satisfy user request for visibility)
    const totalRevenue = successAll.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalHours = successAll.length;

    const cancellationRate =
      allBookings.length > 0
        ? (cancelledAll.length / allBookings.length) * 100
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
      totalAvailableSlotsPeriod += dailySlots * period;
    });

    const occupancyRate =
      totalAvailableSlotsPeriod > 0
        ? (successPeriod.length / totalAvailableSlotsPeriod) * 100
        : 0;

    // 5. Revenue Trend (CHART MUST REMAIN PERIOD-BOUND)
    const revenueMap = new Map<string, number>();
    for (let i = 0; i < period; i++) {
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

    // 6. Court Perf (ALL time for better visibility)
    const courtPerfMap = new Map<
      string,
      { courtName: string; revenue: number; bookings: number }
    >();
    courts.forEach((c) => {
      courtPerfMap.set(c.id, { courtName: c.name, revenue: 0, bookings: 0 });
    });

    successAll.forEach((b) => {
      const perf = courtPerfMap.get(b.courtId);
      if (perf) {
        perf.revenue += b.totalPrice;
        perf.bookings += 1;
      }
    });

    // 7. VIP Customers (ALL time)
    const userMap = new Map<string, VipCustomer>();
    successAll.forEach((b) => {
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

    // 8. Peak Hours (Period bound for current trends)
    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourMap.set(h, 0);
    successPeriod.forEach((b) => {
      const hour = parseInt(b.startTime.split(':')[0], 10);
      if (!isNaN(hour)) {
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      }
    });

    return {
      overview: {
        totalRevenue,
        totalBookedHours: totalHours,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        cancelRate: Math.round(cancellationRate * 100) / 100,
        debugId: Date.now(),
      },
      revenueChart: revenueTrend,
      courtPerformance: Array.from(courtPerfMap.values()),
      topVipCustomers: Array.from(userMap.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10),
      peakHours: Array.from(hourMap.entries()).map(([hour, count]) => ({
        hour: `${hour.toString().padStart(2, '0')}h`,
        count,
      })),
    };
  }
}
