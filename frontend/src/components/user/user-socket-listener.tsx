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

        socket.on("booking_canceled", (data: {
            id: string;
            courtName: string;
            bookingDate: string;
            startTime: string;
            reason: string;
        }) => {
            toast.error("🚨 Thông báo hủy lịch đặt sân", {
                description: `Đơn tại ${data.courtName} (${data.bookingDate}) đã bị hủy. Lý do: ${data.reason}`,
                duration: 15000,
                action: {
                    label: "Xem chi tiết",
                    onClick: () => router.push("/user/bookings"),
                },
            });
            queryClient.invalidateQueries({queryKey: ["user-bookings"]});
            window.dispatchEvent(new CustomEvent("refresh_data"));
            router.refresh();
        });

        socket.on("court_added", (newCourt: { name: string; location: string }) => {
            toast.success("Một sân cầu lông mới vừa được thêm!", {
                description: `Sân ${newCourt.name} tại ${newCourt.location} đã sẵn sàng phục vụ.`,
                duration: 10000,
            });
            window.dispatchEvent(new CustomEvent("refresh_data"));
        });

        socket.on("court_status_changed", (data: { isDeleted: boolean; name: string }) => {
            if (data.isDeleted) {
                toast.error(`Sân ${data.name} tạm ngưng hoạt động`, {
                    description: "Chúng tôi sẽ sớm cập nhật khi sân mở lại.",
                });
            } else {
                toast.success(`Sân ${data.name} đã mở cửa trở lại!`);
            }
            window.dispatchEvent(new CustomEvent("refresh_data"));
        });

        socket.on("court_updated", (updatedCourt: { name: string }) => {
            toast.info(`Thông tin sân ${updatedCourt.name} vừa được cập nhật.`);
            window.dispatchEvent(new CustomEvent("refresh_data"));
        });

        return () => {
            socket.off("booking_canceled");
            socket.off("court_added");
            socket.off("court_status_changed");
            socket.off("court_updated");
        };
    }, [socket, queryClient, router]);

    return null;
}
