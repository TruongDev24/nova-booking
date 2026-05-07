"use client";

import React, { useState } from "react";
import {
    DollarSign,
    Clock,
    Percent,
    XCircle,
    TrendingUp,
    BarChart3,
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
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import PeakHoursChart from "./components/PeakHoursChart";
import VipCustomersTable from "./components/VipCustomersTable";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// --- Helpers ---
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value);
};

const formatPercent = (value: number) => {
    return `${Number(value || 0).toFixed(2)}%`;
};

export default function AdminDashboard() {
    const [period, setPeriod] = useState(7);

    // --- Data Fetching with React Query ---
    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin-analytics", period],
        queryFn: () => analyticsService.getAdminAnalytics(period),
        refetchOnWindowFocus: false,
    });

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    if (isError || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <XCircle className="w-12 h-12 text-destructive opacity-20" />
                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">
                    Lỗi khi tải dữ liệu phân tích.
                </p>
                <Button variant="outline" onClick={() => window.location.reload()}> Thử lại </Button>
            </div>
        );
    }

    const {
        overview,
        revenueChart,
        courtPerformance,
        topVipCustomers,
        peakHours,
    } = data;

    const stats = [
        {
            label: "Tổng doanh thu",
            value: formatCurrency(overview?.totalRevenue || 0),
            description: "Doanh thu thực nhận sau chiết khấu",
            icon: DollarSign,
            color: "text-blue-500",
            bg: "bg-blue-50/50",
        },
        {
            label: "Tỷ lệ lấp đầy",
            value: formatPercent(overview?.occupancyRate || 0),
            description: "Hiệu suất sử dụng sân hiện tại",
            icon: Percent,
            color: "text-emerald-500",
            bg: "bg-emerald-50/50",
        },
        {
            label: "Tổng giờ đã đặt",
            value: `${overview?.totalBookedHours || 0}h`,
            description: "Tổng thời gian sân được sử dụng",
            icon: Clock,
            color: "text-amber-500",
            bg: "bg-amber-50/50",
        },
        {
            label: "Tỷ lệ hủy đơn",
            value: formatPercent(overview?.cancelRate || 0),
            description: "Tỷ lệ đơn bị khách hàng hủy",
            icon: XCircle,
            color: "text-rose-500",
            bg: "bg-rose-50/50",
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight uppercase italic flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-primary" />
                        Bảng điều khiển
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">
                        Phân tích số liệu và quản lý hiệu quả kinh doanh của bạn.
                    </p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-muted/30 border rounded-2xl shadow-sm">
                    <Button
                        variant={period === 7 ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setPeriod(7)}
                        className={`text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${period === 7 ? "shadow-lg shadow-primary/20" : ""}`}
                    >
                        7 ngày qua
                    </Button>
                    <Button
                        variant={period === 30 ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setPeriod(30)}
                        className={`text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${period === 30 ? "shadow-lg shadow-primary/20" : ""}`}
                    >
                        30 ngày qua
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <Card key={stat.label}
                          className="overflow-hidden border-none shadow-sm hover:shadow-xl transition-all group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle
                                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {stat.label}
                            </CardTitle>
                            <div className={`p-2 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`}/>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black tracking-tighter">
                                {stat.value}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase opacity-70">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend Chart */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-muted/20 bg-muted/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-xl">
                                <TrendingUp className="h-5 w-5 text-blue-500"/>
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black uppercase tracking-tight">
                                    Xu hướng doanh thu
                                </CardTitle>
                                <CardDescription className="text-[10px] font-black uppercase tracking-widest">
                                    Thống kê biến động dòng tiền theo thời gian
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueChart}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="var(--border)"
                                        opacity={0.5}
                                    />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{fontSize: 10, fontWeight: 800, fill: "var(--muted-foreground)"}}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{fontSize: 10, fontWeight: 800, fill: "var(--muted-foreground)"}}
                                        tickFormatter={(value) =>
                                            `${(value / 1000).toLocaleString()}k`
                                        }
                                        dx={-10}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: "1.25rem",
                                            border: "none",
                                            backgroundColor: "var(--background)",
                                            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                                            padding: "1rem",
                                        }}
                                        itemStyle={{fontWeight: 900, fontSize: "14px"}}
                                        labelStyle={{
                                            fontWeight: 900,
                                            marginBottom: "0.5rem",
                                            color: "var(--muted-foreground)",
                                            fontSize: "10px",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(value: any) => [
                                            formatCurrency(Number(value || 0)),
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

                {/* Court Performance Chart */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-muted/20 bg-muted/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-xl">
                                <BarChart3 className="h-5 w-5 text-emerald-500"/>
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black uppercase tracking-tight">
                                    Hiệu suất từng sân
                                </CardTitle>
                                <CardDescription className="text-[10px] font-black uppercase tracking-widest">
                                    So sánh doanh thu thực tế giữa các sân
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={courtPerformance}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="var(--border)"
                                        opacity={0.5}
                                    />
                                    <XAxis
                                        dataKey="courtName"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{fontSize: 10, fontWeight: 800, fill: "var(--muted-foreground)"}}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{fontSize: 10, fontWeight: 800, fill: "var(--muted-foreground)"}}
                                        tickFormatter={(value) =>
                                            `${(value / 1000).toLocaleString()}k`
                                        }
                                        dx={-10}
                                    />
                                    <Tooltip
                                        cursor={{fill: "var(--muted)", opacity: 0.3}}
                                        contentStyle={{
                                            borderRadius: "1.25rem",
                                            border: "none",
                                            backgroundColor: "var(--background)",
                                            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                                            padding: "1rem",
                                        }}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(value: any) => [
                                            formatCurrency(Number(value || 0)),
                                            "Doanh thu",
                                        ]}
                                        labelStyle={{
                                            fontWeight: 900,
                                            marginBottom: "0.5rem",
                                            color: "var(--muted-foreground)",
                                            fontSize: "10px",
                                            textTransform: "uppercase",
                                        }}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        radius={[8, 8, 0, 0]}
                                        barSize={40}
                                        animationDuration={1500}
                                    >
                                        {courtPerformance?.map((_: unknown, index: number) => (
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
                <PeakHoursChart data={peakHours}/>
                <VipCustomersTable customers={topVipCustomers}/>
            </div>
        </div>
    );
}

// --- Loading State Component ---
function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-40 rounded-xl" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_: unknown, i: number) => (
                    <Card key={i} className="border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-8 w-32" />
                            <Skeleton className="h-3 w-40" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {[...Array(2)].map((_: unknown, i: number) => (
                    <Card key={i} className="border-none shadow-sm">
                        <CardHeader>
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-3 w-64" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-80 w-full rounded-2xl" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
