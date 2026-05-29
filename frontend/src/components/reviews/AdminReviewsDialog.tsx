"use client";

import React, { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight, MessageSquare, Calendar } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { reviewService, Review } from "@/services/review.service";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

interface AdminReviewsDialogProps {
    courtId: string;
    courtName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AdminReviewsDialog({
    courtId,
    courtName,
    open,
    onOpenChange,
}: AdminReviewsDialogProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalReviews, setTotalReviews] = useState(0);

    const limit = 5;

    useEffect(() => {
        if (!open) return;

        const fetchReviews = async () => {
            try {
                setLoading(true);
                const res = await reviewService.getCourtReviews(courtId, page, limit);
                setReviews(res.data);
                setTotalPages(res.meta.lastPage || 1);
                setTotalReviews(res.meta.total || 0);
            } catch (error) {
                console.error("Error fetching reviews:", error);
                toast.error("Không thể tải danh sách đánh giá");
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [courtId, page, open]);


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
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
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
                        className={`w-3.5 h-3.5 ${
                            star <= rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-200"
                        }`}
                    />
                ))}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] rounded-[2rem] p-6 gap-6">
                <DialogHeader className="border-b pb-4">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2.5">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        Đánh giá sân bóng
                    </DialogTitle>
                    <DialogDescription className="font-medium mt-1">
                        Danh sách các đánh giá từ khách hàng cho sân <strong>{courtName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                {loading && reviews.length === 0 ? (
                    <div className="space-y-4 py-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-3 items-start animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0"></div>
                                <div className="space-y-2 flex-grow">
                                    <div className="flex justify-between">
                                        <div className="h-3.5 w-24 bg-slate-100 rounded"></div>
                                        <div className="h-3 w-16 bg-slate-50 rounded"></div>
                                    </div>
                                    <div className="h-3.5 w-16 bg-slate-100 rounded"></div>
                                    <div className="h-3 w-full bg-slate-50 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-muted flex flex-col items-center justify-center p-6">
                        <Star className="w-10 h-10 text-muted-foreground opacity-30 mb-3 stroke-1" />
                        <h4 className="font-bold text-slate-800">Chưa có đánh giá nào</h4>
                        <p className="text-muted-foreground text-xs mt-1 text-center max-w-[280px]">
                            Sân bóng này hiện chưa nhận được phản hồi hay đánh giá nào từ khách hàng.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Scrollable List */}
                        <div className="max-h-[350px] overflow-y-auto pr-1 space-y-4 divide-y divide-slate-100">
                            {reviews.map((review, idx) => (
                                <div key={review.id} className={`flex gap-3 items-start ${idx > 0 ? "pt-4" : ""}`}>
                                    {/* Avatar */}
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary/10 border border-primary/10 flex-shrink-0 flex items-center justify-center">
                                        {review.user.avatar ? (
                                            <Image
                                                src={review.user.avatar}
                                                alt={review.user.fullName}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <span className="text-xs font-black text-primary">
                                                {getInitials(review.user.fullName)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h5 className="font-bold text-sm text-slate-900 truncate">
                                                {review.user.fullName}
                                            </h5>
                                            <span className="text-[10px] text-muted-foreground font-semibold shrink-0 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatReviewDate(review.createdAt)}
                                            </span>
                                        </div>

                                        {renderStars(review.rating)}

                                        <p className="text-slate-600 text-xs leading-relaxed break-words bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                                            {review.comment}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t pt-4">
                                <span className="text-xs font-bold text-muted-foreground uppercase">
                                    Tổng cộng: {totalReviews} đánh giá
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handlePrevPage}
                                        disabled={page === 1}
                                        className="h-8 w-8 rounded-lg active:scale-95 transition-all"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs font-black text-slate-700 min-w-[60px] text-center">
                                        {page} / {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleNextPage}
                                        disabled={page === totalPages}
                                        className="h-8 w-8 rounded-lg active:scale-95 transition-all"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
