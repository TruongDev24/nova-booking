"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, Map as MapIcon, Edit, Trash2, X, Loader2, Camera, Check, Wifi, Coffee, Car, ShoppingBag } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { courtService, Court } from "@/services/court.service";
import { toast, Toaster } from "react-hot-toast";

// --- Configuration ---
const AMENITIES_LIST = [
  { id: "wifi", label: "Wifi", icon: Wifi },
  { id: "parking", label: "Bãi xe", icon: Car },
  { id: "canteen", label: "Canteen", icon: Coffee },
  { id: "rental", label: "Cho thuê vợt", icon: ShoppingBag },
];

// --- Validation Schema ---
const courtSchema = z.object({
  name: z.string().min(3, "Tên sân phải có ít nhất 3 ký tự"),
  location: z.string().min(5, "Địa chỉ phải cụ thể hơn"),
  pricePerHour: z.coerce.number().positive("Giá tiền phải là số dương"),
  description: z.string().optional(),
  openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Định dạng HH:mm"),
  closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Định dạng HH:mm"),
  amenities: z.array(z.string()).optional(),
});

type CourtFormValues = z.infer<typeof courtSchema>;

export default function AdminCourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  
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
      const data = await courtService.getAll();
      setCourts(data);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách sân");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourts();
  }, [fetchCourts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      
      const filePreviews = files.map(file => URL.createObjectURL(file));
      setPreviews(filePreviews);
    }
  };

  const openModal = (court: Court | null = null) => {
    setEditingCourt(court);
    setPreviews([]);
    setSelectedFiles([]);
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

  const onSubmit = async (data: CourtFormValues) => {
    try {
      const formData = new FormData();
      
      // Explicitly append fields to ensure type consistency and support multipart/form-data
      formData.append("name", data.name);
      formData.append("location", data.location);
      formData.append("pricePerHour", data.pricePerHour.toString());
      formData.append("openingTime", data.openingTime);
      formData.append("closingTime", data.closingTime);
      if (data.description) formData.append("description", data.description);
      if (data.amenities) formData.append("amenities", JSON.stringify(data.amenities));

      // Append files if selected
      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      if (editingCourt) {
        await courtService.update(editingCourt.id, formData);
        toast.success("Cập nhật sân thành công!");
      } else {
        if (selectedFiles.length === 0) {
           toast.error("Vui lòng chọn ít nhất 1 ảnh");
           return;
        }
        await courtService.create(formData);
        toast.success("Thêm sân mới thành công!");
      }
      
      // Cleanup
      setIsModalOpen(false);
      setPreviews([]);
      setSelectedFiles([]);
      fetchCourts();
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error("Đã có lỗi xảy ra khi lưu");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa sân này?")) {
      try {
        await courtService.delete(id);
        toast.success("Đã xóa sân thành công");
        fetchCourts();
      } catch (error) {
        toast.error("Không thể xóa sân");
      }
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Sân</h1>
          <p className="text-slate-500 text-sm">Quản lý hình ảnh và tiện ích cho các sân cầu lông.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/25"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm sân mới</span>
        </button>
      </div>

      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : courts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <MapIcon className="w-12 h-12 mb-4 opacity-10" />
            <p className="font-medium">Chưa có sân nào được tạo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courts.map((court) => (
              <div key={court.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="relative h-48 bg-slate-100">
                  {court.images && court.images.length > 0 ? (
                    <img src={court.images[0]} alt={court.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Camera className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button onClick={() => openModal(court)} className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-blue-500 hover:bg-blue-500 hover:text-white shadow-sm transition-all">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(court.id)} className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-red-500 hover:bg-red-500 hover:text-white shadow-sm transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-slate-900 text-lg mb-1">{court.name}</h3>
                  <p className="text-slate-500 text-sm mb-4 line-clamp-1">{court.location}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="font-bold text-cyan-600 text-lg">{court.pricePerHour.toLocaleString()}đ<span className="text-xs font-normal text-slate-400">/giờ</span></span>
                    <div className="flex -space-x-2">
                       {Array.isArray(court.amenities) && court.amenities.map((a) => {
                          const amenity = AMENITIES_LIST.find(item => item.id === a);
                          return (
                            <div key={a} className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px]" title={amenity?.label || a}>
                               {amenity?.icon ? React.createElement(amenity.icon, { className: "w-3 h-3 text-slate-600" }) : "•"}
                            </div>
                          );
                       })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">{editingCourt ? "Cập nhật sân" : "Thêm sân mới"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700">Hình ảnh sân (Tối đa 5 ảnh)</label>
                <div className="grid grid-cols-5 gap-3">
                  {previews.map((src) => (
                    <div key={src} className="aspect-square rounded-xl border border-slate-200 overflow-hidden relative group">
                      <img src={src} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {previews.length < 5 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-cyan-500 hover:text-cyan-500 cursor-pointer transition-all bg-slate-50">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-bold">Thêm ảnh</span>
                      <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Tên sân</label>
                  <input {...register("name")} placeholder="VD: Sân Cầu Lông NOVA 1" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Địa chỉ chi tiết</label>
                  <input {...register("location")} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                  {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Giá / Giờ (VNĐ)</label>
                  <input type="number" {...register("pricePerHour")} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                  {errors.pricePerHour && <p className="text-red-500 text-xs mt-1">{errors.pricePerHour.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Mô tả ngắn</label>
                  <input {...register("description")} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Mở cửa (HH:mm)</label>
                  <input {...register("openingTime")} placeholder="05:00" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                  {errors.openingTime && <p className="text-red-500 text-xs mt-1">{errors.openingTime.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Đóng cửa (HH:mm)</label>
                  <input {...register("closingTime")} placeholder="22:00" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                  {errors.closingTime && <p className="text-red-500 text-xs mt-1">{errors.closingTime.message}</p>}
                </div>
              </div>

              <div className="space-y-3">
                 <label className="block text-sm font-bold text-slate-700">Tiện ích sân</label>
                 <div className="flex flex-wrap gap-3">
                    {AMENITIES_LIST.map((item) => (
                       <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleAmenity(item.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                             watchAmenities.includes(item.id)
                             ? "bg-cyan-500 border-cyan-500 text-white shadow-md shadow-cyan-500/20"
                             : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                       >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                          {watchAmenities.includes(item.id) && <Check className="w-3 h-3" />}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all">Hủy</button>
                <button type="submit" disabled={isSubmitting} className="flex-3 px-12 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-3">
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {editingCourt ? "Cập nhật ngay" : "Tạo sân ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
