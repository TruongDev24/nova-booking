"use client";

import React from "react";
import {CheckCircle2, ArrowRight} from "lucide-react";
import Link from "next/link";
import {useLanguage} from "@/context/language-context";

export default function PaymentSuccessPage() {
    const {t} = useLanguage();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-500">
            <div className="bg-emerald-500/10 dark:bg-emerald-950/20 p-6 rounded-full mb-6 border border-emerald-500/20">
                <CheckCircle2 className="w-16 h-16 text-emerald-500"/>
            </div>
            <h1 className="text-3xl font-black text-foreground mb-2">{t("paymentOutcome.successTitle")}</h1>
            <p className="text-muted-foreground max-w-md mb-8">
                {t("paymentOutcome.successDesc")}
            </p>
            <Link
                href="/user/bookings"
                className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/95 transition-all shadow-lg shadow-primary/10 cursor-pointer"
            >
                {t("paymentOutcome.viewMyBookings")}
                <ArrowRight className="w-4 h-4"/>
            </Link>
        </div>
    );
}
