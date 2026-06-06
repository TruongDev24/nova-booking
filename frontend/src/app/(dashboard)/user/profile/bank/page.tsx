"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService, BankInfo } from "@/services/user.service";
import { toast } from "sonner";
import { useLanguage } from "@/context/language-context";
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
    const { t } = useLanguage();
    const [formData, setFormData] = useState<BankInfo>({
        bankName: "",
        bankAccountNumber: "",
        bankAccountName: ""
    });

    const isInitialized = React.useRef(false);

    // 1. Fetch User Profile to pre-fill form
    const { data: user, isLoading: isUserLoading } = useQuery({
        queryKey: ["user-profile"],
        queryFn: () => userService.getProfile(),
    });

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

    // 2. Fetch Banks from Proxy (Backend) to avoid CORS
    const { data: banks, isLoading: isBanksLoading } = useQuery({
        queryKey: ["vietqr-banks"],
        queryFn: async () => {
            const response = await userService.getBanks();
            return response.data as VietQRBank[];
        }
    });

    const mutation = useMutation({
        mutationFn: (data: BankInfo) => userService.updateBankInfo(data),
        onSuccess: () => {
            toast.success(t("bank.successUpdate"));
            queryClient.invalidateQueries({ queryKey: ["user-profile"] });
        },
        onError: (error: { response?: { data?: { message?: string } } }) => {
            toast.error(error?.response?.data?.message || t("bank.errorUpdate"));
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
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-foreground tracking-tight">{t("bank.title")}</h1>
                <p className="text-muted-foreground">{t("bank.subtitle")}</p>
            </div>

            <div className="bg-card text-card-foreground rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
                <div className="p-8 md:p-12">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Bank Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                <Building2 className="w-3 h-3" /> {t("bank.bankName")}
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.bankName}
                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                    className="w-full h-14 pl-5 pr-10 bg-muted/30 border border-border rounded-2xl font-bold text-foreground appearance-none focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none cursor-pointer"
                                    required
                                >
                                    <option value="" disabled className="bg-card text-foreground">{t("bank.selectBank")}</option>
                                    {banks?.map((bank) => (
                                        <option key={bank.id} value={bank.shortName} className="bg-card text-foreground">
                                            {bank.shortName} - {bank.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <CreditCard className="w-5 h-5 text-muted-foreground/50" />
                                </div>
                            </div>
                        </div>

                        {/* Account Number */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                <Hash className="w-3 h-3" /> {t("bank.accountNumber")}
                            </label>
                            <input
                                type="text"
                                value={formData.bankAccountNumber}
                                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                                placeholder={t("bank.accountNumberPlaceholder")}
                                className="w-full h-14 px-5 bg-muted/30 border border-border rounded-2xl font-bold text-foreground focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                required
                            />
                        </div>

                        {/* Account Name */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                <User className="w-3 h-3" /> {t("bank.accountName")}
                            </label>
                            <input
                                type="text"
                                value={formData.bankAccountName}
                                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value.toUpperCase() })}
                                placeholder="VIET THE TRUONG"
                                className="w-full h-14 px-5 bg-muted/30 border border-border rounded-2xl font-bold text-foreground focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                required
                            />
                            <p className="text-[10px] text-muted-foreground italic ml-1">{t("bank.accountNameHelp")}</p>
                        </div>

                        {/* Status Alert */}
                        {!user?.bankAccountNumber && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                <div className="text-sm text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                                    {t("bank.warningNotSet")}
                                </div>
                            </div>
                        )}

                        {user?.bankAccountNumber && (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                <div className="text-sm text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
                                    {t("bank.successSet")}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full h-16 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-6 h-6" />
                                    {t("bank.saveInfo")}
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
