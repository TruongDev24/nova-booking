"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Info, 
  CheckCircle2, 
  Loader2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Star,
  Users
} from "lucide-react";
import { courtService, Court } from "@/services/court.service";
import { bookingService, TimeSlot } from "@/services/booking.service";
import { toast, Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CourtDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  
  const [court, setCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const fetchSlots = useCallback(async () => {
    try {
      setSlotsLoading(true);
      const formattedDate = new Date(selectedDate).toISOString().split('T')[0];
      const slotsData = await bookingService.getSlots(id, formattedDate);
      setSlots(Array.isArray(slotsData) ? slotsData : []);
    } catch (error) {
      console.error("Fetch Slots Error:", error);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [id, selectedDate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const courtData = await courtService.getOne(id);
        setCourt(courtData);
        await fetchSlots();
      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error("Không thể tải thông tin sân");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]); // Only run once on mount

  useEffect(() => {
    fetchSlots();
    setSelectedSlots([]); // Reset selection when date changes
  }, [selectedDate, fetchSlots]);

  const toggleSlot = (startTime: string, isBooked: boolean) => {
    if (isBooked) return;
    
    setSelectedSlots(prev => 
      prev.includes(startTime) 
        ? prev.filter(s => s !== startTime) 
        : [...prev, startTime].sort()
    );
  };

  const handleBooking = async () => {
    if (selectedSlots.length === 0) {
      toast.error("Vui lòng chọn ít nhất một khung giờ");
      return;
    }

    setBookingLoading(true);
    try {
      const totalAmount = selectedSlots.length * (court?.pricePerHour || 0);
      
      await bookingService.createBooking({
        courtId: id,
        bookingDate: selectedDate,
        slots: selectedSlots,
        totalPrice: totalAmount,
      });
      
      toast.success("Đặt lịch thành công!");
      setSelectedSlots([]);
      await fetchSlots();
    } catch (error: any) {
      const message = error.response?.data?.message || "Đặt sân thất bại. Vui lòng thử lại.";
      toast.error(message);
      if (error.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Đang tải thông tin sân...</p>
        </div>
      </div>
    );
  }

  if (!court) return (
    <div className="min-h-screen flex items-center justify-center">
       <div className="text-center p-8 bg-white rounded-3xl shadow-xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">Không tìm thấy sân</h2>
          <button onClick={() => router.push('/')} className="mt-4 text-blue-600 font-bold">Quay lại trang chủ</button>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* Premium Hero Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-widest rounded-full border border-blue-100">
                  Phổ biến
                </span>
                <div className="flex items-center text-amber-400 gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
                  <span className="ml-2 text-slate-400 text-sm font-medium">(4.8/5)</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
                {court.name}
              </h1>
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <MapPin className="w-5 h-5 text-slate-400" />
                {court.location}
              </div>
            </div>
            
            <div className="flex items-center gap-6 p-2 bg-slate-50 rounded-3xl border border-slate-100">
               <div className="px-6 py-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Giá từ</p>
                  <p className="text-3xl font-black text-blue-600">{court.pricePerHour.toLocaleString()}đ<span className="text-sm text-slate-400 font-bold ml-1">/giờ</span></p>
               </div>
               <div className="h-12 w-px bg-slate-200"></div>
               <div className="pr-6">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <ShieldCheck className="w-5 h-5" />
                    Đảm bảo giá tốt
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left: Details & Specs (8 cols) */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Gallery / Placeholder */}
            <div className="aspect-[16/9] w-full bg-slate-200 rounded-[2.5rem] overflow-hidden relative group shadow-2xl">
               <img 
                src={court.images?.[0] || "https://images.unsplash.com/photo-1544033527-b192daee1f5b?q=80&w=2070&auto=format&fit=crop"} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt={court.name}
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
               <div className="absolute bottom-8 left-8 text-white">
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold border border-white/30">
                    <Zap className="w-4 h-4 text-amber-300 fill-current" />
                    Sẵn sàng phục vụ
                  </div>
               </div>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {[
                 { icon: Clock, label: "Giờ mở cửa", value: court.openingTime, color: "text-blue-600", bg: "bg-blue-50" },
                 { icon: Clock, label: "Giờ đóng cửa", value: court.closingTime, color: "text-indigo-600", bg: "bg-indigo-50" },
                 { icon: Users, label: "Sức chứa", value: "2-10 người", color: "text-emerald-600", bg: "bg-emerald-50" },
                 { icon: CheckCircle2, label: "Loại sân", value: "Sân tiêu chuẩn", color: "text-amber-600", bg: "bg-amber-50" }
               ].map((item, idx) => (
                 <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <div className={`${item.bg} ${item.color} w-10 h-10 rounded-2xl flex items-center justify-center mb-3`}>
                       <item.icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-slate-900 font-black">{item.value}</p>
                 </div>
               ))}
            </div>

            {/* Description */}
            <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <Info className="w-7 h-7 text-blue-600" />
                Mô tả chi tiết
              </h2>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 leading-relaxed text-lg">
                  {court.description || "Sân cầu lông tiêu chuẩn quốc tế với hệ thống thảm chuyên dụng, ánh sáng chống chói và không gian thoáng đãng. Đây là địa điểm lý tưởng cho các trận đấu giao lưu cũng như tập luyện chuyên nghiệp."}
                </p>
              </div>
            </section>
          </div>

          {/* Right: Booking Engine (4 cols) */}
          <div className="lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
                <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-600 rounded-full blur-3xl opacity-50"></div>
                   <h2 className="text-2xl font-black mb-2 relative z-10">Lịch thi đấu</h2>
                   <p className="text-slate-400 text-sm font-medium relative z-10">Chọn ngày và khung giờ bạn muốn</p>
                </div>

                <div className="p-8 space-y-8">
                  {/* Date Selector */}
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                      1. Chọn ngày
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <input 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-slate-900 transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Slots Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                        2. Chọn khung giờ
                      </label>
                      {slotsLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                    </div>

                    {slotsLoading ? (
                      <div className="grid grid-cols-3 gap-3 animate-pulse">
                        {[1,2,3,4,5,6].map(i => (
                          <div key={i} className="h-16 bg-slate-100 rounded-2xl"></div>
                        ))}
                      </div>
                    ) : slots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {slots.map((slot) => {
                          const isSelected = selectedSlots.includes(slot.startTime);
                          return (
                            <button
                              key={slot.startTime}
                              disabled={slot.isBooked}
                              onClick={() => toggleSlot(slot.startTime, slot.isBooked)}
                              className={`
                                relative py-4 px-1 rounded-2xl text-xs font-black transition-all duration-300 border-2 flex flex-col items-center justify-center gap-1 group
                                ${slot.isBooked 
                                  ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" 
                                  : isSelected
                                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 -translate-y-1"
                                    : "bg-white border-slate-100 text-slate-700 hover:border-blue-500 hover:shadow-md"
                                }
                              `}
                            >
                              <span className="text-sm">{slot.startTime}</span>
                              <span className={`text-[9px] uppercase tracking-tighter opacity-70 ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                                {slot.isBooked ? "Đã đặt" : isSelected ? "Đã chọn" : "Trống"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                         <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sân đã đóng cửa</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary & Legend */}
              <div className="flex flex-col gap-4 px-4">
                 <div className="flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">Đã đặt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">Đang chọn</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white border border-slate-200"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">Trống</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Booking Summary (Sticky Bar) */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 transform ${selectedSlots.length > 0 ? "translate-y-0" : "translate-y-full"}`}>
         <div className="max-w-4xl mx-auto px-4 pb-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-4 pl-8 shadow-2xl shadow-blue-500/20 border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-8">
                  <div className="space-y-1">
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Khung giờ đã chọn</p>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-2xl font-black">{selectedSlots.length} ca</span>
                      <span className="text-slate-500 text-sm font-medium">({selectedSlots.join(', ')})</span>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-slate-800 hidden sm:block"></div>
                  <div className="space-y-1">
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Tổng tạm tính</p>
                    <p className="text-white text-2xl font-black">
                      {(selectedSlots.length * (court?.pricePerHour || 0)).toLocaleString()}
                      <span className="text-slate-500 text-xs font-bold ml-1">VNĐ</span>
                    </p>
                  </div>
               </div>
               
               <button 
                onClick={handleBooking}
                disabled={bookingLoading}
                className="w-full sm:w-auto px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 active:scale-95"
               >
                 {bookingLoading ? (
                   <Loader2 className="w-6 h-6 animate-spin" />
                 ) : (
                   <>
                     Xác nhận đặt sân
                     <ChevronRight className="w-5 h-5" />
                   </>
                 )}
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
