"use client";

import React, { useState, useEffect } from "react";
import { Search, MapPin, Star, Clock, ArrowRight, Loader2, Image as ImageIcon } from "lucide-react";
import { courtService, PaginatedCourts, Court } from "@/services/court.service";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";

export default function ExploreCourtsPage() {
  const [courtsData, setCourtsData] = useState<PaginatedCourts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCourts = React.useCallback(async (search = "") => {
    try {
      setIsLoading(true);
      // Lấy 6 sân nổi bật nhất (limit=6)
      const data = await courtService.getAll(1, 6, search);
      setCourtsData(data);
    } catch (error) {
      console.error("Fetch Courts Error:", error);
      toast.error("Không thể tải danh sách sân");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCourts();
  }, [fetchCourts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCourts(searchTerm);
  };

  const courts = courtsData?.data || [];

  return (
    <div className="space-y-10">
      <Toaster position="top-right" />
      
      {/* Hero / Search Section */}
      <section className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-16 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500 rounded-full blur-[150px] opacity-20 -mr-64 -mt-64"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
            Tìm sân cầu lông, <br/>
            <span className="text-cyan-400">Đặt lịch thần tốc!</span>
          </h1>
          <p className="text-slate-400 mb-10 text-lg leading-relaxed">
            Hệ thống đặt sân cầu lông hiện đại nhất. <br className="hidden sm:block"/>
            Hơn {courtsData?.meta.total || "..."} sân chất lượng cao đang chờ bạn khám phá.
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 bg-white/10 backdrop-blur-md p-2 rounded-3xl border border-white/10">
            <div className="flex-1 flex items-center gap-3 px-6 py-3">
              <Search className="w-5 h-5 text-cyan-400" />
              <input 
                type="text" 
                placeholder="Tìm theo tên sân hoặc địa chỉ..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-slate-500 text-sm font-medium"
              />
            </div>
            <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2">
              Tìm kiếm
            </button>
          </form>
        </div>
      </section>

      {/* Courts Grid */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Sân gợi ý cho bạn</h2>
            <p className="text-slate-500 text-sm mt-1">Dựa trên đánh giá và vị trí của bạn</p>
          </div>
          <Link href="/courts" className="text-sm font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 group bg-cyan-50 px-4 py-2 rounded-full transition-all">
            Xem tất cả <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm animate-pulse">
                <div className="h-64 bg-slate-100"></div>
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-slate-100 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                  <div className="pt-4 border-t border-slate-50 flex justify-between">
                    <div className="h-8 bg-slate-100 rounded w-1/4"></div>
                    <div className="h-10 bg-slate-100 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : courts.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-dashed border-slate-200 p-20 flex flex-col items-center text-center">
            <ImageIcon className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-900">Không tìm thấy sân nào</h3>
            <p className="text-slate-500 mt-2">Hiện tại chưa có sân nào phù hợp với tìm kiếm của bạn.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courts.map((court: Court) => (
              <div key={court.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
                {/* Image Cover */}
                <div className="relative h-64 overflow-hidden">
                  {court.images?.[0] ? (
                    <img 
                      src={court.images[0]} 
                      alt={court.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-5 left-5 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-black text-slate-900">4.9</span>
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
                      href={`/courts/${court.id}`}
                      className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-sm font-black hover:bg-cyan-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                    >
                      Đặt sân ngay
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Info Section */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-8 bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100">
         <div className="flex items-center gap-5">
            <div className="bg-white p-4 rounded-2xl shadow-sm text-cyan-600">
               <Clock className="w-7 h-7" />
            </div>
            <div>
               <p className="font-black text-slate-900">Đặt lịch 24/7</p>
               <p className="text-sm text-slate-500">Mở cửa đặt mọi lúc mọi nơi</p>
            </div>
         </div>
         <div className="flex items-center gap-5">
            <div className="bg-white p-4 rounded-2xl shadow-sm text-cyan-600">
               <MapPin className="w-7 h-7" />
            </div>
            <div>
               <p className="font-black text-slate-900">Địa điểm gần bạn</p>
               <p className="text-sm text-slate-500">Hỗ trợ tìm sân theo vị trí</p>
            </div>
         </div>
         <div className="flex items-center gap-5">
            <div className="bg-white p-4 rounded-2xl shadow-sm text-cyan-600">
               <Star className="w-7 h-7" />
            </div>
            <div>
               <p className="font-black text-slate-900">Uy tín hàng đầu</p>
               <p className="text-sm text-slate-500">Hệ thống đánh giá cộng đồng</p>
            </div>
         </div>
      </section>
    </div>
  );
}
