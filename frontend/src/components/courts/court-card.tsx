import React from "react";
import { MapPin, Star, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Court } from "@/services/court.service";

interface CourtCardProps {
    court: Court;
}

export function CourtCard({ court }: CourtCardProps) {
    return (
        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
            {/* Image Cover */}
            <div className="relative h-64 overflow-hidden">
                {court.images?.[0] ? (
                    <Image
                        src={court.images[0]}
                        alt={court.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200">
                        <ImageIcon className="w-12 h-12" />
                    </div>
                )}
                <div className="absolute top-5 left-5 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-black text-slate-900">
                        {court.avgRating ? court.avgRating.toFixed(1) : "Chưa có"}
                    </span>
                    {(court.reviewCount ?? court.totalReviews ?? 0) > 0 && (
                        <span className="text-[10px] text-slate-400 font-bold ml-1">
                            ({court.reviewCount ?? court.totalReviews})
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-cyan-600 transition-colors">
                        {court.name}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <MapPin className="w-4 h-4 text-cyan-500" />
                        <span className="text-sm line-clamp-1">{court.location}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Giá mỗi giờ</span>
                        <span className="text-2xl font-black text-slate-900">
                            {court.pricePerHour.toLocaleString()}đ
                        </span>
                    </div>
                    <Link
                        href={`/user/courts/${court.id}`}
                        className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-sm font-black hover:bg-cyan-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                    >
                        Đặt sân ngay
                    </Link>
                </div>
            </div>
        </div>
    );
}
