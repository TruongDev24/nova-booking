"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService, BankInfo } from "@/services/user.service";
import { toast } from "react-hot-toast";
import { 
    CreditCard, 
    Building2, 
    User, 
    Hash, 
    Save, 
    Loader2, 
    AlertCircle,
    CheckCircle2
} from "lucide-react";

interface VietQRBank {
    id: number;
    name: string;
    code: string;
    bin: string;
    shortName: string;
    logo: string;
}

export default function BankProfilePage() {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<BankInfo>({
        bankName: "",
        bankAccountNumber: "",
        bankAccountName: ""
    });

    // 1. Fetch User Profile to pre-fill form
    const { data: user, isLoading: isUserLoading } = useQuery({
        queryKey: ["user-profile"],
        queryFn: () => userService.getProfile(),
    });

    const isInitialized = React.useRef(false);

    React.useEffect(() => {
        if (user && !isInitialized.current) {
            setFormData({
                bankName: user.bankName || "",
                bankAccountNumber: user.bankAccountNumber || "",
                bankAccountName: user.bankAccountName || ""
            });
            isInitialized.current = true;
        }
    }, [user]);

    // 2. Fetch Banks from VietQR
    const { data: banks, isLoading: isBanksLoading } = useQuery({
        queryKey: ["vietqr-banks"],
        queryFn: async () => {
            const res = await fetch("https://api.vietqr.io/v2/banks");
            const json = await res.json();
            return json.data as VietQRBank[];
        }
    });

    const mutation = useMutation({
        mutationFn: (data: BankInfo) => userService.updateBankInfo(data),
        onSuccess: () => {
            toast.success("Cập nhật thông tin ngân hàng thành công");
            queryClient.invalidateQueries({ queryKey: ["user-profile"] });
        },
        onError: (error: { response?: { data?: { message?: string } } }) => {
            toast.error(error?.response?.data?.message || "Có lỗi xảy ra khi cập nhật");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    if (isUserLoading || isBanksLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Thông tin hoàn tiền</h1>
                <p className="text-slate-500">Cung cấp tài khoản ngân hàng để nhận hoàn tiền tự động khi bạn hủy lịch chơi.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 md:p-12">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Bank Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                                <Building2 className="w-3 h-3" /> Ngân hàng thụ hưởng
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.bankName}
                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                    className="w-full h-14 pl-5 pr-10 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none cursor-pointer"
                                    required
                                >
                                    <option value="" disabled>Chọn ngân hàng</option>
                                    {banks?.map((bank) => (
                                        <option key={bank.id} value={bank.shortName}>
                                            {bank.shortName} - {bank.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <CreditCard className="w-5 h-5 text-slate-300" />
                                </div>
                            </div>
                        </div>

                        {/* Account Number */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                                <Hash className="w-3 h-3" /> Số tài khoản
                            </label>
                            <input
                                type="text"
                                value={formData.bankAccountNumber}
                                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                                placeholder="Nhập số tài khoản ngân hàng"
                                className="w-full h-14 px-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                required
                            />
                        </div>

                        {/* Account Name */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                                <User className="w-3 h-3" /> Tên chủ tài khoản
                            </label>
                            <input
                                type="text"
                                value={formData.bankAccountName}
                                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value.toUpperCase() })}
                                placeholder="VIET THE TRUONG"
                                className="w-full h-14 px-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                required
                            />
                            <p className="text-[10px] text-slate-400 italic ml-1">Vui lòng nhập tên không dấu, in hoa (ví dụ: NGUYEN VAN A)</p>
                        </div>

                        {/* Status Alert */}
                        {!user?.bankAccountNumber && (
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                <div className="text-sm text-amber-800 font-medium leading-relaxed">
                                    Bạn chưa cập nhật thông tin ngân hàng. Vui lòng hoàn tất để hệ thống có thể xử lý hoàn tiền khi bạn hủy sân.
                                </div>
                            </div>
                        )}

                        {user?.bankAccountNumber && (
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                <div className="text-sm text-emerald-800 font-medium leading-relaxed">
                                    Thông tin ngân hàng đã được xác thực cho tài khoản này.
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full h-16 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 hover:shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-6 h-6" />
                                    Lưu thông tin
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
