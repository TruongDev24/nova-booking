"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { LayoutDashboard, Map, CalendarDays, Search, CalendarClock } from "lucide-react";

const adminMenuItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Quản lý Sân", href: "/admin/courts", icon: Map },
  { name: "Đơn đặt sân", href: "/admin/bookings", icon: CalendarDays },
];

const userMenuItems = [
  { name: "Tìm sân", href: "/user", icon: Search },
  { name: "Lịch sử đặt", href: "/user/bookings", icon: CalendarClock },
];

export default function RootDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <DashboardLayout
      menuItems={isAdmin ? adminMenuItems : userMenuItems}
      roleLabel={isAdmin ? "Chủ sân" : "Khách hàng"}
      roleDetail={isAdmin ? "Manager" : "Customer"}
    >
      {children}
    </DashboardLayout>
  );
}
