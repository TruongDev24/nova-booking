"use client";

import React, {useState, useEffect} from "react";
import {
    Calendar,
    Clock,
    MapPin,
    CheckCircle2,
    XCircle,
    Loader2,
    Trash2,
    Star,
    CreditCard,
    AlertCircle
} from "lucide-react";
import {bookingService} from "@/services/booking.service";
import {paymentService} from "@/services/payment.service";
import {toast, Toaster} from "react-hot-toast";
import {formatToVietnamDate} from "@/lib/date-format";
import {useRouter} from "next/navigation";
import Image from "next/image";
import {ReviewDialog} from "@/components/reviews/ReviewDialog";
import {userService, User} from "@/services/user.service";
import {useLanguage} from "@/context/language-context";

interface Booking {
    id: string;
    courtId: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    paymentStatus: "UNPAID" | "PARTIAL_PAID" | "PAID" | "REFUNDED";
    payosOrderCode?: string | null;
    cancelReason?: string | null;
    court: {
        name: string;
        location: string;
        images: string[];
    };
    createdAt: string;
    review?: {
        id: string;
        rating: number;
        comment: string;
    } | null;
}

export default function MyBookingsPage() {
    const router = useRouter();
    const {t} = useLanguage();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState<string | null>(null);

    const fetchBookings = React.useCallback(async () => {
        try {
            setIsLoading(true);
            const [bookingsData, profileData] = await Promise.all([
                bookingService.getMyBookings(),
                userService.getProfile()
            ]);
            setBookings(bookingsData);
            setUserProfile(profileData);
        } catch (error) {
            console.error(error);
            toast.error(t("userBookings.toastFetchError"));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void fetchBookings();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchBookings]);

    // Real-time refresh
    useEffect(() => {
        const handleRefresh = () => {
            void fetchBookings();
        };
        window.addEventListener("refresh_data", handleRefresh);
        return () => window.removeEventListener("refresh_data", handleRefresh);
    }, [fetchBookings]);

    const handlePayment = async (bookingId: string) => {
        try {
            setIsProcessingPayment(bookingId);
            toast.loading(t("userBookings.toastInitializingPayment"), {id: "payment"});

            const {checkoutUrl} = await paymentService.createLink(bookingId);

            toast.success(t("userBookings.toastRedirecting"), {id: "payment"});
            window.location.assign(checkoutUrl);
        } catch (error) {
            console.error(error);
            toast.error(t("userBookings.toastPaymentLinkError"), {id: "payment"});
        } finally {
            setIsProcessingPayment(null);
        }
    };

    const handleCancel = async (id: string) => {
        if (!window.confirm(t("userBookings.confirmCancel"))) return;

        try {
            setIsCancelling(id);
            await bookingService.cancelBooking(id);
            toast.success(t("userBookings.toastCancelSuccess"));
            void fetchBookings();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            const message = err.response?.data?.message || t("userBookings.toastCancelError");
            toast.error(message);
        } finally {
            setIsCancelling(null);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "CONFIRMED":
                return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
            case "CANCELLED":
                return "bg-rose-500/10 text-rose-500 border-rose-500/20";
            case "COMPLETED":
                return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            default:
                return "bg-amber-500/10 text-amber-500 border-amber-500/20";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "CONFIRMED":
                return <CheckCircle2 className="w-4 h-4"/>;
            case "CANCELLED":
                return <XCircle className="w-4 h-4"/>;
            case "COMPLETED":
                return <CheckCircle2 className="w-4 h-4"/>;
            default:
                return <Clock className="w-4 h-4"/>;
        }
    };

    const [now] = React.useState(() => Date.now());

    const canCancel = (bookingDate: string, startTime: string) => {
        const [year, month, day] = bookingDate.split('-').map(Number);
        const [hour, minute] = startTime.split(':').map(Number);
        const VN_UTC_OFFSET_HOURS = 7;

        const playTimeMs = Date.UTC(
            year,
            month - 1,
            day,
            hour - VN_UTC_OFFSET_HOURS,
            minute,
            0,
            0,
        );

        const hoursDiff = (playTimeMs - now) / (1000 * 60 * 60);
        return hoursDiff >= 12;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-primary"/>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Toaster position="top-right"/>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">{t("userBookings.title")}</h1>
                    <p className="text-muted-foreground mt-1">{t("userBookings.subtitle")}</p>
                </div>
            </div>

            {bookings.length === 0 ? (
                <div className="bg-card rounded-[2rem] border border-dashed border-border p-20 flex flex-col items-center text-center">
                    <div className="bg-muted p-6 rounded-full mb-6 border">
                        <Calendar className="w-12 h-12 text-muted-foreground/50"/>
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{t("userBookings.noBookings")}</h3>
                    <p className="text-muted-foreground mt-2 max-w-xs">{t("userBookings.noBookingsDesc")}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {bookings.map((booking) => (
                        <div key={booking.id} className="bg-card rounded-[2.5rem] border border-border shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 overflow-hidden flex flex-col md:flex-row group">
                            {/* Image Section */}
                            <div className="w-full md:w-64 h-48 md:h-auto relative bg-muted shrink-0">
                                {booking.court.images?.[0] ? (
                                    <Image src={booking.court.images[0]} alt={booking.court.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                                        <MapPin className="w-8 h-8"/>
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
                                        <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                            {booking.court.name}
                                        </h3>
                                        <div className="flex items-center text-muted-foreground gap-2 text-sm">
                                            <MapPin className="w-4 h-4 shrink-0"/>
                                            {booking.court.location}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-muted-foreground/60 mb-1">{t("userBookings.totalPrice")}</div>
                                        <div className="text-2xl font-black text-foreground">{booking.totalPrice.toLocaleString()}đ</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-border/60">
                                    <div className="space-y-1">
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3"/> {t("userBookings.playDate")}
                                        </div>
                                        <div className="font-bold text-foreground/80">{formatToVietnamDate(booking.bookingDate)}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                                            <Clock className="w-3 h-3"/> {t("userBookings.timeSlot")}
                                        </div>
                                        <div className="font-bold text-foreground/80">{booking.startTime} - {booking.endTime}</div>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1 flex flex-col sm:items-end justify-center gap-3">
                                        {(booking.status === "PENDING" || booking.status === "CONFIRMED") && booking.paymentStatus === "UNPAID" && (
                                            <button
                                                onClick={() => handlePayment(booking.id)}
                                                disabled={isProcessingPayment === booking.id}
                                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/20 disabled:opacity-50 w-full sm:w-auto cursor-pointer"
                                            >
                                                {isProcessingPayment === booking.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin"/>
                                                ) : (
                                                    <CreditCard className="w-4 h-4"/>
                                                )}
                                                {t("userBookings.payBtn")}
                                            </button>
                                        )}

                                        {/* Cancellation Logic */}
                                        {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
                                            <>
                                                {booking.paymentStatus === "PAID" ? (
                                                    !userProfile?.bankAccountNumber || !userProfile?.bankName ? (
                                                        <div className="flex flex-col items-end gap-3 p-4 bg-amber-500/10 dark:bg-amber-950/20 rounded-2xl border border-amber-500/20 max-w-sm">
                                                            <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-[11px] font-medium leading-relaxed">
                                                                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                                                                <span>{t("userBookings.needBankInfo")}</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => router.push("/user/profile/bank")}
                                                                className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                                                            >
                                                                {t("userBookings.updateNow")}
                                                            </button>
                                                        </div>
                                                    ) : canCancel(booking.bookingDate, booking.startTime) ? (
                                                        <button
                                                            disabled={isCancelling === booking.id}
                                                            onClick={() => handleCancel(booking.id)}
                                                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-500/10 text-rose-500 rounded-xl font-bold hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20 w-full sm:w-auto disabled:opacity-50 cursor-pointer"
                                                        >
                                                            {isCancelling === booking.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4"/>
                                                            )}
                                                            {t("userBookings.cancelRefundBtn")}
                                                        </button>
                                                    ) : (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-muted-foreground/60 text-xs font-medium italic">{t("userBookings.cancelLimit")}</span>
                                                            <span className="text-[10px] text-muted-foreground/40">{t("userBookings.noRefund")}</span>
                                                        </div>
                                                    )
                                                ) : (
                                                    // For unpaid/pending bookings, they just expire or can be cancelled without refund logic
                                                    booking.status === "PENDING" && (
                                                        <button
                                                            onClick={() => handleCancel(booking.id)}
                                                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-muted hover:bg-muted/80 text-foreground/70 rounded-xl font-bold transition-all border border-border w-full sm:w-auto cursor-pointer"
                                                        >
                                                            {t("userBookings.cancelBtn")}
                                                        </button>
                                                    )
                                                )}
                                            </>
                                        )}

                                        {booking.status === "COMPLETED" && (
                                            booking.review ? (
                                                <div className="flex items-center gap-2 px-6 py-2.5 bg-muted text-muted-foreground/50 rounded-xl font-bold border border-border cursor-default">
                                                    <Star className="w-4 h-4 fill-muted-foreground/20 text-muted-foreground/30"/>
                                                    {t("userBookings.rated")}
                                                </div>
                                            ) : (
                                                <ReviewDialog
                                                    bookingId={booking.id}
                                                    courtName={booking.court.name}
                                                    onSuccess={fetchBookings}
                                                >
                                                    <button className="flex items-center gap-2 px-6 py-2.5 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary hover:text-primary-foreground transition-all border border-primary/20 cursor-pointer">
                                                        <Star className="w-4 h-4"/>
                                                        {t("userBookings.rateBtn")}
                                                    </button>
                                                </ReviewDialog>
                                            )
                                        )}

                                        {booking.status === "CANCELLED" && (
                                            <div className="flex flex-col items-end">
                                                <div className="text-rose-500 italic text-sm font-medium">
                                                    {t("userBookings.cancelled")}
                                                </div>
                                                {booking.cancelReason && (
                                                    <div className="text-[10px] text-muted-foreground/60 mt-1 max-w-[200px] text-right">
                                                        {t("userBookings.reason", { reason: booking.cancelReason })}
                                                    </div>
                                                )}
                                            </div>
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
