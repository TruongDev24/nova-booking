"use client";

import React from "react";
import {CheckCircle2, ArrowRight} from "lucide-react";
import Link from "next/link";

export default function PaymentSuccessPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="bg-emerald-50 p-6 rounded-full mb-6">
                <CheckCircle2 className="w-16 h-16 text-emerald-600"/>
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Thanh toán thành công!</h1>
            <p className="text-slate-500 max-w-md mb-8">
                Cảm ơn bạn đã sử dụng dịch vụ của Nova Booking. Đơn đặt sân của bạn đã được xác nhận.
            </p>
            <Link
                href="/user/bookings"
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
                Xem lịch đặt của tôi
                <ArrowRight className="w-4 h-4"/>
            </Link>
        </div>
    );
}
