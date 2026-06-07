"use client";

import React from "react";
import {XCircle, RefreshCcw} from "lucide-react";
import Link from "next/link";
import {useLanguage} from "@/context/language-context";

export default function PaymentCancelPage() {
    const {t} = useLanguage();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-500">
            <div className="bg-rose-500/10 dark:bg-rose-950/20 p-6 rounded-full mb-6 border border-rose-500/20">
                <XCircle className="w-16 h-16 text-rose-500"/>
            </div>
            <h1 className="text-3xl font-black text-foreground mb-2">{t("paymentOutcome.cancelTitle")}</h1>
            <p className="text-muted-foreground max-w-md mb-8">
                {t("paymentOutcome.cancelDesc")}
            </p>
            <Link
                href="/user/bookings"
                className="flex items-center gap-2 px-8 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-2xl font-bold transition-all border shadow-lg shadow-muted-foreground/5 cursor-pointer"
            >
                <RefreshCcw className="w-4 h-4"/>
                {t("paymentOutcome.retryBtn")}
            </Link>
        </div>
    );
}
