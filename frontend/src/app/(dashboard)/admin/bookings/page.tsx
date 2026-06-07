"use client";

import React, { useState } from "react";
import {
    Clock,
    MapPin,
    CheckCircle2,
    XCircle,
    Check,
    MoreHorizontal,
    Search,
    ArrowRight,
    Wallet,
    QrCode,
    Loader2,
    Activity
} from "lucide-react";
import { bookingService, Booking } from "@/services/booking.service";
import { toast } from "sonner";
import Image from "next/image";
import { formatToVietnamDate } from "@/lib/date-format";
import { ColumnDef } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/hooks/use-socket";
import { useLanguage } from "@/context/language-context";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function AdminBookingsPage() {
    const queryClient = useQueryClient();
    const { t } = useLanguage();
    const [view, setView] = useState<"all" | "refunds">("all");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    const handleViewChange = (newView: "all" | "refunds") => {
        setView(newView);
        setSearch("");
        setStatus("");
        setStartDate("");
        setEndDate("");
    };

    const [bookingToConfirm, setBookingToConfirm] = useState<string | null>(null);
    const [bookingToRefund, setBookingToRefund] = useState<Booking | null>(null);

    // --- REAL-TIME UPDATES ---
    const socket = useSocket();
    React.useEffect(() => {
        if (!socket) return;

        const handleBookingChange = (data: { 
            customerName?: string; 
            courtName?: string; 
            totalPrice?: number;
            [key: string]: unknown; 
        }) => {
            console.log("Real-time booking update received:", data);
            
            // Show dynamic toast based on event
            if (data?.customerName) {
                toast.success(t("bookings.toastNewOrder", { name: data.customerName }), {
                    description: `${data.courtName} - ${data.totalPrice?.toLocaleString() ?? "0"}đ`,
                    duration: 5000,
                });
            } else {
                toast.info(t("bookings.toastOrderChanged"));
            }

            void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
            void queryClient.refetchQueries({ queryKey: ["admin-bookings"] });
        };

        socket.on("new_booking", handleBookingChange);
        socket.on("booking_canceled", handleBookingChange);
        socket.on("booking_initiated", handleBookingChange);

        return () => {
            socket.off("new_booking", handleBookingChange);
            socket.off("booking_canceled", handleBookingChange);
            socket.off("booking_initiated", handleBookingChange);
        };
    }, [socket, queryClient, t]);

    // --- React Query: Fetch ---
    const { data: bookingsData, isLoading } = useQuery({
        queryKey: ["admin-bookings", search, status, startDate, endDate, view],
        queryFn: () => bookingService.getAllAdmin({
            page: 1,
            limit: 50, 
            search,
            status: view === "refunds" ? "CANCELLED" : status,
            refundStatus: view === "refunds" ? "PENDING" : undefined,
            startDate,
            endDate
        }),
    });

    const allBookings = bookingsData?.data || [];
    // Filter for pending refunds if in refund view
    const bookings = view === "refunds" 
        ? allBookings.filter(b => b.status === "CANCELLED" && b.refundStatus === "PENDING")
        : allBookings;



    // --- Mutations ---
    const confirmMutation = useMutation({
        mutationFn: (id: string) => bookingService.confirmBookingAdmin(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
            setBookingToConfirm(null);
            toast.success(t("bookings.confirmSuccess"));
        },
        onError: (error: { response?: { data?: { message?: string } } }) => {
            const message = error.response?.data?.message || t("bookings.confirmError");
            toast.error(message);
        }
    });


    const refundMutation = useMutation({
        mutationFn: (id: string) => bookingService.markAsRefundedAdmin(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
            setBookingToRefund(null);
            toast.success(t("bookings.refundSuccess"));
        },
        onError: (error: { response?: { data?: { message?: string } } }) => {
            const message = error.response?.data?.message || t("bookings.refundError");
            toast.error(message);
        }
    });

    const getVietQRUrl = (booking: Booking) => {
        if (!booking.user?.bankAccountNumber || !booking.user?.bankName) return "";
        const amount = booking.totalPrice;
        const addInfo = encodeURIComponent(`Hoan tien Booking ${booking.id.slice(-6)}`);
        const accountName = encodeURIComponent(booking.user.bankAccountName || "");
        return `https://img.vietqr.io/image/${booking.user.bankName}-${booking.user.bankAccountNumber}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
    };

    const columns: ColumnDef<Booking>[] = [
        {
            accessorKey: "id",
            header: t("bookings.code"),
            cell: ({ row }) => (
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    #{row.original.id.slice(-6)}
                </span>
            ),
        },
        {
            id: "customer",
            header: t("bookings.customer"),
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold tracking-tight">{row.original.user?.fullName}</span>
                    <span className="text-[11px] text-muted-foreground font-medium">{row.original.user?.phone}</span>
                </div>
            ),
        },
        {
            id: "court",
            header: t("bookings.court"),
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{row.original.court?.name}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                        <MapPin className="h-3 w-3" /> {row.original.court?.location}
                    </span>
                </div>
            ),
        },
        {
            id: "schedule",
            header: t("bookings.schedule"),
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold">{formatToVietnamDate(row.original.bookingDate)}</span>
                    <span className="text-xs text-primary font-black uppercase tracking-tighter">
                        {row.original.startTime} - {row.original.endTime}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "totalPrice",
            header: () => <div className="text-right">{t("bookings.payment")}</div>,
            cell: ({ row }) => (
                <div className="text-right font-black text-lg">
                    {row.original.totalPrice.toLocaleString()}đ
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: () => <div className="text-center">{t("bookings.status")}</div>,
            cell: ({ row }) => {
                const status = row.original.status;
                const refund = row.original.refundStatus;
                
                if (status === "CANCELLED" && refund === "PENDING") {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30 font-black text-[10px] uppercase animate-pulse">
                                <Wallet className="mr-1.5 h-3 w-3" /> {t("bookings.statusRefundPending")}
                            </Badge>
                        </div>
                    );
                }
                
                if (refund === "COMPLETED") {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30 font-black text-[10px] uppercase">
                                <CheckCircle2 className="mr-1.5 h-3 w-3" /> {t("bookings.statusRefundCompleted")}
                            </Badge>
                        </div>
                    );
                }

                if (status === "COMPLETED") {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30 font-black text-[10px] uppercase">
                                <CheckCircle2 className="mr-1.5 h-3 w-3" /> {t("bookings.statusCompleted")}
                            </Badge>
                        </div>
                    );
                }

                if (status === "CONFIRMED") {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30 font-black text-[10px] uppercase">
                                <CheckCircle2 className="mr-1.5 h-3 w-3" /> {t("bookings.statusConfirmed")}
                            </Badge>
                        </div>
                    );
                }
                
                if (status === "CANCELLED") {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="bg-destructive/10 dark:bg-destructive/20 text-destructive border-destructive/20 font-black text-[10px] uppercase">
                                <XCircle className="mr-1.5 h-3 w-3" /> {t("bookings.statusCancelled")}
                            </Badge>
                        </div>
                    );
                }
                
                return (
                    <div className="flex justify-center">
                        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/30 font-black text-[10px] uppercase">
                            <Clock className="mr-1.5 h-3 w-3" /> {t("bookings.statusPending")}
                        </Badge>
                    </div>
                );
            },
        },
        {
            id: "reason",
            header: t("bookings.reason"),
            cell: ({ row }) => (
                <div className="max-w-[150px]">
                    <span className="text-[11px] text-muted-foreground italic font-medium">
                        {row.original.cancelReason || ""}
                    </span>
                </div>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const booking = row.original;
                const hasActions = booking.status === "PENDING";

                return (
                    <div className="flex items-center gap-2">
                        {booking.status === "CANCELLED" && booking.refundStatus === "PENDING" && (
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 hover:bg-rose-500/20 font-bold text-xs cursor-pointer active:scale-95 transition-all"
                                onClick={() => setBookingToRefund(booking)}
                            >
                                <QrCode className="mr-2 h-3 w-3" /> {t("bookings.refund")}
                            </Button>
                        )}
                        
                        {hasActions ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger render={
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                } />
                                <DropdownMenuContent align="end">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>{t("bookings.orderActions")}</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setBookingToConfirm(booking.id)} className="cursor-pointer">
                                            <Check className="mr-2 h-4 w-4 text-emerald-500" /> {t("bookings.confirmOrder")}
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="w-8" />
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight uppercase italic">{t("bookings.title")}</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <button 
                            onClick={() => handleViewChange("all")}
                            className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all cursor-pointer ${view === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            {t("bookings.allBookings")}
                        </button>
                        <button 
                            onClick={() => handleViewChange("refunds")}
                            className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all flex items-center gap-2 cursor-pointer ${view === "refunds" ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <Wallet className="w-4 h-4" /> {t("bookings.pendingRefunds")}
                        </button>
                    </div>
                </div>
                <div className="bg-card border rounded-2xl px-6 py-4 flex items-center gap-8 shadow-sm">
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                            {view === "all" ? t("bookings.totalBookings") : t("bookings.needRefund")}
                        </span>
                        <span className={`text-3xl font-black leading-none mt-1.5 ${view === "refunds" ? "text-rose-600" : ""}`}>{bookings.length}</span>
                    </div>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="rounded-full h-12 w-12 border-border cursor-pointer active:scale-95"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-bookings"] })}
                    >
                        <Activity className="w-5 h-5 text-muted-foreground" />
                    </Button>
                </div>
            </div>

            {view === "all" && (
                <div className="bg-card border p-4 rounded-[2rem] shadow-sm flex flex-col lg:flex-row items-center gap-4">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("bookings.searchPlaceholder")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-12 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background font-bold text-sm"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="h-12 px-4 bg-muted/30 border border-transparent rounded-xl outline-none focus:border-primary font-bold text-xs cursor-pointer text-foreground"
                        >
                            <option value="" className="bg-card text-muted-foreground">{t("bookings.status")}</option>
                            <option value="PENDING">{t("bookings.statusPending")}</option>
                            <option value="CONFIRMED">{t("bookings.statusConfirmed")}</option>
                            <option value="COMPLETED">{t("bookings.statusCompleted")}</option>
                            <option value="CANCELLED">{t("bookings.statusCancelled")}</option>
                        </select>
                        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-transparent focus-within:border-primary">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent pl-3 pr-1 h-10 outline-none font-bold text-[11px] cursor-pointer text-foreground" />
                            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent pl-1 pr-3 h-10 outline-none font-bold text-[11px] cursor-pointer text-foreground" />
                        </div>
                        {(search || status || startDate || endDate) && (
                            <Button variant="ghost" onClick={() => { setSearch(""); setStatus(""); setStartDate(""); setEndDate(""); }} className="text-destructive font-black text-[10px] uppercase tracking-widest hover:bg-destructive/10">{t("bookings.reset")}</Button>
                        )}
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="space-y-4">
                    <div className="border rounded-xl">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4 p-6 border-b last:border-0">
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-5 w-[60%]" />
                                    <Skeleton className="h-4 w-[30%]" />
                                </div>
                                <Skeleton className="h-6 w-[100px] rounded-full" />
                                <Skeleton className="h-4 w-[80px]" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <DataTable columns={columns} data={bookings} />
            )}

            {/* Refund Dialog */}
            <AlertDialog open={!!bookingToRefund} onOpenChange={() => setBookingToRefund(null)}>
                <AlertDialogContent className="rounded-[2.5rem] max-w-lg bg-card text-card-foreground">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black uppercase italic flex items-center gap-2">
                            <Wallet className="w-6 h-6 text-rose-600" /> {t("bookings.manualRefund")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-muted-foreground">
                            {t("bookings.manualRefundDesc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {bookingToRefund && (
                        <div className="space-y-6 py-4">
                            {/* VietQR Display */}
                            <div className="flex flex-col items-center gap-4 bg-muted/30 p-6 rounded-[2rem] border border-border">
                                {bookingToRefund.user?.bankAccountNumber ? (
                                    <div className="relative w-64 h-64 bg-white p-2 rounded-2xl shadow-sm overflow-hidden">
                                        <Image 
                                            src={getVietQRUrl(bookingToRefund)} 
                                            alt="VietQR"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-64 h-64 flex flex-col items-center justify-center text-center gap-2 text-rose-500 font-bold px-4">
                                        <XCircle className="w-12 h-12" />
                                        {t("bookings.noBankInfo")}
                                    </div>
                                )}
                                
                                <div className="text-center space-y-1">
                                    <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">{t("bookings.refundAmount")}</div>
                                    <div className="text-3xl font-black text-foreground">{bookingToRefund.totalPrice.toLocaleString()}đ</div>
                                </div>
                            </div>

                            {/* Bank Details Text */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-muted/30 rounded-2xl border border-border">
                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t("bookings.bank")}</div>
                                    <div className="font-bold text-foreground">{bookingToRefund.user?.bankName || "N/A"}</div>
                                </div>
                                <div className="p-4 bg-muted/30 rounded-2xl border border-border">
                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t("bookings.bankAccountName")}</div>
                                    <div className="font-bold text-foreground">{bookingToRefund.user?.bankAccountName || "N/A"}</div>
                                </div>
                                <div className="p-4 bg-muted/30 rounded-2xl border border-border col-span-2">
                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t("bookings.bankAccountNumber")}</div>
                                    <div className="font-bold text-xl text-foreground tracking-wider">{bookingToRefund.user?.bankAccountNumber || "N/A"}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <AlertDialogFooter className="sm:flex-col gap-2">
                        <AlertDialogAction
                            disabled={!bookingToRefund?.user?.bankAccountNumber || refundMutation.isPending}
                            onClick={(e) => {
                                e.preventDefault();
                                if (bookingToRefund) refundMutation.mutate(bookingToRefund.id);
                            }}
                            className="w-full rounded-2xl h-14 bg-emerald-600 text-white hover:bg-emerald-700 font-black uppercase tracking-widest shadow-lg shadow-emerald-600/10 cursor-pointer active:scale-98"
                        >
                            {refundMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t("bookings.confirmRefunded")}
                        </AlertDialogAction>
                        <AlertDialogCancel className="w-full rounded-2xl h-14 font-bold border-none hover:bg-secondary cursor-pointer">
                            {t("bookings.postpone")}
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            <AlertDialog open={!!bookingToConfirm} onOpenChange={() => setBookingToConfirm(null)}>
                <AlertDialogContent className="rounded-[2rem] bg-card text-card-foreground">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase">{t("bookings.confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-muted-foreground">{t("bookings.confirmDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3">
                        <AlertDialogCancel className="rounded-xl h-11 font-bold cursor-pointer">{t("bookings.back")}</AlertDialogCancel>
                        <AlertDialogAction 
                            disabled={confirmMutation.isPending}
                            onClick={(e) => {
                                e.preventDefault();
                                if (bookingToConfirm) confirmMutation.mutate(bookingToConfirm);
                            }} 
                            className="rounded-xl h-11 bg-emerald-600 text-white hover:bg-emerald-700 font-bold min-w-[120px] cursor-pointer active:scale-98"
                        >
                            {confirmMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("bookings.confirmBtn")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
