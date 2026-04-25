"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  CalendarClock,
  UserCircle,
  LogOut,
  Activity,
  Menu,
  X,
} from "lucide-react";
import Cookies from "js-cookie";

const navLinks = [
  { name: "Tìm sân", href: "/user", icon: Search },
  { name: "Lịch sử đặt", href: "/user/bookings", icon: CalendarClock },
];

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    Cookies.remove("access_token");
    sessionStorage.clear();
    localStorage.removeItem("access_token"); // Clean up any old persistent tokens
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sticky Top Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: Brand */}
            <div className="flex items-center">
              <Link href="/user" className="flex items-center gap-2 group">
                <div className="bg-slate-900 p-1.5 rounded-lg group-hover:bg-cyan-500 transition-colors">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900 tracking-tight">
                  NOVA<span className="text-cyan-600">booking</span>
                </span>
              </Link>
            </div>

            {/* Center: Desktop Nav */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-cyan-50 text-cyan-600"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Right: User Menu */}
            <div className="hidden md:flex items-center gap-4 border-l border-slate-100 ml-4 pl-4">
              <Link
                href="/user/profile"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                  pathname === "/user/profile"
                    ? "border-cyan-200 bg-cyan-50 text-cyan-600"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span className="text-sm font-bold">Trang cá nhân</span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-2 animate-in slide-in-from-top duration-200">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold ${
                  pathname === link.href
                    ? "bg-cyan-50 text-cyan-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/user/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-slate-600 hover:bg-slate-50"
              >
                <UserCircle className="w-5 h-5" />
                Hồ sơ của tôi
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-red-500 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer (Optional) */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm">
            © 2026 NOVA Booking. Kiến tạo trải nghiệm thể thao hiện đại.
          </p>
        </div>
      </footer>
    </div>
  );
}
