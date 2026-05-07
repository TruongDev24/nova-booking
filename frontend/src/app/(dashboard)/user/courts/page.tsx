"use client";

import React, { useState, useEffect } from "react";
import { Search, ArrowLeft, ArrowRight, Image as ImageIcon } from "lucide-react";
import { courtService, PaginatedCourts, Court } from "@/services/court.service";
import Link from "next/link";
import { CourtCard } from "@/components/ui/court-card";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";

export default function AllCourtsPage() {
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
            toast.error("Không thể tải danh sách sân");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchCourts(page, searchTerm);
    }, [page, searchTerm, fetchCourts]);

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
                        className="text-xs font-black uppercase text-slate-400 hover:text-cyan-600 transition-colors flex items-center gap-2 mb-2 group"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        Quay lại trang chủ
                    </Link>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic">Tất Cả Sân</h1>
                    <p className="text-slate-500 font-medium mt-1">Khám phá và đặt sân tại tất cả các địa điểm của chúng tôi.</p>
                </div>

                <div className="bg-card border rounded-3xl px-8 py-5 flex items-center gap-8 shadow-sm">
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                            Tổng số sân
                        </span>
                        <span className="text-3xl font-black leading-none mt-1.5 text-cyan-600">
                            {meta?.total || 0}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter / Search Bar */}
            <div className="bg-white border p-3 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-center gap-3">
                <form onSubmit={handleSearch} className="flex-1 w-full relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên sân hoặc địa chỉ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 h-14 rounded-[1.8rem] bg-slate-50 border-transparent focus:border-cyan-500 focus:bg-white font-bold text-sm transition-all outline-none"
                    />
                </form>
                <div className="flex items-center gap-2 px-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter mr-2">Trang {page} / {meta?.lastPage || 1}</span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1 || isLoading}
                            onClick={() => setPage(p => p - 1)}
                            className="rounded-xl h-10 w-10 p-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= (meta?.lastPage || 1) || isLoading}
                            onClick={() => setPage(p => p + 1)}
                            className="rounded-xl h-10 w-10 p-0"
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
                        <div key={i} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm animate-pulse h-[400px]"></div>
                    ))}
                </div>
            ) : courts.length === 0 ? (
                <div className="bg-white rounded-[3rem] border border-dashed border-slate-200 p-24 flex flex-col items-center text-center">
                    <div className="bg-slate-50 p-8 rounded-full mb-6">
                        <ImageIcon className="w-16 h-16 text-slate-200" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase">Hiện chưa có sân nào</h3>
                    <p className="text-slate-500 mt-2 max-w-sm font-medium">Chúng tôi đang liên tục cập nhật thêm các địa điểm mới. Vui lòng quay lại sau!</p>
                    <Button
                        variant="link"
                        onClick={() => { setSearchTerm(""); setPage(1); }}
                        className="mt-6 text-cyan-600 font-black uppercase tracking-widest"
                    >
                        Xem tất cả sân hiện có
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
                    <div className="flex items-center gap-2 bg-white border p-2 rounded-2xl shadow-sm">
                        {[...Array(meta.lastPage)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setPage(i + 1)}
                                className={`h-10 w-10 rounded-xl font-black transition-all ${page === i + 1
                                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-100"
                                    : "text-slate-400 hover:bg-slate-50"
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
