"use client";

import {useEffect} from "react";
import {useSocket} from "@/hooks/use-socket";
import {toast} from "sonner";
import {useRouter} from "next/navigation";
import {useQueryClient} from "@tanstack/react-query";

/**
 * AdminSocketListener (Real-time Fulfillment Alerts)
 * Listens for 'new_booking' events from the server and triggers UI updates.
 */
export function AdminSocketListener() {
    const socket = useSocket();
    const router = useRouter();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!socket) return;

        // Listen for real-time booking fulfillment
        socket.on("new_booking", (data: {
            orderCode: number;
            courtName: string;
            customerName: string;
            totalPrice: number;
            bookingDate: string;
            slots: string[];
        }) => {
            // 1. Beautiful Toast Notification
            toast.success(`🎉 Ting ting! Đơn mới từ ${data.customerName}`, {
                description: `Đặt sân ${data.courtName} - ${data.totalPrice.toLocaleString()}đ`,
                duration: 10000,
                action: {
                    label: "Xem ngay",
                    onClick: () => router.push("/admin/bookings"),
                },
            });

            // 2. Refresh Data
            queryClient.invalidateQueries({queryKey: ["admin-bookings"]});
            queryClient.invalidateQueries({queryKey: ["admin-analytics"]});
            window.dispatchEvent(new CustomEvent("refresh_data"));
            router.refresh();
        });

        // Listen for manual cancellations from users
        socket.on("booking_canceled", (data: {
            id: string;
            courtName: string;
            bookingDate: string;
            startTime: string;
            reason: string;
            canceledBy?: string;
        }) => {
            toast.error(`⚠️ Khách hàng vừa hủy lịch!`, {
                description: `Sân ${data.courtName} - ${data.bookingDate} (${data.startTime}). Lý do: ${data.reason}`,
                duration: 10000,
                action: {
                    label: "Xem",
                    onClick: () => router.push("/admin/bookings"),
                },
            });
            queryClient.invalidateQueries({queryKey: ["admin-bookings"]});
            queryClient.invalidateQueries({queryKey: ["admin-analytics"]});
            window.dispatchEvent(new CustomEvent("refresh_data"));
            router.refresh();
        });

        // Listen for booking initiated (pending)
        socket.on("booking_initiated", (data: {
            orderCode: number;
            courtName: string;
            totalPrice: number;
            bookingDate: string;
            slots: string[];
        }) => {
            toast.info(`⏳ Khách hàng đang thanh toán đơn mới`, {
                description: `Sân ${data.courtName} - ${data.totalPrice.toLocaleString()}đ.`,
                duration: 5000,
            });
            queryClient.invalidateQueries({queryKey: ["admin-bookings"]});
            window.dispatchEvent(new CustomEvent("refresh_data"));
            router.refresh();
        });

        return () => {
            socket.off("new_booking");
            socket.off("booking_canceled");
            socket.off("booking_initiated");
        };
    }, [socket, queryClient, router]);

    return null; // This component doesn't render anything visible
}
