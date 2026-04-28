"use client";

import React, { useState } from "react";
import { 
  Plus, Map as MapIcon, Edit, Trash2, X, Loader2, 
  Camera, Wifi, Coffee, Car, ShoppingBag, 
  MoreHorizontal
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { courtService, Court } from "@/services/court.service";
import { toast } from "sonner";
import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  pricePerHour: z.number({ message: "Giá tiền phải là số" })
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
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [courtToDelete, setCourtToDelete] = useState<string | null>(null);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
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

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchAmenities = watch("amenities") || [];

  // --- React Query: Fetch ---
  const { data: courts = [], isLoading } = useQuery({
    queryKey: ["courts"],
    queryFn: async () => {
      const result = await courtService.getAll(1, 100);
      return result.data;
    },
  });

  // --- React Query: Mutations ---
  const createMutation = useMutation({
    mutationFn: (formData: FormData) => courtService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      setIsModalOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      courtService.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => courtService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      toast.success("Đã xóa sân thành công");
    },
    onError: () => {
      toast.error("Không thể xóa sân. Vui lòng thử lại.");
    }
  });

  const columns: ColumnDef<Court>[] = [
    {
      accessorKey: "name",
      header: "Tên sân",
      cell: ({ row }) => {
        const court = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-lg overflow-hidden border bg-muted">
              {court.images?.[0] ? (
                <Image src={court.images[0]} alt={court.name} fill className="object-cover" />
              ) : (
                <Camera className="h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight">{court.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{court.openingTime} - {court.closingTime}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "location",
      header: "Địa điểm",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium max-w-[200px]">
          <MapIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">{row.original.location}</span>
        </div>
      ),
    },
    {
      accessorKey: "pricePerHour",
      header: "Giá thuê",
      cell: ({ row }) => (
        <div className="font-black text-primary">
          {row.original.pricePerHour.toLocaleString()}đ
        </div>
      ),
    },
    {
      accessorKey: "amenities",
      header: "Tiện ích",
      cell: ({ row }) => {
        const amenities = row.original.amenities as string[] || [];
        return (
          <div className="flex gap-1">
            {amenities.slice(0, 3).map((a) => {
               const amenity = AMENITIES_LIST.find(item => item.id === a);
               return (
                 <div key={a} className="w-6 h-6 rounded-full bg-muted border flex items-center justify-center" title={amenity?.label || a}>
                    {amenity?.icon ? React.createElement(amenity.icon, { className: "w-3 h-3 text-muted-foreground" }) : "•"}
                 </div>
               );
            })}
            {amenities.length > 3 && <span className="text-[10px] text-muted-foreground self-center">+{amenities.length - 3}</span>}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const court = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openModal(court)}>
                  <Edit className="mr-2 h-4 w-4" /> Sửa thông tin
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCourtToDelete(court.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Xóa sân
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast.error(`File ${file.name} không đúng định dạng`);
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

  const onFormSubmit = async (data: CourtFormValues) => {
    if (!editingCourt && selectedFiles.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 ảnh cho sân mới");
      return;
    }

    const formData = new FormData();
    formData.append("name", data.name.trim());
    formData.append("location", data.location.trim());
    formData.append("pricePerHour", data.pricePerHour.toString());
    formData.append("openingTime", data.openingTime);
    formData.append("closingTime", data.closingTime);
    if (data.description) formData.append("description", data.description.trim());
    if (data.amenities) formData.append("amenities", JSON.stringify(data.amenities));
    selectedFiles.forEach((file) => formData.append("images", file));

    if (editingCourt) {
      toast.promise(updateMutation.mutateAsync({ id: editingCourt.id, formData }), {
        loading: "Đang cập nhật thông tin sân...",
        success: "Cập nhật sân thành công!",
        error: "Lỗi khi cập nhật sân",
      });
    } else {
      toast.promise(createMutation.mutateAsync(formData), {
        loading: "Đang tạo sân mới...",
        success: "Thêm sân mới thành công!",
        error: "Lỗi khi thêm sân mới",
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Quản lý Sân</h1>
          <p className="text-muted-foreground font-medium">Hệ thống quản lý cơ sở vật chất và tiện ích.</p>
        </div>
        <Button 
          onClick={() => openModal()}
          className="flex items-center gap-2 h-11 px-6 rounded-xl font-bold shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm sân mới</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-[250px]" />
          <div className="border rounded-xl">
             {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border-b last:border-0">
                   <Skeleton className="h-10 w-10 rounded-lg" />
                   <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[40%]" />
                      <Skeleton className="h-3 w-[20%]" />
                   </div>
                   <Skeleton className="h-4 w-[100px]" />
                </div>
             ))}
          </div>
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={courts} 
          searchKey="name" 
          searchPlaceholder="Tìm kiếm theo tên sân..." 
        />
      )}

      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={!!courtToDelete} onOpenChange={() => setCourtToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase">Xác nhận xóa sân?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              Hành động này không thể hoàn tác. Dữ liệu sân và các thông tin liên quan sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl h-11 font-bold">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => courtToDelete && deleteMutation.mutate(courtToDelete)}
              className="rounded-xl h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-card border rounded-[2rem] shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-black uppercase tracking-tight">
                {editingCourt ? "Cập nhật sân" : "Thêm sân mới"}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="w-6 h-6 text-muted-foreground" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hình ảnh sân (Tối đa 5 ảnh)</label>
                 <div className="grid grid-cols-5 gap-3">
                   {previews.map((src, idx) => (
                     <div key={idx} className="aspect-square rounded-xl border overflow-hidden relative shadow-sm">
                       <Image src={src} alt="preview" fill className="object-cover" />
                     </div>
                   ))}
                   {previews.length < 5 && (
                     <label className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary hover:bg-muted cursor-pointer transition-all bg-muted/50">
                       <Camera className="w-5 h-5 mb-1" />
                       <span className="text-[9px] font-black uppercase">Thêm</span>
                       <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                     </label>
                   )}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Tên sân</label>
                  <input 
                    {...register("name")} 
                    className={`w-full h-11 px-4 bg-muted/50 border rounded-xl outline-none transition-all font-bold text-sm ${errors.name ? 'border-destructive' : 'focus:border-primary focus:bg-background'}`} 
                  />
                  {errors.name && <p className="text-destructive mt-1 text-[10px] font-bold uppercase">{errors.name.message}</p>}
                </div>
                
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Địa chỉ chi tiết</label>
                  <input 
                    {...register("location")} 
                    className={`w-full h-11 px-4 bg-muted/50 border rounded-xl outline-none transition-all font-bold text-sm ${errors.location ? 'border-destructive' : 'focus:border-primary focus:bg-background'}`} 
                  />
                  {errors.location && <p className="text-destructive mt-1 text-[10px] font-bold uppercase">{errors.location.message}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Giá thuê / Giờ</label>
                  <input 
                    type="number" 
                    {...register("pricePerHour", { valueAsNumber: true })} 
                    className={`w-full h-11 px-4 bg-muted/50 border rounded-xl outline-none transition-all font-bold text-sm ${errors.pricePerHour ? 'border-destructive' : 'focus:border-primary focus:bg-background'}`} 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Mô tả ngắn</label>
                  <input 
                    {...register("description")} 
                    className="w-full h-11 px-4 bg-muted/50 border rounded-xl outline-none focus:border-primary focus:bg-background font-bold text-sm transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Giờ mở cửa</label>
                  <input type="time" {...register("openingTime")} className="w-full h-11 px-4 bg-muted/50 border rounded-xl focus:border-primary focus:bg-background outline-none font-bold text-sm" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Giờ đóng cửa</label>
                  <input type="time" {...register("closingTime")} className="w-full h-11 px-4 bg-muted/50 border rounded-xl focus:border-primary focus:bg-background outline-none font-bold text-sm" />
                </div>
              </div>

              <div className="space-y-3">
                 <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tiện ích đi kèm</label>
                 <div className="flex flex-wrap gap-2">
                    {AMENITIES_LIST.map((item) => (
                       <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleAmenity(item.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[11px] font-black uppercase transition-all ${
                             watchAmenities.includes(item.id)
                             ? "bg-primary border-primary text-primary-foreground shadow-md"
                             : "bg-background text-muted-foreground hover:border-primary"
                          }`}
                       >
                          <item.icon className="w-3.5 h-3.5" />
                          {item.label}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl">Hủy bỏ</Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-[2] h-12 rounded-xl text-lg font-black uppercase tracking-widest"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Lưu dữ liệu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
