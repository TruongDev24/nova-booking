"use client";

import React, {useState, useEffect, use, useCallback} from "react";
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
    Users,
    AlertCircle
} from "lucide-react";
import {courtService, Court} from "@/services/court.service";
import {bookingService, TimeSlot, CreateBookingResponse} from "@/services/booking.service";
import {toast, Toaster} from "react-hot-toast";
import {useRouter} from "next/navigation";
import Image from "next/image";
import {useSocket} from "@/hooks/useSocket";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function CourtDetailPage({params}: PageProps) {
    const {id} = use(params);
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
    }, [id, fetchSlots]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchSlots();
        setSelectedSlots([]); // Reset selection when date changes
    }, [selectedDate, fetchSlots]);

    // --- REAL-TIME INVENTORY SYNC ---
    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;

        // Join the specific room for this court's inventory
        socket.emit("joinCourtRoom", id);

        // Listen for slots being locked (someone is in checkout)
        socket.on("slots_locked", (data: { bookingDate: string; slots: string[] }) => {
            if (data.bookingDate === selectedDate) {
                setSlots((prev) =>
                    prev.map((slot) =>
                        data.slots.includes(slot.startTime)
                            ? {...slot, isBooked: true}
                            : slot
                    )
                );
                // Deselect if user had it selected
                setSelectedSlots((prev) =>
                    prev.filter((s) => !data.slots.includes(s))
                );
            }
        });

        // Listen for slots being released (checkout failed/expired)
        socket.on("slots_released", (data: { bookingDate: string; slots: string[] }) => {
            if (data.bookingDate === selectedDate) {
                setSlots((prev) =>
                    prev.map((slot) =>
                        data.slots.includes(slot.startTime)
                            ? {...slot, isBooked: false}
                            : slot
                    )
                );
            }
        });

        // Listen for court status changes
        socket.on("court_status_changed", (data: { id: string; isDeleted: boolean; name: string }) => {
            if (data.id === id) {
                setCourt(prev => prev ? {...prev, isDeleted: data.isDeleted} : null);
                if (data.isDeleted) {
                    toast.error(`Sân ${data.name} hiện đã tạm ngưng hoạt động.`);
                } else {
                    toast.success(`Sân ${data.name} đã mở cửa trở lại!`);
                }
            }
        });

        return () => {
            socket.emit("leaveCourtRoom", id);
            socket.off("slots_locked");
            socket.off("slots_released");
            socket.off("court_status_changed");
        };
    }, [socket, id, selectedDate]);

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
        const loadingToast = toast.loading("Đang khởi tạo giao dịch...");

        // Safety Net: 15-second timeout for the entire booking flow
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("TIMEOUT")), 15000)
        );

        try {
            const totalAmount = selectedSlots.length * (court?.pricePerHour || 0);

            // Race the API call against our timeout
            const res = await Promise.race([
                bookingService.createBooking({
                    courtId: id,
                    bookingDate: selectedDate,
                    slots: selectedSlots,
                    totalPrice: totalAmount,
                }),
                timeoutPromise
            ]) as CreateBookingResponse;

            toast.success("Đang chuyển hướng đến cổng thanh toán...", {id: loadingToast});

            if (res.checkoutUrl) {
                window.location.href = res.checkoutUrl;
            } else {
                throw new Error("Không nhận được link thanh toán");
            }
        } catch (error: unknown) {
            console.error("Booking Error:", error);
            
            const err = error as { message?: string; response?: { data?: { message?: string }, status?: number } };
            if (err.message === "TIMEOUT") {
                toast.error("Kết nối không ổn định, vui lòng kiểm tra lại đơn hàng trước khi thử lại", {id: loadingToast});
            } else {
                const message = err.response?.data?.message || "Đặt sân thất bại. Vui lòng thử lại.";
                toast.error(message, {id: loadingToast});

                if (err.response?.status === 401) {
                    router.push("/login");
                }
            }
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4"/>
                    <p className="text-slate-500 font-medium">Đang tải thông tin sân...</p>
                </div>
            </div>
        );
    }

    if (!court) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center p-8 bg-white rounded-3xl shadow-xl">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4"/>
                <h2 className="text-2xl font-bold text-slate-800">Không tìm thấy sân</h2>
                <button onClick={() => router.push('/')} className="mt-4 text-blue-600 font-bold">Quay lại trang chủ
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            <Toaster position="top-center" reverseOrder={false}/>

            {/* Premium Hero Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                <span
                    className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-widest rounded-full border border-blue-100">
                  Phổ biến
                </span>
                                <div className="flex items-center text-amber-400 gap-0.5">
                                    <Star className="w-4 h-4 fill-current"/>
                                    <span className="ml-2 text-slate-900 text-sm font-black">
                    {court.avgRating ? court.avgRating.toFixed(1) : "Chưa có đánh giá"}
                  </span>
                                    {court.totalReviews > 0 && (
                                        <span className="ml-1 text-slate-400 text-sm font-medium">
                      ({court.totalReviews} đánh giá)
                    </span>
                                    )}
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
                                {court.name}
                            </h1>
                            <div className="flex items-center gap-2 text-slate-500 font-medium">
                                <MapPin className="w-5 h-5 text-slate-400"/>
                                {court.location}
                            </div>
                        </div>

                        <div className="flex items-center gap-6 p-2 bg-slate-50 rounded-3xl border border-slate-100">
                            <div className="px-6 py-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Giá
                                    từ</p>
                                <p className="text-3xl font-black text-blue-600">{court.pricePerHour.toLocaleString()}đ<span
                                    className="text-sm text-slate-400 font-bold ml-1">/giờ</span></p>
                            </div>
                            <div className="h-12 w-px bg-slate-200"></div>
                            <div className="pr-6">
                                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                    <ShieldCheck className="w-5 h-5"/>
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
                        <div
                            className="aspect-[16/9] w-full bg-slate-200 rounded-[2.5rem] overflow-hidden relative group shadow-2xl">
                            <Image
                                src={court.images?.[0] || "https://images.unsplash.com/photo-1544033527-b192daee1f5b?q=80&w=2070&auto=format&fit=crop"}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                alt={court.name}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>

                            {/* Real-time Maintenance Overlay */}
                            {court.isDeleted && (
                                <div
                                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-20">
                                    <div
                                        className="bg-white px-8 py-6 rounded-3xl shadow-2xl text-center space-y-4 animate-in zoom-in duration-300">
                                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto"/>
                                        <h3 className="text-xl font-black text-slate-900">Sân đang tạm ngưng</h3>
                                        <p className="text-slate-500 text-sm">Vui lòng quay lại sau hoặc chọn sân
                                            khác.</p>
                                    </div>
                                </div>
                            )}

                            <div className="absolute bottom-8 left-8 text-white">
                                <div
                                    className={`flex items-center gap-2 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold border ${court.isDeleted ? "bg-red-500/80 border-red-400" : "bg-white/20 border-white/30"}`}>
                                    {court.isDeleted ? (
                                        <>
                                            <AlertCircle className="w-4 h-4 text-white"/>
                                            Tạm ngưng hoạt động
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4 text-amber-300 fill-current"/>
                                            Sẵn sàng phục vụ
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Info Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                {
                                    icon: Clock,
                                    label: "Giờ mở cửa",
                                    value: court.openingTime,
                                    color: "text-blue-600",
                                    bg: "bg-blue-50"
                                },
                                {
                                    icon: Clock,
                                    label: "Giờ đóng cửa",
                                    value: court.closingTime,
                                    color: "text-indigo-600",
                                    bg: "bg-indigo-50"
                                },
                                {
                                    icon: Users,
                                    label: "Sức chứa",
                                    value: "2-10 người",
                                    color: "text-emerald-600",
                                    bg: "bg-emerald-50"
                                },
                                {
                                    icon: CheckCircle2,
                                    label: "Loại sân",
                                    value: "Sân tiêu chuẩn",
                                    color: "text-amber-600",
                                    bg: "bg-amber-50"
                                }
                            ].map((item, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                    <div
                                        className={`${item.bg} ${item.color} w-10 h-10 rounded-2xl flex items-center justify-center mb-3`}>
                                        <item.icon className="w-5 h-5"/>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                                    <p className="text-slate-900 font-black">{item.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <Info className="w-7 h-7 text-blue-600"/>
                                Mô tả chi tiết
                            </h2>
                            <div className="prose prose-slate max-w-none">
                                <p className="text-slate-600 leading-relaxed text-lg">
                                    {court.description || "Sân cầu lông tiêu chuẩn quốc tế với hệ thống thảm chuyên dụng, ánh sáng chống chói và không gian thoáng đãng. Đây là địa điểm lý tưởng cho các trận đấu giao lưu cũng như tập luyện chuyên nghiệp."}
                                </p>
                            </div>
                        </section>

                        {/* Amenities Section */}
                        {court.amenities && court.amenities.length > 0 && (
                            <section
                                className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                    <CheckCircle2 className="w-7 h-7 text-emerald-600"/>
                                    Tiện ích đi kèm
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    {court.amenities.map((amenity, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-4 group transition-all duration-300 hover:translate-x-2"
                                        >
                                            <div
                                                className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                                                <CheckCircle2 className="w-5 h-5"/>
                                            </div>
                                            <span className="text-slate-700 font-bold text-lg tracking-tight">
                        {amenity}
                      </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right: Booking Engine (4 cols) */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-8 space-y-6">
                            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
                                <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                                    <div
                                        className="absolute -right-4 -top-4 w-24 h-24 bg-blue-600 rounded-full blur-3xl opacity-50"></div>
                                    <h2 className="text-2xl font-black mb-2 relative z-10">Lịch thi đấu</h2>
                                    <p className="text-slate-400 text-sm font-medium relative z-10">Chọn ngày và khung
                                        giờ bạn muốn</p>
                                </div>

                                <div className="p-8 space-y-8">
                                    {/* Date Selector */}
                                    <div>
                                        <label
                                            className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                            1. Chọn ngày
                                        </label>
                                        <div className="relative group">
                                            <div
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                <Calendar className="w-5 h-5"/>
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
                                            <label
                                                className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                                                2. Chọn khung giờ
                                            </label>
                                            {slotsLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600"/>}
                                        </div>

                                        {slotsLoading ? (
                                            <div className="grid grid-cols-4 gap-3 animate-pulse">
                                                {[...Array(12)].map((_, i) => (
                                                    <div key={i} className="h-16 bg-slate-100 rounded-2xl"></div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-4 gap-2">
                                                {slots.map((slot) => {
                                                    const isSelected = selectedSlots.includes(slot.startTime);
                                                    const isDisabled = slot.isBooked || slot.isPast || slot.isClosed;

                                                    // Determine status text and style
                                                    let statusText = "Trống";
                                                    let styleClasses = "bg-white border-slate-100 text-slate-700 hover:border-blue-500 hover:shadow-md";

                                                    if (slot.isClosed) {
                                                        statusText = "Đóng cửa";
                                                        styleClasses = "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60";
                                                    } else if (slot.isBooked) {
                                                        statusText = "Đã đặt";
                                                        styleClasses = "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed";
                                                    } else if (slot.isPast) {
                                                        statusText = "Đã qua";
                                                        styleClasses = "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-80";
                                                    } else if (isSelected) {
                                                        styleClasses = "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 -translate-y-1";
                                                        statusText = "Đã chọn";
                                                    }

                                                    return (
                                                        <button
                                                            key={slot.startTime}
                                                            disabled={isDisabled}
                                                            onClick={() => toggleSlot(slot.startTime, isDisabled)}
                                                            className={`
                                relative py-3 px-1 rounded-xl text-xs font-black transition-all duration-300 border-2 flex flex-col items-center justify-center gap-0.5 group
                                ${styleClasses}
                              `}
                                                        >
                                                            <span className="text-sm">{slot.startTime}</span>
                                                            <span
                                                                className={`text-[8px] uppercase tracking-tighter opacity-70 ${isSelected ? "text-blue-100" : ""}`}>
                                {statusText}
                              </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Summary & Legend */}
                            <div className="flex flex-col gap-4 px-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200 opacity-60"></div>
                                        <span
                                            className="text-[10px] font-black text-slate-400 uppercase">Đóng cửa</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-md bg-slate-50 border border-slate-100"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Đã đặt / Đã qua</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-md bg-blue-600"></div>
                                        <span
                                            className="text-[10px] font-black text-slate-400 uppercase">Đang chọn</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-md bg-white border-2 border-slate-100"></div>
                                        <span
                                            className="text-[10px] font-black text-slate-400 uppercase">Còn trống</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Floating Bottom Booking Summary (Sticky Bar) */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 transform ${selectedSlots.length > 0 ? "translate-y-0" : "translate-y-full"}`}>
                <div className="max-w-4xl mx-auto px-4 pb-8">
                    <div
                        className="bg-slate-900 rounded-[2.5rem] p-4 pl-8 shadow-2xl shadow-blue-500/20 border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-8">
                            <div className="space-y-1">
                                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Khung giờ
                                    đã chọn</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-white text-2xl font-black">{selectedSlots.length} ca</span>
                                    <span
                                        className="text-slate-500 text-sm font-medium">({selectedSlots.join(', ')})</span>
                                </div>
                            </div>
                            <div className="w-px h-10 bg-slate-800 hidden sm:block"></div>
                            <div className="space-y-1">
                                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Tổng tạm
                                    tính</p>
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
                                <Loader2 className="w-6 h-6 animate-spin"/>
                            ) : (
                                <>
                                    Xác nhận đặt sân
                                    <ChevronRight className="w-5 h-5"/>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
