import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import { AnalyticsResponse, VipCustomer } from './interfaces/analytics-response.interface';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAdminAnalytics(userId: string, period: number = 7): Promise<AnalyticsResponse> {
    // VN Time adjustment (UTC+7)
    const VN_OFFSET = 7 * 60 * 60 * 1000;
    const now = new Date();
    const todayVN = new Date(now.getTime() + VN_OFFSET);
    
    const endDate = new Date(todayVN);
    const startDate = new Date(todayVN);
    startDate.setDate(todayVN.getDate() - period + 1);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all courts owned by this user
    const courts = await this.prisma.court.findMany({
      where: { ownerId: userId, isDeleted: false },
    });

    const courtIds = courts.map((c) => c.id);

    // Get all bookings for these courts in the period
    const bookings = await this.prisma.booking.findMany({
      where: {
        courtId: { in: courtIds },
        bookingDate: { gte: startDateStr, lte: endDateStr },
      },
      include: {
        user: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });

    // 1. Filtered Sets
    const confirmedBookings = bookings.filter(
      (b) =>
        b.status === BookingStatus.CONFIRMED ||
        b.status === BookingStatus.COMPLETED,
    );
    const cancelledBookings = bookings.filter(
      (b) => b.status === BookingStatus.CANCELLED,
    );

    // 2. Overview Metrics
    const totalRevenue = confirmedBookings.reduce(
      (sum, b) => sum + b.totalPrice,
      0,
    );
    const totalBookedHours = confirmedBookings.length;

    let totalAvailableSlots = 0;
    courts.forEach((court) => {
      const cOpen = parseInt(court.openingTime.split(':')[0], 10);
      let cClose = parseInt(court.closingTime.split(':')[0], 10);
      if (cClose <= cOpen) cClose += 24;
      const dailySlots = cClose - cOpen;
      totalAvailableSlots += dailySlots * period;
    });

    const occupancyRate =
      totalAvailableSlots > 0
        ? (totalBookedHours / totalAvailableSlots) * 100
        : 0;
    const cancelRate =
      bookings.length > 0 ? (cancelledBookings.length / bookings.length) * 100 : 0;

    // 3. Revenue Chart Data (Daily)
    const revenueMap = new Map<string, number>();
    for (let i = 0; i < period; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      revenueMap.set(dStr, 0);
    }

    confirmedBookings.forEach((b) => {
      if (revenueMap.has(b.bookingDate)) {
        const current = revenueMap.get(b.bookingDate) || 0;
        revenueMap.set(b.bookingDate, current + b.totalPrice);
      }
    });

    const revenueChart = Array.from(revenueMap.entries()).map(
      ([date, revenue]) => ({
        date: date.split('-').slice(1).reverse().join('/'),
        revenue,
      }),
    );

    // 4. Court Performance
    const courtPerfMap = new Map<
      string,
      { courtName: string; revenue: number; bookings: number }
    >();
    courts.forEach((c) => {
      courtPerfMap.set(c.id, { courtName: c.name, revenue: 0, bookings: 0 });
    });

    confirmedBookings.forEach((b) => {
      const perf = courtPerfMap.get(b.courtId);
      if (perf) {
        perf.revenue += b.totalPrice;
        perf.bookings += 1;
      }
    });

    // 5. Top VIP Customers
    const userMap = new Map<string, VipCustomer>();
    confirmedBookings.forEach((b) => {
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

    // 6. Peak Hours Analysis
    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourMap.set(h, 0);

    confirmedBookings.forEach((b) => {
      const hour = parseInt(b.startTime.split(':')[0], 10);
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    const peakHours = Array.from(hourMap.entries()).map(([hour, count]) => ({
      hour: `${hour.toString().padStart(2, '0')}h`,
      count,
    }));

    return {
      overview: {
        totalRevenue,
        totalBookedHours,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        cancelRate: Math.round(cancelRate * 10) / 10,
      },
      revenueChart,
      courtPerformance: Array.from(courtPerfMap.values()),
      topVipCustomers,
      peakHours,
    };
  }
}

