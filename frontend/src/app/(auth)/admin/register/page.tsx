"use client";

import React, { useState } from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import {toast, Toaster} from "react-hot-toast";
import {useRouter} from "next/navigation";
import Cookies from "js-cookie";
import {
    User,
    Mail,
    Phone,
    Lock,
    Activity,
    Key,
    Loader2,
    Eye,
    EyeOff
} from "lucide-react";
import {useLanguage} from "@/context/language-context";

// --- Types ---
interface RegisterResponse {
    access_token: string;
    user: {
        id: string;
        email: string;
        fullName: string;
        role: "USER" | "ADMIN";
    };
}

// --- Validation Schema with Zod ---
const adminRegisterSchema = z
    .object({
        fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
        email: z.string().email("Invalid email address"),
        phone: z.string().regex(/^(0[3|5|7|8|9])[0-9]{8}$/, "Invalid phone number"),
        password: z.string().min(8, "Min 8 chars").regex(/[A-Z]/).regex(/[0-9]/),
        confirmPassword: z.string(),
        secretKey: z.string().min(1, "Admin Secret Key is required"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type AdminRegisterFormValues = z.infer<typeof adminRegisterSchema>;

export default function AdminRegisterPage() {
    const router = useRouter();
    const {t, locale} = useLanguage();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting},
    } = useForm<AdminRegisterFormValues>({
        resolver: zodResolver(adminRegisterSchema),
        defaultValues: {
            fullName: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
            secretKey: "",
        },
    });

    const onSubmit = async (data: AdminRegisterFormValues) => {
        try {
            const response = await axios.post<RegisterResponse>(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/admin/register`,
                data
            );

            const token = response.data?.access_token;
            if (token) {
                Cookies.set("access_token", token, {path: "/", expires: 7, sameSite: "Lax"});
                sessionStorage.setItem("access_token", token);
                sessionStorage.setItem("user", JSON.stringify(response.data.user));
            }

            toast.success(locale === "vi" ? "Đăng ký tài khoản Admin thành công!" : "Admin account created successfully!");
            setTimeout(() => {
                window.location.href = "/admin";
            }, 1000);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || (locale === "vi" ? "Đăng ký thất bại" : "Registration failed"));
            } else {
                toast.error(locale === "vi" ? "Đã xảy ra lỗi không xác định." : "An unexpected error occurred.");
            }
        }
    };

    return (
        <>
            <Toaster position="top-right"/>
            <div className="w-full bg-card/70 dark:bg-card/40 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-border/80 transition-all duration-300 relative group">
                {/* Visual accent top line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-500"></div>

                <div className="bg-slate-950/90 dark:bg-slate-950/60 px-6 py-8 text-center relative overflow-hidden border-b border-border/60">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full opacity-35 blur-2xl"></div>
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-cyan-500/10 rounded-full opacity-35 blur-xl"></div>

                    <div className="flex justify-center items-center gap-2 mb-2 relative z-10">
                        <Activity className="w-8 h-8 text-primary"/>
                        <h1 className="text-2xl font-black text-white tracking-tight">
                            NOVA<span className="text-primary font-medium">-admin</span>
                        </h1>
                    </div>
                    <p className="text-slate-400 text-xs font-semibold relative z-10">
                        {locale === "vi" ? "Tạo tài khoản quản trị sân mới" : "Create a new administrator account"}
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                    {/* Secret Key */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            {locale === "vi" ? "Mã Xác Thực Admin (Secret Key)" : "Admin Secret Key"}
                        </label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground/60"/>
                            <input
                                type="password"
                                {...register("secretKey")}
                                className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-background/50 text-foreground text-sm font-medium focus:ring-2 focus:outline-none transition-all ${
                                    errors.secretKey
                                        ? "border-red-500 focus:ring-red-500/20"
                                        : "border-border focus:border-primary focus:ring-primary/20"
                                }`}
                                placeholder={locale === "vi" ? "Nhập mã bí mật" : "Enter Admin Secret"}
                            />
                        </div>
                        {errors.secretKey && (
                            <p className="mt-1.5 text-xs text-red-500 font-bold">
                                {errors.secretKey.message}
                            </p>
                        )}
                    </div>

                    {/* Full Name */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            {t("auth.fullName")}
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground/60"/>
                            <input
                                type="text"
                                {...register("fullName")}
                                className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-background/50 text-foreground text-sm font-medium focus:ring-2 focus:outline-none transition-all ${
                                    errors.fullName
                                        ? "border-red-500 focus:ring-red-500/20"
                                        : "border-border focus:border-primary focus:ring-primary/20"
                                }`}
                                placeholder="Admin Name"
                            />
                        </div>
                        {errors.fullName && (
                            <p className="mt-1.5 text-xs text-red-500 font-bold">
                                {errors.fullName.message}
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            {t("auth.email")}
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground/60"/>
                            <input
                                type="email"
                                {...register("email")}
                                className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-background/50 text-foreground text-sm font-medium focus:ring-2 focus:outline-none transition-all ${
                                    errors.email
                                        ? "border-red-500 focus:ring-red-500/20"
                                        : "border-border focus:border-primary focus:ring-primary/20"
                                }`}
                                placeholder="admin@nova.com"
                            />
                        </div>
                        {errors.email && (
                            <p className="mt-1.5 text-xs text-red-500 font-bold">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            {t("auth.phone")}
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground/60"/>
                            <input
                                type="tel"
                                {...register("phone")}
                                className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-background/50 text-foreground text-sm font-medium focus:ring-2 focus:outline-none transition-all ${
                                    errors.phone
                                        ? "border-red-500 focus:ring-red-500/20"
                                        : "border-border focus:border-primary focus:ring-primary/20"
                                }`}
                                placeholder="09xxxxxxx"
                            />
                        </div>
                        {errors.phone && (
                            <p className="mt-1.5 text-xs text-red-500 font-bold">
                                {errors.phone.message}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            {t("auth.password")}
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground/60"/>
                            <input
                                type={showPassword ? "text" : "password"}
                                {...register("password")}
                                className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl bg-background/50 text-foreground text-sm font-medium focus:ring-2 focus:outline-none transition-all ${
                                    errors.password
                                        ? "border-red-500 focus:ring-red-500/20"
                                        : "border-border focus:border-primary focus:ring-primary/20"
                                }`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="mt-1.5 text-xs text-red-500 font-bold">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            {t("auth.confirmPassword")}
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground/60"/>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                {...register("confirmPassword")}
                                className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl bg-background/50 text-foreground text-sm font-medium focus:ring-2 focus:outline-none transition-all ${
                                    errors.confirmPassword
                                        ? "border-red-500 focus:ring-red-500/20"
                                        : "border-border focus:border-primary focus:ring-primary/20"
                                }`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="mt-1.5 text-xs text-red-500 font-bold">
                                {errors.confirmPassword.message}
                            </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/15 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"/>
                                {t("auth.creatingAccount")}
                            </>
                        ) : (
                            t("auth.registerBtn")
                        )}
                    </button>
                </form>
            </div>
        </>
    );
}

