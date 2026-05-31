"use client";

import React, { useState } from "react";
import {
    DollarSign,
    Clock,
    Percent,
    XCircle,
    TrendingUp,
    BarChart3,
    ShoppingBag,
    UserCheck,
    CreditCard,
    Calendar,
    Star,
    Users,
    MessageSquare,
    AlertTriangle,
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
import PeakHoursChart from "@/components/admin/peak-hours-chart";
import VipCustomersTable from "@/components/admin/vip-customers-table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocket } from "@/hooks/use-socket";

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
    const getInitialDates = () => {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        const end = formatter.format(now);
        const start = new Date(now);
        start.setDate(now.getDate() - 6); // 7 days including today
        return { start: formatter.format(start), end };
    };

    const initialDates = getInitialDates();
    const [startDate, setStartDate] = useState<string>(initialDates.start);
    const [endDate, setEndDate] = useState<string>(initialDates.end);
    const [activeTab, setActiveTab] = useState<string>("overview");

    // --- Data Fetching with React Query ---
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["admin-analytics", startDate, endDate],
        queryFn: () => analyticsService.getAdminAnalytics(undefined, startDate || undefined, endDate || undefined),
        refetchOnWindowFocus: false,
    });

    const handlePreset = (days: number) => {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        const end = formatter.format(now);
        const start = new Date(now);
        start.setDate(now.getDate() - days + 1);
        setStartDate(formatter.format(start));
        setEndDate(end);
    };

    const isPresetActive = (days: number) => {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        const end = formatter.format(now);
        const start = new Date(now);
        start.setDate(now.getDate() - days + 1);
        const expectedStart = formatter.format(start);
        return startDate === expectedStart && endDate === end;
    };

    // --- REAL-TIME UPDATES ---
    const socket = useSocket();
    React.useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            void refetch();
        };

        socket.on("new_booking", handleUpdate);
        socket.on("booking_canceled", handleUpdate);
        socket.on("booking_initiated", handleUpdate);

        return () => {
            socket.off("new_booking", handleUpdate);
            socket.off("booking_canceled", handleUpdate);
            socket.off("booking_initiated", handleUpdate);
        };
    }, [socket, refetch]);

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
        paymentMethods,
        weeklyDensity,
        cancelReasons,
        recentReviews,
    } = data;

    const stats = [
        {
            label: "Tổng doanh thu",
            value: formatCurrency(overview?.totalRevenue || 0),
            description: "Trong khoảng thời gian đã chọn",
            icon: DollarSign,
            color: "text-blue-500",
            bg: "bg-blue-50/50 dark:bg-blue-950/20",
        },
        {
            label: "Tỷ lệ lấp đầy",
            value: formatPercent(overview?.occupancyRate || 0),
            description: "Hiệu suất sử dụng sân",
            icon: Percent,
            color: "text-emerald-500",
            bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
        },
        {
            label: "Số đơn đặt sân",
            value: `${overview?.totalBookings || 0} đơn`,
            description: "Số giao dịch thành công",
            icon: ShoppingBag,
            color: "text-indigo-500",
            bg: "bg-indigo-50/50 dark:bg-indigo-950/20",
        },
        {
            label: "Tổng giờ chơi",
            value: `${overview?.totalBookedHours || 0}h`,
            description: "Tổng thời gian sân hoạt động",
            icon: Clock,
            color: "text-amber-500",
            bg: "bg-amber-50/50 dark:bg-amber-950/20",
        },
        {
            label: "Trung bình đơn (AOV)",
            value: formatCurrency(overview?.aov || 0),
            description: "Doanh thu trung bình / đơn",
            icon: TrendingUp,
            color: "text-purple-500",
            bg: "bg-purple-50/50 dark:bg-purple-950/20",
        },
        {
            label: "Tỷ lệ hủy đặt",
            value: formatPercent(overview?.cancelRate || 0),
            description: "Tỷ lệ hủy đơn đã thanh toán",
            icon: XCircle,
            color: "text-rose-500",
            bg: "bg-rose-50/50 dark:bg-rose-950/20",
        },
    ];

    const tabs = [
        { id: "overview", label: "Tổng quan", icon: BarChart3 },
        { id: "courts", label: "Sân & Hiệu suất", icon: TrendingUp },
        { id: "customers", label: "Khách hàng & Đánh giá", icon: Users },
        { id: "operations", label: "Vận hành & Lịch trình", icon: Clock },
    ];

    // Helper to render stars for feedback
    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`w-3 h-3 ${
                            i < rating
                                ? "text-amber-500 fill-amber-500"
                                : "text-muted-foreground/30"
                        }`}
                    />
                ))}
            </div>
        );
    };

    // Helper for payment method names and badges
    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case "CASH":
                return "Tiền mặt";
            case "BANK_TRANSFER":
                return "Chuyển khoản";
            case "E_WALLET":
                return "Ví điện tử";
            default:
                return method;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Header & Period Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight uppercase italic flex items-center gap-3 text-foreground">
                        <BarChart3 className="w-8 h-8 text-primary" />
                        Thống kê kinh doanh
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">
                        Quản lý doanh thu, hiệu suất sân và phân tích hành vi khách hàng.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-1.5 bg-muted/30 border border-muted/50 rounded-2xl shadow-sm w-full md:w-auto">
                    {/* Presets */}
                    <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl">
                        <Button
                            variant={isPresetActive(7) ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handlePreset(7)}
                            className={`text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                isPresetActive(7) ? "shadow-sm shadow-primary/10" : ""
                            }`}
                        >
                            7 ngày
                        </Button>
                        <Button
                            variant={isPresetActive(30) ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handlePreset(30)}
                            className={`text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                isPresetActive(30) ? "shadow-sm shadow-primary/10" : ""
                            }`}
                        >
                            30 ngày
                        </Button>
                    </div>

                    {/* Date Inputs */}
                    <div className="flex items-center gap-2 text-xs font-black text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
                        <span className="uppercase tracking-wider text-[8px]">Từ</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            max={endDate || undefined}
                            className="bg-background text-foreground border border-muted/35 px-2 py-1 rounded-lg text-xs font-bold focus:outline-none focus:border-primary transition-colors"
                        />
                        <span className="uppercase tracking-wider text-[8px]">Đến</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || undefined}
                            className="bg-background text-foreground border border-muted/35 px-2 py-1 rounded-lg text-xs font-bold focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex overflow-x-auto gap-2 p-1.5 bg-muted/20 border border-muted/50 rounded-2xl">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10 scale-[1.02]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* STATS SUMMARY GRID (Always visible for quick health check) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {stats.map((stat) => (
                    <Card
                        key={stat.label}
                        className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all group bg-card"
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
                            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                {stat.label}
                            </CardTitle>
                            <div className={`p-1.5 rounded-lg ${stat.bg} group-hover:scale-110 transition-transform`}>
                                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-0">
                            <div className="text-lg font-black tracking-tighter text-foreground">
                                {stat.value}
                            </div>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase opacity-75 mt-0.5">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* TAB CONTENTS */}
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* 1. OVERVIEW TAB */}
                {activeTab === "overview" && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Revenue Trend */}
                            <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden bg-card">
                                <CardHeader className="border-b border-muted/10 bg-muted/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
                                            <TrendingUp className="h-5 w-5 text-blue-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-black uppercase tracking-tight text-foreground">
                                                Biểu đồ doanh thu
                                            </CardTitle>
                                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                Biến động dòng tiền thực nhận trong chu kỳ
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
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    vertical={false}
                                                    stroke="var(--border)"
                                                    opacity={0.4}
                                                />
                                                <XAxis
                                                    dataKey="date"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 9, fontWeight: 800, fill: "var(--muted-foreground)" }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 9, fontWeight: 800, fill: "var(--muted-foreground)" }}
                                                    tickFormatter={(value) => `${(value / 1000).toLocaleString()}k`}
                                                    dx={-10}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: "1rem",
                                                        border: "none",
                                                        backgroundColor: "var(--background)",
                                                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                                        padding: "0.75rem",
                                                    }}
                                                    itemStyle={{ fontWeight: 900, fontSize: "13px" }}
                                                    labelStyle={{
                                                        fontWeight: 900,
                                                        marginBottom: "0.25rem",
                                                        color: "var(--muted-foreground)",
                                                        fontSize: "9px",
                                                        textTransform: "uppercase",
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
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorRev)"
                                                    animationDuration={1000}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payment Method Distribution */}
                            <Card className="border-none shadow-sm overflow-hidden bg-card flex flex-col justify-between">
                                <CardHeader className="border-b border-muted/10 bg-muted/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
                                            <CreditCard className="h-5 w-5 text-indigo-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-black uppercase tracking-tight text-foreground">
                                                Cơ cấu thanh toán
                                            </CardTitle>
                                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                Tỷ lệ phương thức sử dụng
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 flex-1 flex flex-col justify-center space-y-6">
                                    {paymentMethods && paymentMethods.length > 0 ? (
                                        (() => {
                                            const totalCount = paymentMethods.reduce((sum, p) => sum + p.count, 0);
                                            return paymentMethods.map((pm, idx) => {
                                                const pct = totalCount > 0 ? (pm.count / totalCount) * 100 : 0;
                                                const colors = [
                                                    { progress: "bg-blue-500", text: "text-blue-500", dot: "bg-blue-500" },
                                                    { progress: "bg-emerald-500", text: "text-emerald-500", dot: "bg-emerald-500" },
                                                    { progress: "bg-purple-500", text: "text-purple-500", dot: "bg-purple-500" },
                                                ];
                                                const c = colors[idx % colors.length];

                                                return (
                                                    <div key={pm.method} className="space-y-1.5">
                                                        <div className="flex items-center justify-between text-xs font-black uppercase">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                                                                <span className="text-foreground">{getPaymentMethodLabel(pm.method)}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-foreground">{pm.count} đơn</span>
                                                                <span className="text-muted-foreground ml-2">({pct.toFixed(0)}%)</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${c.progress} transition-all duration-1000`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <p className="text-[10px] font-bold text-muted-foreground">
                                                            Doanh số: {formatCurrency(pm.amount)}
                                                        </p>
                                                    </div>
                                                );
                                            });
                                        })()
                                    ) : (
                                        <div className="text-center py-8 opacity-40">
                                            <CreditCard className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Không có dữ liệu giao dịch</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* 2. COURTS PERFORMANCE TAB */}
                {activeTab === "courts" && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Court Revenue Bar Chart */}
                            <Card className="border-none shadow-sm overflow-hidden bg-card">
                                <CardHeader className="border-b border-muted/10 bg-muted/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                                            <BarChart3 className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-black uppercase tracking-tight text-foreground">
                                                Doanh thu từng sân
                                            </CardTitle>
                                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                So sánh doanh thu thực tế trong kỳ
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
                                                    opacity={0.4}
                                                />
                                                <XAxis
                                                    dataKey="courtName"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 9, fontWeight: 800, fill: "var(--muted-foreground)" }}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 9, fontWeight: 800, fill: "var(--muted-foreground)" }}
                                                    tickFormatter={(value) => `${(value / 1000).toLocaleString()}k`}
                                                    dx={-10}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: "var(--muted)", opacity: 0.2 }}
                                                    contentStyle={{
                                                        borderRadius: "1rem",
                                                        border: "none",
                                                        backgroundColor: "var(--background)",
                                                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                                        padding: "0.75rem",
                                                    }}
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    formatter={(value: any) => [
                                                        formatCurrency(Number(value || 0)),
                                                        "Doanh thu",
                                                    ]}
                                                    labelStyle={{
                                                        fontWeight: 900,
                                                        color: "var(--muted-foreground)",
                                                        fontSize: "9px",
                                                        textTransform: "uppercase",
                                                    }}
                                                />
                                                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={32} animationDuration={1000}>
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

                            {/* Occupancy Rate Bar Chart */}
                            <Card className="border-none shadow-sm overflow-hidden bg-card">
                                <CardHeader className="border-b border-muted/10 bg-muted/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
                                            <Percent className="h-5 w-5 text-indigo-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-black uppercase tracking-tight text-foreground">
                                                Tỷ lệ lấp đầy sân
                                            </CardTitle>
                                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                Hiệu suất đặt sân riêng lẻ (%)
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
                                                    opacity={0.4}
                                                />
                                                <XAxis
                                                    dataKey="courtName"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 9, fontWeight: 800, fill: "var(--muted-foreground)" }}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 9, fontWeight: 800, fill: "var(--muted-foreground)" }}
                                                    tickFormatter={(value) => `${value}%`}
                                                    dx={-10}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: "var(--muted)", opacity: 0.2 }}
                                                    contentStyle={{
                                                        borderRadius: "1rem",
                                                        border: "none",
                                                        backgroundColor: "var(--background)",
                                                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                                        padding: "0.75rem",
                                                    }}
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    formatter={(value: any) => [
                                                        `${Number(value || 0).toFixed(1)}%`,
                                                        "Tỷ lệ lấp đầy",
                                                    ]}
                                                    labelStyle={{
                                                        fontWeight: 900,
                                                        color: "var(--muted-foreground)",
                                                        fontSize: "9px",
                                                        textTransform: "uppercase",
                                                    }}
                                                />
                                                <Bar dataKey="occupancyRate" radius={[6, 6, 0, 0]} barSize={32} animationDuration={1000}>
                                                    {courtPerformance?.map((_: unknown, index: number) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={index % 2 === 0 ? "#6366f1" : "#818cf8"}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detailed Table */}
                        <Card className="border-none shadow-sm overflow-hidden bg-card">
                            <CardHeader className="border-b border-muted/10 bg-muted/5">
                                <CardTitle className="text-base font-black uppercase tracking-tight text-foreground">
                                    Thống kê chi tiết theo sân
                                </CardTitle>
                                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Bảng phân tích hiệu quả kinh doanh của từng sân cầu lông
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-muted/30 border-b border-muted/10">
                                                <th className="py-3 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tên sân</th>
                                                <th className="py-3 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Số lượt đặt</th>
                                                <th className="py-3 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Số giờ chơi</th>
                                                <th className="py-3 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Tỷ lệ lấp đầy</th>
                                                <th className="py-3 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Đánh giá trung bình</th>
                                                <th className="py-3 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right">Doanh thu</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {courtPerformance && courtPerformance.length > 0 ? (
                                                courtPerformance.map((court) => (
                                                    <tr key={court.courtName} className="border-b border-muted/10 hover:bg-muted/5 transition-colors">
                                                        <td className="py-4 px-6 text-xs font-black uppercase tracking-tight text-foreground">{court.courtName}</td>
                                                        <td className="py-4 px-6 text-xs font-black text-center text-foreground">{court.bookings} lượt</td>
                                                        <td className="py-4 px-6 text-xs font-bold text-center text-muted-foreground">{court.bookedHours}h</td>
                                                        <td className="py-4 px-6 text-center">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                                                                {court.occupancyRate}%
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6 text-center">
                                                            <div className="flex items-center justify-center gap-1 text-xs font-black text-foreground">
                                                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                                                {court.avgRating > 0 ? court.avgRating.toFixed(1) : "N/A"}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 text-xs font-black text-right text-foreground">{formatCurrency(court.revenue)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="py-8 text-center text-xs font-bold text-muted-foreground opacity-60">
                                                        Không có dữ liệu sân.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 3. CUSTOMERS & REVIEWS TAB */}
                {activeTab === "customers" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
                        {/* VIP Customers list */}
                        <div className="flex flex-col h-full">
                            <VipCustomersTable customers={topVipCustomers} />
                        </div>

                        {/* Recent Reviews feed */}
                        <Card className="border-none shadow-sm overflow-hidden bg-card flex flex-col h-full">
                            <CardHeader className="border-b border-muted/10 bg-muted/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                                            <MessageSquare className="h-5 w-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-black uppercase tracking-tight text-foreground">
                                                Đánh giá & Phản hồi
                                            </CardTitle>
                                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                Ý kiến từ người chơi trong kỳ
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">{overview?.activeCustomers || 0} Khách đặt</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[440px]">
                                {recentReviews && recentReviews.length > 0 ? (
                                    <div className="divide-y divide-muted/10">
                                        {recentReviews.map((rev) => (
                                            <div key={rev.bookingId} className="p-4 space-y-2 hover:bg-muted/5 transition-colors">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase text-foreground">{rev.userName}</h4>
                                                        <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                                                            Đã đặt: <span className="text-primary font-bold">{rev.courtName}</span>
                                                        </p>
                                                    </div>
                                                    <div className="text-right space-y-1">
                                                        {renderStars(rev.rating)}
                                                        <span className="text-[8px] font-black text-muted-foreground block uppercase">
                                                            {rev.bookingDate.split("-").reverse().join("/")}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-bold text-muted-foreground pl-2 border-l-2 border-primary/20 italic">
                                                    &ldquo;{rev.comment}&rdquo;
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-80 opacity-40">
                                        <MessageSquare className="w-10 h-10 mb-2 text-muted-foreground" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Chưa nhận được đánh giá nào</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 4. OPERATIONS TAB */}
                {activeTab === "operations" && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Peak Hours start-time density */}
                            <div className="flex flex-col h-full">
                                <PeakHoursChart data={peakHours} />
                            </div>

                            {/* Weekly booking density */}
                            <Card className="border-none shadow-sm overflow-hidden bg-card flex flex-col h-full">
                                <CardHeader className="border-b border-muted/10 bg-muted/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
                                            <Calendar className="h-5 w-5 text-indigo-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-black uppercase tracking-tight text-foreground">
                                                Mật độ theo thứ
                                            </CardTitle>
                                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                Lượng đơn đặt phân phối trong tuần
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="h-80 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={weeklyDensity}>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    vertical={false}
                                                    stroke="var(--border)"
                                                    opacity={0.4}
                                                />
                                                <XAxis
                                                    dataKey="day"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 9, fontWeight: 800, fill: "var(--muted-foreground)" }}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 9, fontWeight: 800, fill: "var(--muted-foreground)" }}
                                                    allowDecimals={false}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: "var(--muted)", opacity: 0.2 }}
                                                    contentStyle={{
                                                        borderRadius: "1rem",
                                                        border: "none",
                                                        backgroundColor: "var(--background)",
                                                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                                        padding: "0.75rem",
                                                    }}
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    formatter={(value: any) => [`${value ?? 0} lượt đặt`, "Số lượng"]}
                                                    labelStyle={{
                                                        fontWeight: 900,
                                                        color: "var(--muted-foreground)",
                                                        fontSize: "9px",
                                                        textTransform: "uppercase",
                                                    }}
                                                />
                                                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={28} animationDuration={1000}>
                                                    {weeklyDensity?.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={
                                                                entry.count === Math.max(...weeklyDensity.map((d) => d.count)) && entry.count > 0
                                                                    ? "#818cf8" // highlighted peak day
                                                                    : "var(--muted)"
                                                            }
                                                            fillOpacity={1}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Cancellation reasons ranking */}
                        <Card className="border-none shadow-sm overflow-hidden bg-card">
                            <CardHeader className="border-b border-muted/10 bg-muted/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
                                        <AlertTriangle className="h-5 w-5 text-rose-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-black uppercase tracking-tight text-foreground">
                                            Phân tích lý do hủy sân
                                        </CardTitle>
                                        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            Danh sách các lý do hủy đặt sân phổ biến trong kỳ
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {cancelReasons && cancelReasons.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {(() => {
                                            const maxCancel = Math.max(...cancelReasons.map((r) => r.count), 1);
                                            return cancelReasons.map((cr, idx) => {
                                                const pct = (cr.count / maxCancel) * 100;
                                                return (
                                                    <div key={idx} className="flex items-center gap-4">
                                                        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center font-black text-rose-600 text-xs shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center justify-between text-xs font-bold text-foreground">
                                                                <span className="truncate max-w-[240px] md:max-w-xs">{cr.reason}</span>
                                                                <span className="text-rose-500 shrink-0">{cr.count} lần hủy</span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-30">
                                        <AlertTriangle className="w-8 h-8 mb-2 text-muted-foreground" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Không ghi nhận lý do hủy đặt nào trong kỳ</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
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

            <div className="h-12 w-full rounded-2xl bg-muted/20" />

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_: unknown, i: number) => (
                    <Card key={i} className="border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-4 w-4 rounded" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-2 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-3 w-64" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-80 w-full rounded-2xl" />
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-3 w-40" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-2 w-full" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

