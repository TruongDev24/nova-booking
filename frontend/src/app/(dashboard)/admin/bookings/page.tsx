"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  Clock, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  ArrowRight
} from "lucide-react";
import { bookingService, PaginatedBookings } from "@/services/booking.service";
import { toast, Toaster } from "react-hot-toast";
import { formatToVietnamDate } from "@/utils/date-format";

export default function AdminBookingsPage() {
  const [data, setData] = useState<PaginatedBookings | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await bookingService.getAllAdmin(page, 10, search, status, startDate, endDate);
      setData(result);
    } catch (error) {
      console.error("Fetch Bookings Error:", error);
      toast.error("Không thể tải danh sách đơn đặt sân");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, page, status, startDate, endDate, fetchBookings]);

  const handleCancel = async (id: string) => {
    if (!window.confirm("HÀNH ĐỘNG NGUY HIỂM: Bạn có chắc chắn muốn hủy đơn đặt sân này?")) {
      return;
    }

    try {
      setIsCancelling(id);
      await bookingService.cancelBookingAdmin(id);
      toast.success("Đã hủy đơn thành công");
      fetchBookings();
    } catch {
      toast.error("Không thể hủy đơn. Vui lòng thử lại.");
    } finally {
      setIsCancelling(null);
    }
  };

  const handleConfirmBooking = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xác nhận đơn đặt sân này?")) {
      return;
    }

    try {
      setIsConfirming(id);
      await bookingService.confirmBookingAdmin(id);
      toast.success("Đã xác nhận đơn hàng!");
      fetchBookings();
    } catch {
      toast.error("Không thể xác nhận đơn. Vui lòng thử lại.");
    } finally {
      setIsConfirming(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100 uppercase tracking-tighter shadow-sm">
            <CheckCircle2 className="w-3 h-3" /> Thành công
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black border border-red-100 uppercase tracking-tighter shadow-sm">
            <XCircle className="w-3 h-3" /> Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black border border-amber-100 uppercase tracking-tighter shadow-sm">
            <Clock className="w-3 h-3" /> Chờ xử lý
          </span>
        );
    }
  };

  const bookings = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <Toaster position="top-right" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">QUẢN LÝ ĐẶT SÂN</h1>
          <p className="text-slate-500 text-sm font-medium">Lọc theo khoảng thời gian • Thống kê hiệu quả.</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-8">
           <div className="flex flex-col text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng đơn lọc được</span>
              <span className="text-2xl font-black text-slate-900 leading-none mt-1">{meta?.total || 0}</span>
           </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col lg:flex-row items-center gap-4">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm khách hàng hoặc tên sân..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select 
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="flex-1 lg:flex-none px-6 py-4 bg-slate-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:border-blue-500 font-bold text-sm cursor-pointer"
          >
            <option value="">Trạng thái</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="CONFIRMED">Thành công</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>

          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-[1.5rem] border-2 border-transparent focus-within:border-blue-500 transition-all">
             <div className="relative">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="bg-transparent pl-4 pr-2 py-3 outline-none font-bold text-xs cursor-pointer"
                />
                <span className="absolute -top-6 left-4 text-[9px] font-black text-slate-400 uppercase">Từ ngày</span>
             </div>
             <ArrowRight className="w-3 h-3 text-slate-300" />
             <div className="relative">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="bg-transparent pl-2 pr-4 py-3 outline-none font-bold text-xs cursor-pointer"
                />
                <span className="absolute -top-6 left-2 text-[9px] font-black text-slate-400 uppercase">Đến ngày</span>
             </div>
          </div>

          {(search || status || startDate || endDate) && (
            <button 
              onClick={() => { setSearch(""); setStatus(""); setStartDate(""); setEndDate(""); setPage(1); }}
              className="px-4 py-3 text-red-500 font-bold text-xs hover:bg-red-50 rounded-2xl transition-all"
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">ID</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Khách hàng</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Sân vận động</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Khung giờ</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-60 text-right">Thanh toán</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-60 text-center">Trạng thái</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-60 text-center">Xử lý đơn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-8 py-10"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center">
                     <AlertCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                     <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Không tìm thấy đơn hàng trong khoảng này</p>
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black text-slate-400">#{booking.id.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">{booking.user?.fullName}</span>
                        <span className="text-xs text-slate-400 font-bold">{booking.user?.phone}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{booking.court?.name}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3" /> {booking.court?.location}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{formatToVietnamDate(booking.bookingDate)}</span>
                        <span className="text-xs text-blue-600 font-black">{booking.startTime} - {booking.endTime}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-lg font-black text-slate-900">{booking.totalPrice.toLocaleString()}đ</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-2">
                        {booking.status === "PENDING" && (
                          <>
                            <button 
                              onClick={() => handleConfirmBooking(booking.id)}
                              disabled={isConfirming === booking.id}
                              className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm"
                              title="Xác nhận đơn"
                            >
                              {isConfirming === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => handleCancel(booking.id)}
                              disabled={isCancelling === booking.id}
                              className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                              title="Hủy đơn"
                            >
                              {isCancelling === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                        {booking.status === "CONFIRMED" && (
                          <button 
                            onClick={() => handleCancel(booking.id)}
                            disabled={isCancelling === booking.id}
                            className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="Hủy đơn"
                          >
                            {isCancelling === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.lastPage > 1 && (
          <div className="px-8 py-6 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase">Hiển thị {bookings.length} / {meta.total} đơn</span>
            <div className="flex items-center gap-4">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-3 rounded-2xl border bg-white hover:bg-slate-50 disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
              <span className="text-sm font-black">TRANG {page} / {meta.lastPage}</span>
              <button disabled={page === meta.lastPage} onClick={() => setPage(p => p + 1)} className="p-3 rounded-2xl border bg-white hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
