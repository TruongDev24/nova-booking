"use client";

import React, { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight, MessageSquare, Calendar } from "lucide-react";
import { reviewService, Review } from "@/services/review.service";
import { toast } from "sonner";
import Image from "next/image";

interface CourtReviewsProps {
    courtId: string;
    courtAvgRating?: number;
    courtReviewCount?: number;
}

export function CourtReviews({ courtId, courtAvgRating = 0, courtReviewCount = 0 }: CourtReviewsProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalReviews, setTotalReviews] = useState(courtReviewCount);

    const limit = 5;

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                setLoading(true);
                const res = await reviewService.getCourtReviews(courtId, page, limit);
                setReviews(res.data);
                setTotalPages(res.meta.lastPage || 1);
                setTotalReviews(res.meta.total || 0);
            } catch (error) {
                console.error("Error fetching reviews:", error);
                toast.error("Không thể tải đánh giá của sân");
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [courtId, page]);

    const handlePrevPage = () => {
        if (page > 1) setPage(page - 1);
    };

    const handleNextPage = () => {
        if (page < totalPages) setPage(page + 1);
    };

    const formatReviewDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString("vi-VN", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        } catch {
            return dateStr;
        }
    };

    const getInitials = (name: string) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`w-4 h-4 ${
                            star <= rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-200"
                        }`}
                    />
                ))}
            </div>
        );
    };

    if (loading && reviews.length === 0) {
        return <ReviewsSkeleton />;
    }

    return (
        <section className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 pb-6 gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <MessageSquare className="w-7 h-7 text-blue-600" />
                        Đánh giá từ khách hàng
                    </h2>
                    <p className="text-slate-500 font-medium text-sm">
                        Những nhận xét chân thực từ người chơi đã trải nghiệm sân.
                    </p>
                </div>

                {/* Rating Summary Widget */}
                {totalReviews > 0 && (
                    <div className="flex items-center gap-4 bg-slate-50/50 border border-slate-100 rounded-3xl p-4 pr-6">
                        <div className="text-center">
                            <span className="text-3xl font-black text-slate-900 block leading-none">
                                {(courtAvgRating || 0).toFixed(1)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                trên 5
                            </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div>
                            {renderStars(Math.round(courtAvgRating))}
                            <span className="text-xs text-slate-500 font-bold block mt-1">
                                {totalReviews} lượt đánh giá
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {reviews.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                    <Star className="w-12 h-12 text-slate-300 mx-auto mb-4 stroke-1" />
                    <h3 className="text-lg font-bold text-slate-800">Chưa có đánh giá nào</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                        Sân bóng này chưa nhận được lượt đánh giá nào từ người chơi. Hãy đặt sân và là người đầu tiên để lại đánh giá nhé!
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Reviews List */}
                    <div className="divide-y divide-slate-100">
                        {reviews.map((review) => (
                            <div key={review.id} className="py-6 first:pt-0 last:pb-0 flex gap-4 items-start">
                                {/* Avatar */}
                                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-blue-50 border border-blue-100 flex-shrink-0 flex items-center justify-center">
                                    {review.user.avatar ? (
                                        <Image
                                            src={review.user.avatar}
                                            alt={review.user.fullName}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <span className="text-sm font-black text-blue-600">
                                            {getInitials(review.user.fullName)}
                                        </span>
                                    )}
                                </div>

                                {/* Review Content */}
                                <div className="space-y-2 flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <h4 className="font-bold text-slate-900 text-base">
                                            {review.user.fullName}
                                        </h4>
                                        <span className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatReviewDate(review.createdAt)}
                                        </span>
                                    </div>
                                    
                                    {renderStars(review.rating)}

                                    <p className="text-slate-600 text-sm leading-relaxed pt-1">
                                        {review.comment}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-6 border-t border-slate-50">
                            <button
                                onClick={handlePrevPage}
                                disabled={page === 1}
                                className="p-2 border rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                                <ChevronLeft className="w-5 h-5 text-slate-600" />
                            </button>
                            <span className="text-sm font-black text-slate-700">
                                Trang {page} / {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={page === totalPages}
                                className="p-2 border rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                                <ChevronRight className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

function ReviewsSkeleton() {
    return (
        <section className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-pulse">
            <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                <div className="space-y-2">
                    <div className="h-6 w-48 bg-slate-100 rounded-lg"></div>
                    <div className="h-4 w-64 bg-slate-50 rounded-lg"></div>
                </div>
                <div className="h-16 w-32 bg-slate-50 rounded-2xl"></div>
            </div>

            <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 items-start py-6 border-b border-slate-100 last:border-0">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex-shrink-0"></div>
                        <div className="space-y-3 flex-grow">
                            <div className="flex justify-between items-center">
                                <div className="h-4 w-32 bg-slate-100 rounded-md"></div>
                                <div className="h-3.5 w-24 bg-slate-50 rounded-md"></div>
                            </div>
                            <div className="h-4 w-20 bg-slate-100 rounded-md"></div>
                            <div className="space-y-1">
                                <div className="h-3.5 w-full bg-slate-50 rounded-md"></div>
                                <div className="h-3.5 w-2/3 bg-slate-50 rounded-md"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
