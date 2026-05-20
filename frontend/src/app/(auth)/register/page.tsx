"use client";

import React, {useState} from "react";
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
    Eye,
    EyeOff,
    Activity,
    Loader2,
} from "lucide-react";
import Link from "next/link";

// --- Types ---
interface RegisterResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: string;
        email: string;
        fullName: string;
        role: "USER" | "ADMIN";
    };
}

// --- Validation Schema with Zod ---
const registerSchema = z
    .object({
        fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự").max(100, "Họ tên quá dài"),
        email: z.string().email("Vui lòng nhập email hợp lệ").max(150),
        phone: z
            .string()
            .regex(
                /^(0[3|5|7|8|9])[0-9]{8}$/,
                "Vui lòng nhập số điện thoại Việt Nam hợp lệ (10 số)"
            ),
        password: z
            .string()
            .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
            .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa")
            .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Mật khẩu xác nhận không khớp",
        path: ["confirmPassword"],
    });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const router = useRouter();

    // Auto-redirect if already logged in
    React.useEffect(() => {
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
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            fullName: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: RegisterFormValues) => {
        try {
            await axios.post<RegisterResponse>(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/register`,
                {
                    fullName: data.fullName,
                    email: data.email,
                    phone: data.phone,
                    password: data.password,
                }
            );

            toast.success("Tạo tài khoản thành công! Vui lòng đăng nhập.");

            // Redirect to login instead of auto-login
            router.push("/login");
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data as { message?: string | string[] };
                const errorMsg = errorData.message || "Đã xảy ra lỗi trong quá trình đăng ký.";

                if (Array.isArray(errorMsg)) {
                    toast.error(errorMsg[0]);
                } else {
                    toast.error(errorMsg);
                }
            } else {
                toast.error("Đã xảy ra lỗi không xác định.");
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Toaster position="top-right" reverseOrder={false}/>
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">

                <div className="bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
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
                        Đăng ký tài khoản để đặt sân ngay lập tức
                    </p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Họ và Tên
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400"/>
                                </div>
                                <input
                                    type="text"
                                    {...register("fullName")}
                                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                                        errors.fullName
                                            ? "border-red-500 focus:ring-red-200"
                                            : "border-slate-300 focus:border-cyan-500 focus:ring-cyan-100"
                                    }`}
                                    placeholder="John Doe"
                                />
                            </div>
                            {errors.fullName && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.fullName.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Địa chỉ Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Số điện thoại
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-5 w-5 text-slate-400"/>
                                </div>
                                <input
                                    type="tel"
                                    {...register("phone")}
                                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                                        errors.phone
                                            ? "border-red-500 focus:ring-red-200"
                                            : "border-slate-300 focus:border-cyan-500 focus:ring-cyan-100"
                                    }`}
                                    placeholder="0912345678"
                                />
                            </div>
                            {errors.phone && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.phone.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Xác nhận mật khẩu
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400"/>
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    {...register("confirmPassword")}
                                    className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                                        errors.confirmPassword
                                            ? "border-red-500 focus:ring-red-200"
                                            : "border-slate-300 focus:border-cyan-500 focus:ring-cyan-100"
                                    }`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-5 w-5"/>
                                    ) : (
                                        <Eye className="h-5 w-5"/>
                                    )}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"/>
                                    Đang xử lý...
                                </>
                            ) : (
                                "Đăng ký tài khoản"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center space-y-3">
                        <div className="py-2 px-4 bg-indigo-50 rounded-lg border border-indigo-100">
                            <p className="text-sm text-indigo-700">
                                Bạn là chủ sân?{" "}
                                <Link
                                    href="/admin/register"
                                    className="font-bold text-indigo-800 hover:text-indigo-600 underline transition-colors"
                                >
                                    Đăng ký quản trị tại đây
                                </Link>
                            </p>
                        </div>
                        <p className="text-sm text-slate-600">
                            Đã có tài khoản?{" "}
                            <Link
                                href="/login"
                                className="font-semibold text-cyan-600 hover:text-cyan-500 transition-colors"
                            >
                                Đăng nhập ngay
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
