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
            // Invalidate React Query cache
            queryClient.invalidateQueries({queryKey: ["admin-bookings"]});
            queryClient.invalidateQueries({queryKey: ["analytics"]});

            // Force Next.js to re-fetch server components
            router.refresh();
        });

        return () => {
            socket.off("new_booking");
        };
    }, [socket, queryClient, router]);

    return null; // This component doesn't render anything visible
}
