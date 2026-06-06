import React from "react";
import { MapPin, Star, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Court } from "@/services/court.service";
import { useLanguage } from "@/context/language-context";

interface CourtCardProps {
    court: Court;
}

export function CourtCard({ court }: CourtCardProps) {
    const { t } = useLanguage();

    return (
        <div className="bg-card rounded-3xl overflow-hidden border border-border shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 group">
            {/* Image Cover */}
            <div className="relative h-60 overflow-hidden bg-muted">
                {court.images?.[0] ? (
                    <Image
                        src={court.images[0]}
                        alt={court.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                        <ImageIcon className="w-12 h-12" />
                    </div>
                )}
                <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-border z-10">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-black text-foreground">
                        {court.avgRating ? court.avgRating.toFixed(1) : "N/A"}
                    </span>
                    {(court.reviewCount ?? court.totalReviews ?? 0) > 0 && (
                        <span className="text-[10px] text-muted-foreground font-bold ml-0.5">
                            ({court.reviewCount ?? court.totalReviews})
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {court.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-xs line-clamp-1">{court.location}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-border">
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest leading-none">
                            {t("adminDashboard.tableRevenue")} /h
                        </span>
                        <span className="text-xl font-black text-foreground mt-1">
                            {court.pricePerHour.toLocaleString()}đ
                        </span>
                    </div>
                    <Link
                        href={`/user/courts/${court.id}`}
                        className="bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md shadow-primary/10 active:scale-95 text-center"
                    >
                        {t("userDashboard.bookNow")}
                    </Link>
                </div>
            </div>
        </div>
    );
}

