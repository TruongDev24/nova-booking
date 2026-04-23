import React from "react";
import { Search, CalendarDays, ChevronRight, MoreHorizontal } from "lucide-react";

export default function AdminBookingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Lịch sử đặt sân</h1>
        <p className="text-slate-500 text-sm">Theo dõi và quản lý trạng thái các đơn đặt sân từ khách hàng.</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo khách hàng, mã đơn..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Tất cả
          </button>
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Đang chờ
          </button>
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Đã xác nhận
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sân</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giờ chơi</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {/* Placeholder row */}
              <tr className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-xs">
                      TL
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Trường Lê</p>
                      <p className="text-xs text-slate-500">0339050379</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-700">Sân số 1 - NOVA Stadium</p>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-700">
                    <p className="font-medium">18:00 - 20:00</p>
                    <p className="text-xs text-slate-500">22/04/2026</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Đang chờ
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Pagination Placeholder */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">Hiển thị 1 đến 1 của 1 kết quả</p>
          <div className="flex items-center gap-2">
            <button className="p-1 rounded border border-slate-200 text-slate-400 disabled:opacity-50" disabled>
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <button className="p-1 rounded border border-slate-200 text-slate-400 disabled:opacity-50" disabled>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
