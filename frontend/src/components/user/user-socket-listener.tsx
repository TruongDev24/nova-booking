"use client";

import {useEffect} from "react";
import {useSocket} from "@/hooks/use-socket";
import {toast} from "sonner";
import {useRouter} from "next/navigation";
import {useQueryClient} from "@tanstack/react-query";

/**
 * UserSocketListener (Private Alerts)
 * Listens for events specifically targeted at the logged-in user.
 */
export function UserSocketListener() {
    const socket = useSocket();
    const router = useRouter();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!socket) return;

        // Listen for manual cancellations from Admin/System
        socket.on("booking_canceled", (data: {
            id: string;
            courtName: string;
            bookingDate: string;
            startTime: string;
            reason: string;
        }) => {
            toast.error("🚨 Thông báo hủy lịch đặt sân", {
                description: `Đơn tại ${data.courtName} (${data.bookingDate}) đã bị hủy. Lý do: ${data.reason}`,
                duration: 15000, // Show longer as this is critical info
                action: {
                    label: "Xem chi tiết",
                    onClick: () => router.push("/user/bookings"),
                },
            });

            // 1. Refresh React Query (if used in bookings page)
            queryClient.invalidateQueries({queryKey: ["user-bookings"]});

            // 2. Refresh Server Components
            router.refresh();
        });

        return () => {
            socket.off("booking_canceled");
        };
    }, [socket, queryClient, router]);

    return null;
}
