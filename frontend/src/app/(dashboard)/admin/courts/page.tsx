"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Plus, Search, Map as MapIcon, Edit, Trash2, X, Loader2, 
  Camera, Check, Wifi, Coffee, Car, ShoppingBag, 
  ChevronLeft, ChevronRight, AlertCircle, HelpCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { courtService, Court, PaginatedCourts } from "@/services/court.service";
import { toast, Toaster } from "react-hot-toast";
import Image from "next/image";

// --- Configuration ---
const AMENITIES_LIST = [
  { id: "wifi", label: "Wifi", icon: Wifi },
  { id: "parking", label: "Bãi xe", icon: Car },
  { id: "canteen", label: "Canteen", icon: Coffee },
  { id: "rental", label: "Cho thuê vợt", icon: ShoppingBag },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// --- Validation Schema ---
const courtSchema = z.object({
  name: z.string()
    .trim()
    .min(5, "Tên sân phải có ít nhất 5 ký tự")
    .max(100, "Tên sân không được quá 100 ký tự"),
  location: z.string()
    .trim()
    .min(10, "Địa chỉ phải cụ thể (ít nhất 10 ký tự)")
    .max(255, "Địa chỉ quá dài"),
  pricePerHour: z.coerce.number()
    .min(0, "Giá tiền không được âm")
    .max(2000000, "Giá tiền quá lớn (tối đa 2.000.000đ)")
    .refine((val) => val % 1000 === 0, {
      message: "Giá tiền phải là bội số của 1.000 (VD: 50.000, 120.000)",
    }),
  description: z.string().optional(),
  openingTime: z.string().min(1, "Vui lòng chọn giờ mở cửa"),
  closingTime: z.string().min(1, "Vui lòng chọn giờ đóng cửa"),
  amenities: z.array(z.string()).optional(),
});

type CourtFormValues = z.infer<typeof courtSchema>;

export default function AdminCourtsPage() {
  const [courtsData, setCourtsData] = useState<PaginatedCourts | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  
  // States for confirmation
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<CourtFormValues | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CourtFormValues>({
    resolver: zodResolver(courtSchema),
    defaultValues: {
      name: "",
      location: "",
      pricePerHour: 50000,
      description: "",
      openingTime: "05:00",
      closingTime: "22:00",
      amenities: [],
    },
  });

  const watchAmenities = watch("amenities") || [];

  const fetchCourts = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await courtService.getAll(page, 6, search);
      setCourtsData(result);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách sân");
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCourts();
  }, [fetchCourts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      for (const file of files) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast.error(`File ${file.name} không đúng định dạng (Chỉ nhận JPG, PNG, WEBP)`);
          return;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`File ${file.name} vượt quá 5MB`);
          return;
        }
      }

      setSelectedFiles(files);
      const filePreviews = files.map(file => URL.createObjectURL(file));
      setPreviews(filePreviews);
    }
  };

  const openModal = (court: Court | null = null) => {
    setEditingCourt(court);
    setPreviews([]);
    setSelectedFiles([]);
    setShowConfirm(false);
    setPendingData(null);
    
    if (court) {
      setValue("name", court.name);
      setValue("location", court.location);
      setValue("pricePerHour", court.pricePerHour);
      setValue("description", court.description || "");
      setValue("openingTime", court.openingTime);
      setValue("closingTime", court.closingTime);
      setValue("amenities", Array.isArray(court.amenities) ? (court.amenities as string[]) : []);
    } else {
      reset();
    }
    setIsModalOpen(true);
  };

  const toggleAmenity = (id: string) => {
    const current = watchAmenities;
    if (current.includes(id)) {
      setValue("amenities", current.filter(item => item !== id));
    } else {
      setValue("amenities", [...current, id]);
    }
  };

  const onSubmit = (data: CourtFormValues) => {
    if (!editingCourt && selectedFiles.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 ảnh cho sân mới");
      return;
    }
    setPendingData(data);
    setShowConfirm(true); 
  };

  const confirmSubmit = async () => {
    if (!pendingData) return;
    
    try {
      const formData = new FormData();
      formData.append("name", pendingData.name.trim());
      formData.append("location", pendingData.location.trim());
      formData.append("pricePerHour", pendingData.pricePerHour.toString());
      formData.append("openingTime", pendingData.openingTime);
      formData.append("closingTime", pendingData.closingTime);
      if (pendingData.description) formData.append("description", pendingData.description.trim());
      if (pendingData.amenities) formData.append("amenities", JSON.stringify(pendingData.amenities));

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      if (editingCourt) {
        await courtService.update(editingCourt.id, formData);
        toast.success("Cập nhật sân thành công!");
      } else {
        await courtService.create(formData);
        toast.success("Thêm sân mới thành công!");
      }
      
      setIsModalOpen(false);
      setShowConfirm(false);
      setPendingData(null);
      fetchCourts();
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error("Đã có lỗi xảy ra khi lưu dữ liệu");
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = window.confirm(
      "HÀNH ĐỘNG NGUY HIỂM!\n\nBạn có chắc chắn muốn xóa sân này không? Dữ liệu sẽ không thể khôi phục."
    );

    if (isConfirmed) {
      try {
        await courtService.delete(id);
        toast.success("Đã xóa sân thành công");
        fetchCourts();
      } catch {
        toast.error("Không thể xóa sân. Vui lòng thử lại sau.");
      }
    }
  };

  const courts = courtsData?.data || [];
  const meta = courtsData?.meta;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản lý Sân</h1>
          <p className="text-slate-500 text-sm font-medium">Hệ thống quản lý cơ sở vật chất và tiện ích.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Tìm tên sân..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm w-64 font-medium"
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline">Thêm sân mới</span>
          </button>
        </div>
      </div>

      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : courts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
            <MapIcon className="w-12 h-12 mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-xs">Không tìm thấy sân nào</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courts.map((court) => (
                <div key={court.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="relative h-48 bg-slate-50">
                    {court.images && court.images.length > 0 ? (
                      <Image src={court.images[0]} alt={court.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Camera className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button onClick={() => openModal(court)} className="p-2.5 bg-white/90 backdrop-blur-sm rounded-xl text-blue-500 hover:bg-blue-500 hover:text-white shadow-sm transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(court.id)} className="p-2.5 bg-white/90 backdrop-blur-sm rounded-xl text-red-500 hover:bg-red-500 hover:text-white shadow-sm transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-slate-900 text-lg mb-1">{court.name}</h3>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-4">
                       <MapIcon className="w-3 h-3" />
                       <span className="line-clamp-1">{court.location}</span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Giá thuê / Giờ</span>
                        <span className="font-black text-blue-600 text-xl">{court.pricePerHour.toLocaleString()}đ</span>
                      </div>
                      <div className="flex -space-x-2">
                         {Array.isArray(court.amenities) && court.amenities.slice(0, 3).map((a) => {
                            const amenity = AMENITIES_LIST.find(item => item.id === a);
                            return (
                              <div key={a} className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[10px] shadow-sm" title={amenity?.label || a}>
                                 {amenity?.icon ? React.createElement(amenity.icon, { className: "w-3.5 h-3.5 text-slate-600" }) : "•"}
                              </div>
                            );
                         })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {meta && meta.lastPage > 1 && (
              <div className="flex items-center justify-center gap-6 pt-4">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900">TRANG {page}</span>
                  <span className="text-sm font-bold text-slate-400">/ {meta.lastPage}</span>
                </div>
                <button
                  disabled={page === meta.lastPage}
                  onClick={() => setPage(p => p + 1)}
                  className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Confirmation Overlay (Strict) */}
            {showConfirm && (
              <div className="absolute inset-0 z-[60] bg-white/98 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
                <div className="text-center max-w-sm space-y-6">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${editingCourt ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                     {editingCourt ? <HelpCircle className="w-10 h-10" /> : <Check className="w-10 h-10" />}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black text-slate-900">
                       {editingCourt ? "Xác nhận cập nhật?" : "Xác nhận tạo sân?"}
                    </h4>
                    <p className="text-slate-500 font-medium leading-relaxed">
                      {editingCourt 
                         ? "Bạn có chắc chắn muốn lưu các thay đổi cho sân này?" 
                         : "Bạn có chắc chắn muốn tạo sân này với các thông tin đã nhập?"}
                    </p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Hủy
                    </button>
                    <button 
                      onClick={confirmSubmit}
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                      Xác nhận
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {editingCourt ? "Cập nhật sân" : "Thêm sân mới"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2.5 hover:bg-slate-50 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Image Upload Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Hình ảnh sân (Tối đa 5 ảnh)</label>
                   <span className="text-[10px] font-bold text-slate-300">JPG, PNG, WEBP (Tối đa 5MB)</span>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {previews.map((src, idx) => (
                    <div key={idx} className="aspect-square rounded-2xl border border-slate-100 overflow-hidden relative group shadow-sm">
                      <Image src={src} alt="preview" fill className="object-cover" />
                    </div>
                  ))}
                  {previews.length < 5 && (
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 cursor-pointer transition-all bg-slate-50">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Thêm</span>
                      <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tên sân</label>
                  <input 
                    {...register("name")} 
                    placeholder="VD: Sân Cầu Lông NOVA 1" 
                    className={`w-full px-5 py-3.5 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold text-slate-900 ${errors.name ? 'border-red-100 focus:border-red-500' : 'border-slate-50 focus:border-blue-500 focus:bg-white'}`} 
                  />
                  {errors.name && <div className="flex items-center gap-1.5 text-red-500 mt-2 font-bold text-[11px]"><AlertCircle className="w-3.5 h-3.5" />{errors.name.message}</div>}
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Địa chỉ chi tiết</label>
                  <input 
                    {...register("location")} 
                    className={`w-full px-5 py-3.5 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold text-slate-900 ${errors.location ? 'border-red-100 focus:border-red-500' : 'border-slate-50 focus:border-blue-500 focus:bg-white'}`} 
                  />
                  {errors.location && <div className="flex items-center gap-1.5 text-red-500 mt-2 font-bold text-[11px]"><AlertCircle className="w-3.5 h-3.5" />{errors.location.message}</div>}
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Giá thuê / Giờ (VNĐ)</label>
                  <input 
                    type="number" 
                    {...register("pricePerHour")} 
                    className={`w-full px-5 py-3.5 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold text-slate-900 ${errors.pricePerHour ? 'border-red-100 focus:border-red-500' : 'border-slate-50 focus:border-blue-500 focus:bg-white'}`} 
                  />
                  {errors.pricePerHour && <div className="flex items-center gap-1.5 text-red-500 mt-2 font-bold text-[11px]"><AlertCircle className="w-3.5 h-3.5" />{errors.pricePerHour.message}</div>}
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mô tả ngắn</label>
                  <input 
                    {...register("description")} 
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-slate-900 transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Giờ mở cửa</label>
                  <input 
                    type="time"
                    {...register("openingTime")} 
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-slate-900 transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Giờ đóng cửa</label>
                  <input 
                    type="time"
                    {...register("closingTime")} 
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-slate-900 transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-4">
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Tiện ích đi kèm</label>
                 <div className="flex flex-wrap gap-3">
                    {AMENITIES_LIST.map((item) => (
                       <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleAmenity(item.id)}
                          className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                             watchAmenities.includes(item.id)
                             ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                             : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                          }`}
                       >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="flex gap-4 pt-8 sticky bottom-0 bg-white pb-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-6 py-4 border-2 border-slate-100 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
                >
                  {editingCourt ? "Cập nhật sân" : "Tạo sân ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
