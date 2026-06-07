"use client";

import React, { useState, useEffect } from "react";
import { Search, ArrowLeft, ArrowRight, Image as ImageIcon } from "lucide-react";
import { courtService, PaginatedCourts, Court } from "@/services/court.service";
import Link from "next/link";
import { CourtCard } from "@/components/courts/court-card";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";

export default function AllCourtsPage() {
    const { t } = useLanguage();
    const [courtsData, setCourtsData] = useState<PaginatedCourts | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);

    const fetchCourts = React.useCallback(async (p = 1, search = "") => {
        try {
            setIsLoading(true);
            const data = await courtService.getAll({ page: p, limit: 12, search });
            setCourtsData(data);
        } catch (error: unknown) {
            console.error("Fetch All Courts Error:", error);
            toast.error(t("userCourts.toastError"));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchCourts(page, searchTerm);
    }, [page, searchTerm, fetchCourts]);

    // Real-time refresh
    useEffect(() => {
        const handleRefresh = () => {
            void fetchCourts(page, searchTerm);
        };
        window.addEventListener("refresh_data", handleRefresh);
        return () => window.removeEventListener("refresh_data", handleRefresh);
    }, [fetchCourts, page, searchTerm]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        void fetchCourts(1, searchTerm);
    };

    const courts = courtsData?.data || [];
    const meta = courtsData?.meta;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link
                        href="/user"
                        className="text-xs font-black uppercase text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 mb-2 group"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        {t("userCourts.backHome")}
                    </Link>
                    <h1 className="text-4xl font-black text-foreground tracking-tight uppercase italic">{t("userCourts.title")}</h1>
                    <p className="text-muted-foreground font-medium mt-1">{t("userCourts.subtitle")}</p>
                </div>

                <div className="bg-card border border-border rounded-3xl px-8 py-5 flex items-center gap-8 shadow-sm">
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                            {t("userCourts.totalCourts")}
                        </span>
                        <span className="text-3xl font-black leading-none mt-1.5 text-primary">
                            {meta?.total || 0}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter / Search Bar */}
            <div className="bg-card border border-border p-3 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-center gap-3">
                <form onSubmit={handleSearch} className="flex-1 w-full relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                    <input
                        type="text"
                        placeholder={t("userCourts.searchPlaceholder")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 h-14 rounded-[1.8rem] bg-muted/30 border border-border text-foreground focus:border-primary focus:bg-background font-bold text-sm transition-all outline-none"
                    />
                </form>
                <div className="flex items-center gap-2 px-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter mr-2">
                        {t("userCourts.pageIndicator").replace("{page}", page.toString()).replace("{total}", (meta?.lastPage || 1).toString())}
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1 || isLoading}
                            onClick={() => setPage(p => p - 1)}
                            className="rounded-xl h-10 w-10 p-0 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= (meta?.lastPage || 1) || isLoading}
                            onClick={() => setPage(p => p + 1)}
                            className="rounded-xl h-10 w-10 p-0 cursor-pointer"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-card rounded-[2.5rem] border border-border shadow-sm animate-pulse h-[400px]"></div>
                    ))}
                </div>
            ) : courts.length === 0 ? (
                <div className="bg-card rounded-[3rem] border border-dashed border-border p-24 flex flex-col items-center text-center">
                    <div className="bg-muted p-8 rounded-full mb-6">
                        <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-2xl font-black text-foreground uppercase">{t("userCourts.noCourts")}</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm font-medium">{t("userCourts.noCourtsDesc")}</p>
                    <Button
                        variant="link"
                        onClick={() => { setSearchTerm(""); setPage(1); }}
                        className="mt-6 text-primary font-black uppercase tracking-widest"
                    >
                        {t("userCourts.viewAllBtn")}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {courts.map((court: Court) => (
                        <CourtCard key={court.id} court={court} />
                    ))}
                </div>
            )}

            {/* Pagination Bottom */}
            {meta && meta.lastPage > 1 && (
                <div className="flex justify-center pt-8">
                    <div className="flex items-center gap-2 bg-card border border-border p-2 rounded-2xl shadow-sm">
                        {[...Array(meta.lastPage)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setPage(i + 1)}
                                className={`h-10 w-10 rounded-xl font-black transition-all cursor-pointer ${page === i + 1
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "text-muted-foreground hover:bg-muted"
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
