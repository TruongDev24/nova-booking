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
    Loader2
} from "lucide-react";
import { bookingService, Booking } from "@/services/booking.service";
import { toast } from "sonner";
import { formatToVietnamDate } from "@/utils/date-format";
import { ColumnDef } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
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
    const [view, setView] = useState<"all" | "refunds">("all");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
    const [bookingToConfirm, setBookingToConfirm] = useState<string | null>(null);
    const [bookingToRefund, setBookingToRefund] = useState<Booking | null>(null);

    // --- React Query: Fetch ---
    const { data: bookingsData, isLoading } = useQuery({
        queryKey: ["admin-bookings", search, status, startDate, endDate, view],
        queryFn: () => bookingService.getAllAdmin({
            page: 1,
            limit: 50, // Increase limit for admin
            search,
            status: view === "refunds" ? "CANCELLED" : status,
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
            toast.success("Đã xác nhận đơn hàng!");
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || "Lỗi khi xác nhận đơn hàng";
            toast.error(message);
        }
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => bookingService.cancelBookingAdmin(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
            setBookingToCancel(null);
            toast.success("Đã hủy đơn thành công");
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || "Lỗi khi hủy đơn hàng";
            toast.error(message);
        }
    });

    const refundMutation = useMutation({
        mutationFn: (id: string) => bookingService.markAsRefundedAdmin(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
            setBookingToRefund(null);
            toast.success("Hoàn tiền thành công!");
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || "Lỗi khi cập nhật trạng thái hoàn tiền";
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
            header: "Mã đơn",
            cell: ({ row }) => (
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    #{row.original.id.slice(-6)}
                </span>
            ),
        },
        {
            id: "customer",
            header: "Khách hàng",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold tracking-tight">{row.original.user?.fullName}</span>
                    <span className="text-[11px] text-muted-foreground font-medium">{row.original.user?.phone}</span>
                </div>
            ),
        },
        {
            id: "court",
            header: "Sân vận động",
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
            header: "Lịch hẹn",
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
            header: () => <div className="text-right">Thanh toán</div>,
            cell: ({ row }) => (
                <div className="text-right font-black text-lg">
                    {row.original.totalPrice.toLocaleString()}đ
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: () => <div className="text-center">Trạng thái</div>,
            cell: ({ row }) => {
                const status = row.original.status;
                const refund = row.original.refundStatus;
                
                if (status === "CANCELLED" && refund === "PENDING") {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 font-black text-[10px] uppercase animate-pulse">
                                <Wallet className="mr-1.5 h-3 w-3" /> Chờ hoàn tiền
                            </Badge>
                        </div>
                    );
                }
                
                if (refund === "COMPLETED") {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 font-black text-[10px] uppercase">
                                <CheckCircle2 className="mr-1.5 h-3 w-3" /> Đã hoàn tiền
                            </Badge>
                        </div>
                    );
                }

                if (status === "CONFIRMED") {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-black text-[10px] uppercase">
                                <CheckCircle2 className="mr-1.5 h-3 w-3" /> Thành công
                            </Badge>
                        </div>
                    );
                }
                
                if (status === "CANCELLED") {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-black text-[10px] uppercase">
                                <XCircle className="mr-1.5 h-3 w-3" /> Đã hủy
                            </Badge>
                        </div>
                    );
                }
                
                return (
                    <div className="flex justify-center">
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-black text-[10px] uppercase">
                            <Clock className="mr-1.5 h-3 w-3" /> Chờ xử lý
                        </Badge>
                    </div>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const booking = row.original;
                return (
                    <div className="flex items-center gap-2">
                        {booking.status === "CANCELLED" && booking.refundStatus === "PENDING" && (
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 rounded-lg bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 font-bold text-xs"
                                onClick={() => setBookingToRefund(booking)}
                            >
                                <QrCode className="mr-2 h-3 w-3" /> Hoàn tiền
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Thao tác đơn</DropdownMenuLabel>
                                {booking.status === "PENDING" && (
                                    <DropdownMenuItem onClick={() => setBookingToConfirm(booking.id)}>
                                        <Check className="mr-2 h-4 w-4 text-emerald-500" /> Xác nhận đơn
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setBookingToCancel(booking.id)}
                                    className="text-destructive focus:text-destructive"
                                    disabled={booking.status === "CANCELLED"}
                                >
                                    <XCircle className="mr-2 h-4 w-4" /> Hủy đơn đặt
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight uppercase italic">QUẢN LÝ ĐẶT SÂN</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <button 
                            onClick={() => setView("all")}
                            className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${view === "all" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            Tất cả đơn
                        </button>
                        <button 
                            onClick={() => setView("refunds")}
                            className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all flex items-center gap-2 ${view === "refunds" ? "bg-rose-600 text-white shadow-lg shadow-rose-100" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            <Wallet className="w-4 h-4" /> Chờ hoàn tiền
                        </button>
                    </div>
                </div>
                <div className="bg-card border rounded-2xl px-6 py-4 flex items-center gap-8 shadow-sm">
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                            {view === "all" ? "Tổng đơn hàng" : "Cần hoàn tiền"}
                        </span>
                        <span className={`text-3xl font-black leading-none mt-1.5 ${view === "refunds" ? "text-rose-600" : ""}`}>{bookings.length}</span>
                    </div>
                </div>
            </div>

            {view === "all" && (
                <div className="bg-card border p-4 rounded-[2rem] shadow-sm flex flex-col lg:flex-row items-center gap-4">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm theo khách hàng hoặc tên sân..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-12 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background font-bold text-sm"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="h-12 px-4 bg-muted/30 border border-transparent rounded-xl outline-none focus:border-primary font-bold text-xs cursor-pointer"
                        >
                            <option value="">Trạng thái</option>
                            <option value="PENDING">Chờ xử lý</option>
                            <option value="CONFIRMED">Thành công</option>
                            <option value="CANCELLED">Đã hủy</option>
                        </select>
                        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-transparent focus-within:border-primary">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent pl-3 pr-1 h-10 outline-none font-bold text-[11px] cursor-pointer" />
                            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent pl-1 pr-3 h-10 outline-none font-bold text-[11px] cursor-pointer" />
                        </div>
                        {(search || status || startDate || endDate) && (
                            <Button variant="ghost" onClick={() => { setSearch(""); setStatus(""); setStartDate(""); setEndDate(""); }} className="text-destructive font-black text-[10px] uppercase tracking-widest hover:bg-destructive/10">Đặt lại</Button>
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
                <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm">
                    <DataTable columns={columns} data={bookings} />
                </div>
            )}

            {/* Refund Dialog */}
            <AlertDialog open={!!bookingToRefund} onOpenChange={() => setBookingToRefund(null)}>
                <AlertDialogContent className="rounded-[2.5rem] max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black uppercase italic flex items-center gap-2">
                            <Wallet className="w-6 h-6 text-rose-600" /> Hoàn tiền thủ công
                        </AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-slate-600">
                            Quét mã VietQR bên dưới để chuyển khoản hoàn tiền cho khách hàng.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {bookingToRefund && (
                        <div className="space-y-6 py-4">
                            {/* VietQR Display */}
                            <div className="flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                {bookingToRefund.user?.bankAccountNumber ? (
                                    <div className="relative w-64 h-64 bg-white p-2 rounded-2xl shadow-sm overflow-hidden">
                                        <img 
                                            src={getVietQRUrl(bookingToRefund)} 
                                            alt="VietQR"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-64 h-64 flex flex-col items-center justify-center text-center gap-2 text-rose-500 font-bold px-4">
                                        <XCircle className="w-12 h-12" />
                                        Khách hàng chưa cập nhật thông tin ngân hàng!
                                    </div>
                                )}
                                
                                <div className="text-center space-y-1">
                                    <div className="text-xs font-black uppercase text-slate-400 tracking-widest">Số tiền hoàn</div>
                                    <div className="text-3xl font-black text-slate-900">{bookingToRefund.totalPrice.toLocaleString()}đ</div>
                                </div>
                            </div>

                            {/* Bank Details Text */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngân hàng</div>
                                    <div className="font-bold text-slate-900">{bookingToRefund.user?.bankName || "N/A"}</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chủ tài khoản</div>
                                    <div className="font-bold text-slate-900">{bookingToRefund.user?.bankAccountName || "N/A"}</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl col-span-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số tài khoản</div>
                                    <div className="font-bold text-xl text-slate-900 tracking-wider">{bookingToRefund.user?.bankAccountNumber || "N/A"}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <AlertDialogFooter className="sm:flex-col gap-2">
                        <AlertDialogAction
                            disabled={!bookingToRefund?.user?.bankAccountNumber || refundMutation.isLoading}
                            onClick={(e) => {
                                e.preventDefault();
                                if (bookingToRefund) refundMutation.mutate(bookingToRefund.id);
                            }}
                            className="w-full rounded-2xl h-14 bg-emerald-600 text-white hover:bg-emerald-700 font-black uppercase tracking-widest shadow-lg shadow-emerald-100"
                        >
                            {refundMutation.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Xác nhận đã chuyển khoản"}
                        </AlertDialogAction>
                        <AlertDialogCancel className="w-full rounded-2xl h-14 font-bold border-none hover:bg-slate-100">
                            Để sau
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Standard Confirm/Cancel Dialogs */}
            <AlertDialog open={!!bookingToCancel} onOpenChange={() => setBookingToCancel(null)}>
                <AlertDialogContent className="rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase">Hủy đơn đặt sân?</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium">Bạn có chắc chắn muốn hủy đơn này?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3">
                        <AlertDialogCancel className="rounded-xl h-11 font-bold">Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction 
                            disabled={cancelMutation.isLoading}
                            onClick={(e) => {
                                e.preventDefault();
                                if (bookingToCancel) cancelMutation.mutate(bookingToCancel);
                            }} 
                            className="rounded-xl h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold min-w-[120px]"
                        >
                            {cancelMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận hủy"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!bookingToConfirm} onOpenChange={() => setBookingToConfirm(null)}>
                <AlertDialogContent className="rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase">Xác nhận đơn đặt?</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium">Xác nhận đơn này đã được thanh toán.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3">
                        <AlertDialogCancel className="rounded-xl h-11 font-bold">Quay lại</AlertDialogCancel>
                        <AlertDialogAction 
                            disabled={confirmMutation.isLoading}
                            onClick={(e) => {
                                e.preventDefault();
                                if (bookingToConfirm) confirmMutation.mutate(bookingToConfirm);
                            }} 
                            className="rounded-xl h-11 bg-emerald-600 text-white hover:bg-emerald-700 font-bold min-w-[120px]"
                        >
                            {confirmMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận ngay"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
