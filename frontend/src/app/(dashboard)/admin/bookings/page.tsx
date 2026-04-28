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
  ArrowRight
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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
  const [bookingToConfirm, setBookingToConfirm] = useState<string | null>(null);

  // --- React Query: Fetch ---
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ["admin-bookings", search, status, startDate, endDate],
    queryFn: () => bookingService.getAllAdmin(1, 100, search, status, startDate, endDate),
  });

  const bookings = bookingsData?.data || [];
  const totalCount = bookingsData?.meta.total || 0;

  // --- React Query: Mutations ---
  const confirmMutation = useMutation({
    mutationFn: (id: string) => bookingService.confirmBookingAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Đã xác nhận đơn hàng!");
    },
    onError: () => toast.error("Lỗi khi xác nhận đơn hàng"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingService.cancelBookingAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Đã hủy đơn thành công");
    },
    onError: () => toast.error("Lỗi khi hủy đơn hàng"),
  });

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
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Thao tác đơn</DropdownMenuLabel>
                {booking.status === "PENDING" && (
                  <DropdownMenuItem onClick={() => setBookingToConfirm(booking.id)}>
                    <Check className="mr-2 h-4 w-4 text-emerald-500" /> Xác nhận đơn
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
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
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic">QUẢN LÝ ĐẶT SÂN</h1>
          <p className="text-muted-foreground font-medium italic">Lọc theo khoảng thời gian • Thống kê hiệu quả.</p>
        </div>
        <div className="bg-card border rounded-2xl px-6 py-4 flex items-center gap-8 shadow-sm">
           <div className="flex flex-col text-right">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Tổng đơn hàng</span>
              <span className="text-3xl font-black leading-none mt-1.5">{totalCount}</span>
           </div>
        </div>
      </div>

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
             <div className="relative">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent pl-3 pr-1 h-10 outline-none font-bold text-[11px] cursor-pointer"
                />
             </div>
             <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
             <div className="relative">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent pl-1 pr-3 h-10 outline-none font-bold text-[11px] cursor-pointer"
                />
             </div>
          </div>

          {(search || status || startDate || endDate) && (
            <Button 
              variant="ghost"
              onClick={() => { setSearch(""); setStatus(""); setStartDate(""); setEndDate(""); }}
              className="text-destructive font-black text-[10px] uppercase tracking-widest hover:bg-destructive/10"
            >
              Đặt lại
            </Button>
          )}
        </div>
      </div>

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

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!bookingToCancel} onOpenChange={() => setBookingToCancel(null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase">Hủy đơn đặt sân?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              Bạn có chắc chắn muốn hủy đơn này? Hành động này sẽ thông báo tới khách hàng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl h-11 font-bold">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => bookingToCancel && cancelMutation.mutate(bookingToCancel)}
              className="rounded-xl h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Xác nhận hủy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bookingToConfirm} onOpenChange={() => setBookingToConfirm(null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase">Xác nhận đơn đặt?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              Xác nhận đơn này đã được khách hàng thanh toán hoặc đảm bảo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl h-11 font-bold">Quay lại</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => bookingToConfirm && confirmMutation.mutate(bookingToConfirm)}
              className="rounded-xl h-11 bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
            >
              Xác nhận ngay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
