"use client";

import React, {useState, useEffect} from "react";
import {
    DollarSign,
    Clock,
    Percent,
    XCircle,
    TrendingUp,
    BarChart3,
    Loader2
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
    Cell
} from 'recharts';
import {analyticsService} from "@/services/analytics.service";
import PeakHoursChart from "./components/PeakHoursChart";
import VipCustomersTable from "./components/VipCustomersTable";
import {AnalyticsResponse} from "@/types/analytics";

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
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600"/>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    const {overview, revenueChart, courtPerformance, topVipCustomers, peakHours} = data!;

    const stats = [
        {
            label: "Tổng doanh thu",
            value: `${overview?.totalRevenue?.toLocaleString()}đ`,
            icon: DollarSign,
            color: "text-blue-600",
            bg: "bg-blue-50",
        },
        {
            label: "Tỷ lệ lấp đầy",
            value: `${overview?.occupancyRate}%`,
            icon: Percent,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
        },
        {
            label: "Tổng giờ đã đặt",
            value: `${overview?.totalBookedHours}h`,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
        },
        {
            label: "Tỷ lệ hủy đơn",
            value: `${overview?.cancelRate}%`,
            icon: XCircle,
            color: "text-rose-600",
            bg: "bg-rose-50",
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">THỐNG KÊ</h1>
                    <p className="text-slate-500 font-medium">Theo dõi hiệu quả kinh doanh của hệ thống sân.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                    <button
                        onClick={() => setPeriod(7)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${period === 7 ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}
                    >
                        7 ngày qua
                    </button>
                    <button
                        onClick={() => setPeriod(30)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${period === 30 ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}
                    >
                        30 ngày qua
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label}
                         className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                        <div
                            className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform`}>
                            <stat.icon className="w-7 h-7"/>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Area Chart */}
                <div
                    className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-600"/>
                                Xu hướng doanh thu
                            </h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Biểu đồ thời
                                gian thực</p>
                        </div>
                    </div>

                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueChart}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}}
                                    tickFormatter={(value) => `${(value / 1000).toLocaleString()}k`}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '1.5rem',
                                        border: 'none',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                                        padding: '1rem'
                                    }}
                                    itemStyle={{fontWeight: 900, fontSize: '13px', color: '#1e293b'}}
                                    labelStyle={{
                                        fontWeight: 900,
                                        marginBottom: '0.5rem',
                                        color: '#64748b',
                                        fontSize: '10px',
                                        textTransform: 'uppercase'
                                    }}
                                    formatter={(value: number) => [`${value.toLocaleString()}đ`, "Doanh thu"]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#2563eb"
                                    strokeWidth={5}
                                    fillOpacity={1}
                                    fill="url(#colorRev)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Court Performance Bar Chart */}
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-emerald-600"/>
                                Hiệu suất từng sân
                            </h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Phân tích
                                doanh thu</p>
                        </div>
                    </div>

                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={courtPerformance}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis
                                    dataKey="courtName"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}}
                                    tickFormatter={(value) => `${(value / 1000).toLocaleString()}k`}
                                    dx={-10}
                                />
                                <Tooltip
                                    cursor={{fill: '#f8fafc', radius: 10}}
                                    contentStyle={{
                                        borderRadius: '1.5rem',
                                        border: 'none',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                                        padding: '1rem'
                                    }}
                                    formatter={(value: number) => [`${value.toLocaleString()}đ`, "Doanh thu"]}
                                    labelStyle={{
                                        fontWeight: 900,
                                        marginBottom: '0.5rem',
                                        color: '#64748b',
                                        fontSize: '10px',
                                        textTransform: 'uppercase'
                                    }}
                                />
                                <Bar dataKey="revenue" radius={[12, 12, 0, 0]} barSize={45} animationDuration={1500}>
                                    {courtPerformance?.map((_, index: number) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#34d399'}/>
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Secondary Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <PeakHoursChart data={peakHours}/>
                <VipCustomersTable customers={topVipCustomers}/>
            </div>
        </div>
    );
}

