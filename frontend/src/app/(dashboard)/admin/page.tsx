import React from "react";
import { 
  TrendingUp, 
  Map, 
  CalendarCheck, 
  DollarSign 
} from "lucide-react";

export default function AdminDashboard() {
  const stats = [
    {
      label: "Tổng số sân",
      value: "12",
      change: "+2 sân mới",
      icon: Map,
      color: "bg-blue-500",
    },
    {
      label: "Booking hôm nay",
      value: "45",
      change: "+15% so với hôm qua",
      icon: CalendarCheck,
      color: "bg-emerald-500",
    },
    {
      label: "Doanh thu tháng",
      value: "156.4M",
      change: "+24.5M tháng này",
      icon: DollarSign,
      color: "bg-amber-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500">Chào mừng bạn trở lại, đây là thống kê tình hình kinh doanh của bạn.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className={`${stat.color} p-3 rounded-xl text-white shadow-lg`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart/Activity Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 h-80 flex flex-col items-center justify-center text-slate-400">
          <Activity className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">Biểu đồ doanh thu (Coming soon)</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 h-80 flex flex-col items-center justify-center text-slate-400">
          <CalendarCheck className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">Lịch đặt sân gần đây (Coming soon)</p>
        </div>
      </div>
    </div>
  );
}

// Minimal placeholder Activity icon import for the empty states
function Activity(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
