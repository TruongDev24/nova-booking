import React from "react";
import { Calendar, Clock, MapPin, CreditCard, ChevronRight, AlertCircle } from "lucide-react";

export default function MyBookingsPage() {
  const myBookings = [
    {
      id: "BK-9901",
      courtName: "NOVA Stadium - Sân số 1",
      date: "24/04/2026",
      timeSlot: "18:00 - 20:00",
      totalPrice: 160000,
      status: "CONFIRMED",
      statusLabel: "Đã xác nhận",
      statusColor: "bg-emerald-100 text-emerald-700",
    },
    {
      id: "BK-8824",
      courtName: "Pro Court Center",
      date: "22/04/2026",
      timeSlot: "19:00 - 20:00",
      totalPrice: 120000,
      status: "COMPLETED",
      statusLabel: "Đã hoàn thành",
      statusColor: "bg-slate-100 text-slate-700",
    },
    {
      id: "BK-7756",
      courtName: "Sân Ngôi Sao",
      date: "26/04/2026",
      timeSlot: "08:00 - 10:00",
      totalPrice: 130000,
      status: "PENDING",
      statusLabel: "Đang chờ",
      statusColor: "bg-amber-100 text-amber-700",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Lịch sử đặt sân</h1>
        <p className="text-slate-500">Quản lý các lượt đặt sân và xem lại lịch sử chơi của bạn.</p>
      </div>

      <div className="space-y-4">
        {myBookings.map((booking) => (
          <div key={booking.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-cyan-200 transition-all group">
            <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              {/* Left Info */}
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                  <Calendar className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{booking.id}</span>
                     <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${booking.statusColor}`}>
                        {booking.statusLabel}
                     </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">{booking.courtName}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{booking.timeSlot}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Stats & Actions */}
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Tổng thanh toán</p>
                  <p className="text-xl font-black text-slate-900">{booking.totalPrice.toLocaleString()}đ</p>
                </div>
                
                <div className="flex items-center gap-2">
                   {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
                      <button className="px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        Hủy lịch
                      </button>
                   )}
                   <button className="p-2 bg-slate-50 rounded-xl group-hover:bg-cyan-500 group-hover:text-white transition-all">
                      <ChevronRight className="w-5 h-5" />
                   </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State Help */}
      <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-start gap-4">
         <AlertCircle className="w-6 h-6 text-indigo-500 flex-shrink-0 mt-0.5" />
         <div>
            <h4 className="font-bold text-indigo-900 mb-1">Chính sách hoàn tiền</h4>
            <p className="text-sm text-indigo-700 leading-relaxed">
               Bạn có thể hủy lịch miễn phí trước 24 giờ so với giờ chơi. Các lượt hủy sau thời gian này có thể áp dụng phí hoàn trả tùy theo quy định của từng chủ sân.
            </p>
         </div>
      </div>
    </div>
  );
}
