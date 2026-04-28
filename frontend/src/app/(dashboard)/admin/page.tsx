"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Clock,
  Percent,
  XCircle,
  TrendingUp,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { analyticsService } from "@/services/analytics.service";
import PeakHoursChart from "./components/PeakHoursChart";
import VipCustomersTable from "./components/VipCustomersTable";
import { AnalyticsResponse } from "@/types/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [period, setPeriod] = useState(7);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const result = await analyticsService.getAdminAnalytics(period);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [period]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
            Đang tải dữ liệu...
          </p>
        </div>
      </div>
    );
  }

  const {
    overview,
    revenueChart,
    courtPerformance,
    topVipCustomers,
    peakHours,
  } = data!;

  const stats = [
    {
      label: "Tổng doanh thu",
      value: `${overview?.totalRevenue?.toLocaleString()}đ`,
      description: "Doanh thu thực nhận sau chiết khấu",
      icon: DollarSign,
      color: "text-blue-500",
    },
    {
      label: "Tỷ lệ lấp đầy",
      value: `${overview?.occupancyRate}%`,
      description: "Hiệu suất sử dụng sân hiện tại",
      icon: Percent,
      color: "text-emerald-500",
    },
    {
      label: "Tổng giờ đã đặt",
      value: `${overview?.totalBookedHours}h`,
      description: "Tổng thời gian sân được sử dụng",
      icon: Clock,
      color: "text-amber-500",
    },
    {
      label: "Tỷ lệ hủy đơn",
      value: `${overview?.cancelRate}%`,
      description: "Tỷ lệ đơn bị khách hàng hủy",
      icon: XCircle,
      color: "text-rose-500",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">
            Bảng điều khiển
          </h1>
          <p className="text-muted-foreground font-medium">
            Phân tích số liệu và quản lý hiệu quả kinh doanh.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-background border rounded-lg shadow-sm">
          <Button
            variant={period === 7 ? "default" : "ghost"}
            size="sm"
            onClick={() => setPeriod(7)}
            className="text-[10px] font-black uppercase tracking-widest"
          >
            7 ngày qua
          </Button>
          <Button
            variant={period === 30 ? "default" : "ghost"}
            size="sm"
            onClick={() => setPeriod(30)}
            className="text-[10px] font-black uppercase tracking-widest"
          >
            30 ngày qua
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black tracking-tighter">
                {stat.value}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight">
                  Xu hướng doanh thu
                </CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest">
                  Thống kê biến động dòng tiền
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 900, fill: "var(--muted-foreground)" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 900, fill: "var(--muted-foreground)" }}
                    tickFormatter={(value) =>
                      `${(value / 1000).toLocaleString()}k`
                    }
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "1rem",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--background)",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      padding: "0.75rem",
                    }}
                    itemStyle={{ fontWeight: 900, fontSize: "12px", color: "var(--foreground)" }}
                    labelStyle={{
                      fontWeight: 900,
                      marginBottom: "0.25rem",
                      color: "var(--muted-foreground)",
                      fontSize: "9px",
                      textTransform: "uppercase",
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [
                      `${Number(value || 0).toLocaleString()}đ`,
                      "Doanh thu",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Court Performance */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight">
                  Hiệu suất từng sân
                </CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest">
                  So sánh doanh thu giữa các sân
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courtPerformance}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="courtName"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 900, fill: "var(--muted-foreground)" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 900, fill: "var(--muted-foreground)" }}
                    tickFormatter={(value) =>
                      `${(value / 1000).toLocaleString()}k`
                    }
                    dx={-10}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    contentStyle={{
                      borderRadius: "1rem",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--background)",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      padding: "0.75rem",
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [
                      `${Number(value || 0).toLocaleString()}đ`,
                      "Doanh thu",
                    ]}
                    labelStyle={{
                      fontWeight: 900,
                      marginBottom: "0.25rem",
                      color: "var(--muted-foreground)",
                      fontSize: "9px",
                      textTransform: "uppercase",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    radius={[8, 8, 0, 0]}
                    barSize={40}
                    animationDuration={1500}
                  >
                    {courtPerformance?.map((_, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index % 2 === 0 ? "#10b981" : "#34d399"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pb-10">
        <PeakHoursChart data={peakHours} />
        <VipCustomersTable customers={topVipCustomers} />
      </div>
    </div>
  );
}
