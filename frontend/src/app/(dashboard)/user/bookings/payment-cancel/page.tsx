"use client";

import React from "react";
import { XCircle, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-rose-50 p-6 rounded-full mb-6">
        <XCircle className="w-16 h-16 text-rose-600" />
      </div>
      <h1 className="text-3xl font-black text-slate-900 mb-2">Thanh toán đã bị hủy</h1>
      <p className="text-slate-500 max-w-md mb-8">
        Quá trình thanh toán đã bị dừng lại. Nếu đây là nhầm lẫn, bạn có thể thử lại từ trang quản lý lịch đặt.
      </p>
      <Link 
        href="/user/bookings"
        className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
      >
        <RefreshCcw className="w-4 h-4" />
        Quay lại thử lại
      </Link>
    </div>
  );
}
