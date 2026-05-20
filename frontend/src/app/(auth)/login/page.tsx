"use client";

import React, {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import {toast, Toaster} from "react-hot-toast";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    Activity,
    Loader2,
    ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import {authService} from "@/services/auth.service";
import Cookies from "js-cookie";
import {useRouter} from "next/navigation";
import {useEffect} from "react";

// --- Validation Schema with Zod ---
const loginSchema = z.object({
    email: z.string().email("Vui lòng nhập email hợp lệ").min(1, "Email không được để trống"),
    password: z.string().min(1, "Mật khẩu không được để trống"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [isForgotLoading, setIsForgotLoading] = useState(false);

    // Auto-redirect if already logged in
    useEffect(() => {
        const token = Cookies.get("access_token");
        if (token && token !== "undefined") {
            const userStr = sessionStorage.getItem("user");
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user.role === "ADMIN") {
                        router.push("/admin");
                    } else {
                        router.push("/user");
                    }
                } catch {
                    // Ignore parse error
                }
            }
        }
    }, [router]);

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting},
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginFormValues) => {
        // ... same as before
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/login`,
                data
            );

            const {access_token, refresh_token, user} = response.data;

            // Store tokens in Cookies for Middleware and Interceptors
            Cookies.set("access_token", access_token, {path: "/"});
            Cookies.set("refresh_token", refresh_token, {path: "/", expires: 7}); // RT lasts 7 days
            
            // Store user info in sessionStorage for fast UI access
            sessionStorage.setItem("user", JSON.stringify(user));

            toast.success("Đăng nhập thành công! Đang chuyển hướng...");

            // Use router.push for smooth client-side transition without reload
            if (user.role === "ADMIN") {
                router.push("/admin");
            } else {
                if (!user.bankAccountNumber) {
                    toast("Vui lòng cập nhật thông tin ngân hàng trong trang cá nhân để thuận tiện cho việc hoàn tiền khi hủy sân.", {
                        duration: 6000,
                        icon: '🏦',
                    });
                }
                router.push("/user");
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMsg = error.response?.status === 401
                    ? "Email hoặc mật khẩu không chính xác"
                    : error.response?.data?.message || "Đã xảy ra lỗi trong quá trình đăng nhập.";

                toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
            } else {
                toast.error("Đã xảy ra lỗi không xác định.");
            }
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail) {
            toast.error("Please enter your email address");
            return;
        }
        try {
            setIsForgotLoading(true);
            await authService.forgotPassword({email: forgotEmail});
            toast.success("Password reset instructions sent to your email!");
            setIsForgotMode(false);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message || "Failed to send reset link";
            toast.error(Array.isArray(message) ? message[0] : message);
        } finally {
            setIsForgotLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Toaster position="top-right" reverseOrder={false}/>
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">

                {/* Header Section */}
                <div className="bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div
                        className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500 rounded-full opacity-10 blur-2xl"></div>
                    <div
                        className="absolute -bottom-8 -left-8 w-24 h-24 bg-cyan-500 rounded-full opacity-10 blur-xl"></div>

                    <div className="flex justify-center items-center gap-2 mb-2 relative z-10">
                        <Activity className="w-8 h-8 text-cyan-400"/>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            NOVA<span className="text-cyan-400">-booking</span>
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm relative z-10">
                        {isForgotMode ? "Khôi phục truy cập tài khoản" : "Đăng nhập để quản lý lịch đặt sân của bạn"}
                    </p>
                </div>

                {/* Form Section */}
                <div className="p-8">
                    {isForgotMode ? (
                        <form key="forgot-password-form" onSubmit={handleForgotPassword} className="space-y-6">
                            <button
                                type="button"
                                onClick={() => setIsForgotMode(false)}
                                className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors mb-2"
                            >
                                <ArrowLeft className="w-4 h-4"/> Quay lại đăng nhập
                            </button>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Địa chỉ Email
                                </label>
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400"/>
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 focus:outline-none transition-colors"
                                        placeholder="Nhập email đã đăng ký"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isForgotLoading}
                                className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                            >
                                {isForgotLoading ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"/>
                                        Đang gửi yêu cầu...
                                    </>
                                ) : (
                                    "Gửi hướng dẫn đặt lại mật khẩu"
                                )}
                            </button>
                        </form>
                    ) : (
                        <form key="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Email Field */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400"/>
                                    </div>
                                    <input
                                        type="email"
                                        {...register("email")}
                                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                                            errors.email
                                                ? "border-red-500 focus:ring-red-200"
                                                : "border-slate-300 focus:border-cyan-500 focus:ring-cyan-100"
                                        }`}
                                        placeholder="hello@example.com"
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-slate-700">
                                        Mật khẩu
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotMode(true)}
                                        className="text-xs font-semibold text-cyan-600 hover:text-cyan-500 transition-colors"
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </div>
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400"/>
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        {...register("password")}
                                        className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                                            errors.password
                                                ? "border-red-500 focus:ring-red-200"
                                                : "border-slate-300 focus:border-cyan-500 focus:ring-cyan-100"
                                        }`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5"/>
                                        ) : (
                                            <Eye className="h-5 w-5"/>
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"/>
                                        Đang xác thực...
                                    </>
                                ) : (
                                    "Đăng nhập"
                                )}
                            </button>
                        </form>
                    )}

                    {/* Footer Link */}
                    <div className="mt-8 text-center space-y-4">
                        <p className="text-sm text-slate-600">
                            Chưa có tài khoản?{" "}
                            <Link
                                href="/register"
                                className="font-semibold text-cyan-600 hover:text-cyan-500 transition-colors"
                            >
                                Đăng ký ngay
                            </Link>
                        </p>
                        <div className="pt-4 border-t border-slate-100">
                            <p className="text-xs text-slate-500">
                                Dành cho chủ sân:{" "}
                                <Link
                                    href="/admin/register"
                                    className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                                >
                                    Đăng ký tài khoản Admin
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
