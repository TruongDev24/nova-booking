"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  CalendarDays,
  LogOut,
  Activity,
  UserCircle,
} from "lucide-react";
import Cookies from "js-cookie";

const menuItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Quản lý Sân", href: "/admin/courts", icon: Map },
  { name: "Đơn đặt sân", href: "/admin/bookings", icon: CalendarDays },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    Cookies.remove("access_token");
    router.push("/login");
  };

  const getPageTitle = () => {
    const item = menuItems.find((m) => m.href === pathname);
    return item ? item.name : "Admin Panel";
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <Activity className="w-8 h-8 text-cyan-400" />
          <h1 className="text-xl font-bold tracking-tight">
            NOVA<span className="text-cyan-400"> Admin</span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-900/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${
                    isActive ? "text-white" : "text-slate-500 group-hover:text-cyan-400"
                  }`}
                />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm relative z-10">
          <h2 className="text-lg font-bold text-slate-800">{getPageTitle()}</h2>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900">Chủ sân</p>
              <p className="text-xs text-slate-500">Manager Account</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
              <UserCircle className="w-6 h-6" />
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
