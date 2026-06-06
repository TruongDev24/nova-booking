"use client";

import React, {useState, useEffect} from "react";
import {Search, MapPin, Star, Clock, ArrowRight, Image as ImageIcon} from "lucide-react";
import {courtService, PaginatedCourts, Court} from "@/services/court.service";
import Link from "next/link";
import { CourtCard } from "@/components/courts/court-card";
import {toast as hotToast, Toaster} from "react-hot-toast";
import {toast} from "sonner";
import {useSocket} from "@/hooks/use-socket";
import {handleComingSoon} from "@/lib/coming-soon";
import {useLanguage} from "@/context/language-context";

export default function ExploreCourtsPage() {
    const [courtsData, setCourtsData] = useState<PaginatedCourts | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchCourts = React.useCallback(async (search = "") => {
        try {
            setIsLoading(true);
            // Lấy 6 sân nổi bật nhất (limit=6)
            const data = await courtService.getAll({page: 1, limit: 6, search});
            setCourtsData(data);
        } catch (error: unknown) {
            console.error("Fetch Courts Error:", error);
            hotToast.error("Không thể tải danh sách sân");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchCourts();
    }, [fetchCourts]);

    // --- REAL-TIME GLOBAL FEED ---
    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;

        socket.on("court_added", (newCourt: Court) => {
            toast.success("Một sân cầu lông mới vừa được thêm!", {
                description: `Sân ${newCourt.name} tại ${newCourt.location} đã sẵn sàng phục vụ.`,
                duration: 10000,
            });

            setCourtsData(prev => {
                if (!prev) return prev;
                if (prev.data.some(c => c.id === newCourt.id)) return prev;
                return {
                    ...prev,
                    data: [newCourt, ...prev.data].slice(0, prev.meta.limit),
                    meta: {...prev.meta, total: prev.meta.total + 1}
                };
            });
        });

        socket.on("court_status_changed", (data: { id: string; isDeleted: boolean; name: string }) => {
            setCourtsData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    data: prev.data.map(court =>
                        court.id === data.id ? {...court, isDeleted: data.isDeleted} : court
                    )
                };
            });

            if (data.isDeleted) {
                toast.error(`Sân ${data.name} tạm ngưng hoạt động`, {
                    description: "Chúng tôi sẽ sớm cập nhật khi sân mở lại.",
                });
            } else {
                toast.success(`Sân ${data.name} đã mở cửa trở lại!`);
            }
        });

        socket.on("court_updated", (updatedCourt: Court) => {
            setCourtsData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    data: prev.data.map(court =>
                        court.id === updatedCourt.id ? updatedCourt : court
                    )
                };
            });
            toast.info(`Thông tin sân ${updatedCourt.name} vừa được cập nhật.`);
        });

        return () => {
            socket.off("court_added");
            socket.off("court_status_changed");
            socket.off("court_updated");
        };
    }, [socket]);

    const {locale, t} = useLanguage();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchCourts(searchTerm);
    };

    const courts = courtsData?.data || [];

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <Toaster position="top-right"/>

            {/* Hero / Search Section */}
            <section
                className="bg-slate-950 dark:bg-slate-950/80 rounded-3xl p-8 sm:p-14 text-white relative overflow-hidden shadow-lg border border-border">
                <div
                    className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary rounded-full blur-[120px] opacity-15 -mr-48 -mt-48"></div>
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">
                        {t("userDashboard.heroTitle1")} <br/>
                        <span className="text-primary">{t("userDashboard.heroTitle2")}</span>
                    </h1>
                    <p className="text-slate-400 mb-8 text-sm sm:text-base leading-relaxed">
                        {t("userDashboard.heroSub", { count: courtsData?.meta.total || "..." })}
                    </p>

                    <form onSubmit={handleSearch}
                          className="flex flex-col sm:flex-row gap-2.5 bg-white/10 dark:bg-white/5 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 dark:border-white/5">
                        <div className="flex-1 flex items-center gap-2.5 px-4 py-2">
                            <Search className="w-4.5 h-4.5 text-primary"/>
                            <input
                                type="text"
                                placeholder={t("userDashboard.searchPlaceholder")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-slate-400 text-sm font-semibold focus:outline-none"
                            />
                        </div>
                        <button type="submit"
                                className="bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.02] px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer">
                            {t("userDashboard.searchBtn")}
                        </button>
                    </form>
                </div>
            </section>

            {/* Courts Grid */}
            <section className="space-y-6">
                <div className="flex items-end justify-between">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-foreground">{t("userDashboard.suggested")}</h2>
                        <p className="text-muted-foreground text-xs font-semibold mt-1">{t("userDashboard.basedOn")}</p>
                    </div>
                    <Link href="/user/courts"
                          className="text-xs font-black uppercase tracking-wider text-primary hover:text-primary/80 flex items-center gap-1.5 bg-primary/10 hover:bg-primary/15 px-4.5 py-2.5 rounded-full transition-all active:scale-95">
                        {t("userDashboard.viewAll")} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"/>
                    </Link>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i}
                                 className="bg-card rounded-3xl overflow-hidden border border-border shadow-sm animate-pulse h-[380px]">
                            </div>
                        ))}
                    </div>
                ) : courts.length === 0 ? (
                    <div
                        className="bg-card rounded-3xl border border-dashed border-border p-16 flex flex-col items-center text-center max-w-xl mx-auto">
                        <ImageIcon className="w-12 h-12 text-muted-foreground/30 mb-4"/>
                        <h3 className="text-lg font-black text-foreground">{t("userDashboard.noCourts")}</h3>
                        <p className="text-muted-foreground text-xs mt-1 font-semibold">{t("userDashboard.noCourtsSub")}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {courts.map((court: Court) => (
                            <CourtCard key={court.id} court={court} />
                        ))}
                    </div>
                )}
            </section>

            {/* Quick Info Section */}
            <section
                className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-muted/30 p-8 rounded-3xl border border-border">
                <div 
                    onClick={() => handleComingSoon()}
                    className="flex items-center gap-4 cursor-pointer hover:bg-card p-3 rounded-2xl transition-all duration-300 group border border-transparent hover:border-border"
                >
                    <div className="bg-primary/10 text-primary p-3 rounded-xl transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Clock className="w-6 h-6"/>
                    </div>
                    <div>
                        <p className="font-black text-foreground text-sm">{t("userDashboard.quickInfo1Title")}</p>
                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">{t("userDashboard.quickInfo1Sub")}</p>
                    </div>
                </div>
                <div 
                    onClick={() => handleComingSoon()}
                    className="flex items-center gap-4 cursor-pointer hover:bg-card p-3 rounded-2xl transition-all duration-300 group border border-transparent hover:border-border"
                >
                    <div className="bg-primary/10 text-primary p-3 rounded-xl transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <MapPin className="w-6 h-6"/>
                    </div>
                    <div>
                        <p className="font-black text-foreground text-sm">{t("userDashboard.quickInfo2Title")}</p>
                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">{t("userDashboard.quickInfo2Sub")}</p>
                    </div>
                </div>
                <div 
                    onClick={() => handleComingSoon()}
                    className="flex items-center gap-4 cursor-pointer hover:bg-card p-3 rounded-2xl transition-all duration-300 group border border-transparent hover:border-border"
                >
                    <div className="bg-primary/10 text-primary p-3 rounded-xl transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Star className="w-6 h-6"/>
                    </div>
                    <div>
                        <p className="font-black text-foreground text-sm">{t("userDashboard.quickInfo3Title")}</p>
                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">{t("userDashboard.quickInfo3Sub")}</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
