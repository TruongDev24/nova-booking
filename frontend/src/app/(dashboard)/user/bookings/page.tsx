"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Trash2
} from "lucide-react";
import { bookingService } from "@/services/booking.service";
import { toast, Toaster } from "react-hot-toast";
import { formatToVietnamDate } from "@/utils/date-format";
import Image from "next/image";

interface Booking {
  id: string;
  courtId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  paymentStatus: string;
  court: {
    name: string;
    location: string;
    images: string[];
  };
  createdAt: string;
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await bookingService.getMyBookings();
      setBookings(data);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải lịch sử đặt sân");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy lịch đặt này không?")) return;

    try {
      await bookingService.cancelBooking(id);
      toast.success("Hủy lịch thành công");
      fetchBookings();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Không thể hủy lịch");
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "CONFIRMED": return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "CANCELLED": return "bg-rose-50 text-rose-600 border-rose-100";
      case "COMPLETED": return "bg-slate-50 text-slate-600 border-slate-100";
      default: return "bg-amber-50 text-amber-600 border-amber-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CONFIRMED": return <CheckCircle2 className="w-4 h-4" />;
      case "CANCELLED": return <XCircle className="w-4 h-4" />;
      case "COMPLETED": return <CheckCircle2 className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Toaster position="top-right" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lịch đặt của tôi</h1>
          <p className="text-slate-500 mt-1">Theo dõi và quản lý các lượt đặt sân cầu lông.</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-dashed border-slate-200 p-20 flex flex-col items-center text-center">
          <div className="bg-slate-50 p-6 rounded-full mb-6">
            <Calendar className="w-12 h-12 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Chưa có lịch đặt nào</h3>
          <p className="text-slate-500 mt-2 max-w-xs">Bạn chưa thực hiện đặt sân nào. Hãy khám phá các sân gần bạn!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 overflow-hidden flex flex-col md:flex-row group">
              {/* Image Section */}
              <div className="w-full md:w-64 h-48 md:h-auto relative bg-slate-100 shrink-0">
                {booking.court.images?.[0] ? (
                  <Image src={booking.court.images[0]} alt={booking.court.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <MapPin className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-2 backdrop-blur-md ${getStatusStyle(booking.status)}`}>
                    {getStatusIcon(booking.status)}
                    {booking.status}
                  </span>
                </div>
              </div>

              {/* Info Section */}
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                      {booking.court.name}
                    </h3>
                    <div className="flex items-center text-slate-500 gap-2 text-sm">
                      <MapPin className="w-4 h-4 shrink-0" />
                      {booking.court.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">Tổng tiền</div>
                    <div className="text-2xl font-black text-slate-900">{booking.totalPrice.toLocaleString()}đ</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Ngày chơi
                    </div>
                    <div className="font-bold text-slate-700">{formatToVietnamDate(booking.bookingDate)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Khung giờ
                    </div>
                    <div className="font-bold text-slate-700">{booking.startTime} - {booking.endTime}</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                    {booking.status === "PENDING" || booking.status === "CONFIRMED" ? (
                      <button 
                        onClick={() => handleCancel(booking.id)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                      >
                        <Trash2 className="w-4 h-4" />
                        Hủy lịch
                      </button>
                    ) : (
                      <div className="text-slate-300 italic text-sm">Không thể thao tác</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
