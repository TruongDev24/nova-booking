"use client";

import React from "react";
import {usePathname} from "next/navigation";
import {DashboardLayout} from "@/components/layouts/dashboard-layout";
import {LayoutDashboard, Map, CalendarDays, Search, CalendarClock, UserCircle} from "lucide-react";
import {useLanguage} from "@/context/language-context";

const adminMenuItems = [
    {name: "Dashboard", href: "/admin", icon: LayoutDashboard},
    {name: "Quản lý Sân", href: "/admin/courts", icon: Map},
    {name: "Đơn đặt sân", href: "/admin/bookings", icon: CalendarDays},
    {name: "Hồ sơ cá nhân", href: "/admin/profile", icon: UserCircle},
];

const userMenuItems = [
    {name: "Tìm sân", href: "/user", icon: Search},
    {name: "Lịch sử đặt", href: "/user/bookings", icon: CalendarClock},
    {name: "Hồ sơ cá nhân", href: "/user/profile", icon: UserCircle},
];

export default function RootDashboardLayout({
                                                children,
                                            }: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith("/admin");
    const {t} = useLanguage();

    return (
        <DashboardLayout
            menuItems={isAdmin ? adminMenuItems : userMenuItems}
            roleLabel={isAdmin ? t("sidebar.roleAdminLabel") : t("sidebar.roleUserLabel")}
            roleDetail={isAdmin ? t("sidebar.roleAdminDetail") : t("sidebar.roleUserDetail")}
        >
            {children}
        </DashboardLayout>
    );
}
