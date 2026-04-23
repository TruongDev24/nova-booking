import React from "react";
import { Search, MapPin, Star, Clock, ArrowRight } from "lucide-react";

export default function ExploreCourtsPage() {
  // Dummy data for courts
  const courts = [
    {
      id: "1",
      name: "NOVA Stadium - Sân số 1",
      location: "Quận 7, TP. Hồ Chí Minh",
      price: 80000,
      rating: 4.8,
      reviews: 124,
      image: "https://images.unsplash.com/photo-1626224580175-340ad0e3a73a?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "2",
      name: "Sân Cầu Lông Ngôi Sao",
      location: "Quận Bình Thạnh, TP. HCM",
      price: 65000,
      rating: 4.5,
      reviews: 89,
      image: "https://images.unsplash.com/photo-1521537634581-0dced2fee2ef?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "3",
      name: "Pro Court Center",
      location: "Quận 1, TP. Hồ Chí Minh",
      price: 120000,
      rating: 4.9,
      reviews: 210,
      image: "https://images.unsplash.com/photo-1622279457486-62dcc4a4bd13?q=80&w=2070&auto=format&fit=crop",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Hero / Search Section */}
      <section className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500 rounded-full blur-[120px] opacity-20 -mr-32 -mt-32"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
            Tìm sân cầu lông ưng ý, <br/>
            <span className="text-cyan-400">Đặt lịch ngay hôm nay!</span>
          </h1>
          <p className="text-slate-400 mb-8 text-lg">
            Hơn 500+ sân cầu lông chất lượng cao trên toàn quốc đang chờ bạn khám phá.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 bg-white p-2 rounded-2xl shadow-xl">
            <div className="flex-1 flex items-center gap-3 px-4 py-2 border-b sm:border-b-0 sm:border-r border-slate-100">
              <Search className="w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tên sân hoặc khu vực..." 
                className="w-full bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-sm font-medium"
              />
            </div>
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2">
              Tìm ngay
            </button>
          </div>
        </div>
      </section>

      {/* Courts Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Sân gợi ý cho bạn</h2>
          <button className="text-sm font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 group">
            Xem tất cả <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courts.map((court) => (
            <div key={court.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
              {/* Image Cover */}
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={court.image} 
                  alt={court.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-slate-900">{court.rating}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-cyan-600 transition-colors">
                    {court.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{court.location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 font-medium">Giá chỉ từ</span>
                    <span className="text-lg font-extrabold text-slate-900">
                      {court.price.toLocaleString()}đ<span className="text-xs font-normal text-slate-500">/giờ</span>
                    </span>
                  </div>
                  <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-cyan-600 transition-colors shadow-lg shadow-slate-900/10">
                    Đặt sân ngay
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Info Section */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-cyan-50 p-8 rounded-3xl border border-cyan-100">
         <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm text-cyan-600">
               <Clock className="w-6 h-6" />
            </div>
            <div>
               <p className="font-bold text-slate-900">Đặt lịch 24/7</p>
               <p className="text-xs text-slate-500 text-balance">Mở cửa đặt mọi lúc mọi nơi</p>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm text-cyan-600">
               <MapPin className="w-6 h-6" />
            </div>
            <div>
               <p className="font-bold text-slate-900">Địa điểm gần bạn</p>
               <p className="text-xs text-slate-500 text-balance">Hỗ trợ tìm sân theo vị trí</p>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm text-cyan-600">
               <Star className="w-6 h-6" />
            </div>
            <div>
               <p className="font-bold text-slate-900">Uy tín hàng đầu</p>
               <p className="text-xs text-slate-500 text-balance">Sân được đánh giá từ cộng đồng</p>
            </div>
         </div>
      </section>
    </div>
  );
}
