"use client";

import React, {useState, useEffect} from "react";
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
    Languages,
    Sun,
    Moon,
} from "lucide-react";
import Link from "next/link";
import {authService} from "@/services/auth.service";
import Cookies from "js-cookie";
import {useRouter} from "next/navigation";
import {useLanguage} from "@/context/language-context";
import {useTheme} from "next-themes";

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
    
    const {locale, setLocale, t} = useLanguage();
    const {theme, setTheme} = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
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
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/login`,
                data
            );

            const {access_token, refresh_token, user} = response.data;

            Cookies.set("access_token", access_token, {path: "/"});
            Cookies.set("refresh_token", refresh_token, {path: "/", expires: 7});
            
            sessionStorage.setItem("user", JSON.stringify(user));

            toast.success(locale === "vi" ? "Đăng nhập thành công! Đang chuyển hướng..." : "Login successful! Redirecting...");

            if (user.role === "ADMIN") {
                router.push("/admin");
            } else {
                if (!user.bankAccountNumber) {
                    toast(
                        locale === "vi" 
                            ? "Vui lòng cập nhật thông tin ngân hàng trong trang cá nhân để thuận tiện cho việc hoàn tiền khi hủy sân." 
                            : "Please update your bank details in your profile for seamless refunds on cancellations.", 
                        {
                            duration: 6000,
                            icon: '🏦',
                        }
                    );
                }
                router.push("/user");
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMsg = error.response?.status === 401
                    ? (locale === "vi" ? "Email hoặc mật khẩu không chính xác" : "Invalid email or password")
                    : error.response?.data?.message || (locale === "vi" ? "Đã xảy ra lỗi trong quá trình đăng nhập." : "An error occurred during login.");

                toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
            } else {
                toast.error(locale === "vi" ? "Đã xảy ra lỗi không xác định." : "An unknown error occurred.");
            }
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail) {
            toast.error(locale === "vi" ? "Vui lòng nhập địa chỉ email" : "Please enter your email address");
            return;
        }
        try {
            setIsForgotLoading(true);
            await authService.forgotPassword({email: forgotEmail});
            toast.success(locale === "vi" ? "Hướng dẫn đặt lại mật khẩu đã gửi vào email!" : "Password reset instructions sent to your email!");
            setIsForgotMode(false);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message || (locale === "vi" ? "Lỗi khi gửi link đặt lại mật khẩu" : "Failed to send reset link");
            toast.error(Array.isArray(message) ? message[0] : message);
        } finally {
            setIsForgotLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative transition-colors duration-300">
            <Toaster position="top-right" reverseOrder={false}/>
            
            {/* Top Right Float Toggles */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                    onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black tracking-widest uppercase bg-secondary hover:bg-primary/10 hover:text-primary rounded-full transition-all border border-border cursor-pointer active:scale-95"
                >
                    <Languages className="w-3.5 h-3.5"/>
                    {locale}
                </button>
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all border border-transparent cursor-pointer active:scale-95"
                    aria-label="Toggle theme"
                >
                    {mounted && theme === "dark" ? (
                        <Sun className="w-4 h-4 text-amber-500 fill-amber-500/25"/>
                    ) : (
                        <Moon className="w-4 h-4 text-indigo-500 fill-indigo-500/25"/>
                    )}
                </button>
            </div>

            <div className="w-full max-w-md bg-card rounded-3xl shadow-xl overflow-hidden border border-border transition-all duration-300">
                {/* Header Section */}
                <div className="bg-slate-950 dark:bg-slate-950 px-6 py-8 text-center relative overflow-hidden border-b border-border">
                    {/* Decorative Background Elements */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full opacity-30 blur-2xl"></div>
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-cyan-500/10 rounded-full opacity-30 blur-xl"></div>

                    <div className="flex justify-center items-center gap-2 mb-2 relative z-10">
                        <Activity className="w-8 h-8 text-primary"/>
                        <h1 className="text-2xl font-black text-white tracking-tight">
                            NOVA<span className="text-primary font-medium">-booking</span>
                        </h1>
                    </div>
                    <p className="text-slate-400 text-xs font-medium relative z-10">
                        {isForgotMode ? (locale === "vi" ? "Khôi phục truy cập tài khoản" : "Recover account access") : t("auth.loginToManage")}
                    </p>
                </div>

                {/* Form Section */}
                <div className="p-8">
                    {isForgotMode ? (
                        <form key="forgot-password-form" onSubmit={handleForgotPassword} className="space-y-6">
                            <button
                                type="button"
                                onClick={() => setIsForgotMode(false)}
                                className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all mb-2 cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4"/> {t("auth.backToLogin")}
                            </button>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                    {t("auth.email")}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-4.5 w-4.5 text-muted-foreground/60"/>
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                                        placeholder="hello@example.com"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isForgotLoading}
                                className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/15 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
                            >
                                {isForgotLoading ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"/>
                                        {t("auth.sending")}
                                    </>
                                ) : (
                                    t("auth.sendReset")
                                )}
                            </button>
                        </form>
                    ) : (
                        <form key="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Email Field */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                    {t("auth.email")}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-4.5 w-4.5 text-muted-foreground/60"/>
                                    </div>
                                    <input
                                        type="email"
                                        {...register("email")}
                                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-background text-foreground text-sm font-medium focus:ring-2 focus:outline-none transition-all ${
                                            errors.email
                                                ? "border-red-500 focus:ring-red-500/20"
                                                : "border-border focus:border-primary focus:ring-primary/20"
                                        }`}
                                        placeholder="hello@example.com"
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-1.5 text-xs text-red-500 font-bold">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {t("auth.password")}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotMode(true)}
                                        className="text-xs font-bold text-primary hover:underline transition-all cursor-pointer"
                                    >
                                        {t("auth.forgotPassword")}
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4.5 w-4.5 text-muted-foreground/60"/>
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        {...register("password")}
                                        className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl bg-background text-foreground text-sm font-medium focus:ring-2 focus:outline-none transition-all ${
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
                                            <EyeOff className="h-4 w-4"/>
                                        ) : (
                                            <Eye className="h-4 w-4"/>
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1.5 text-xs text-red-500 font-bold">
                                        {errors.password.message}
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
                                        {t("auth.authenticating")}
                                    </>
                                ) : (
                                    t("auth.login")
                                )}
                            </button>
                        </form>
                    )}

                    {/* Footer Link */}
                    <div className="mt-8 text-center space-y-4">
                        <p className="text-xs font-medium text-muted-foreground">
                            {t("auth.noAccount")}{" "}
                            <Link
                                href="/register"
                                className="font-bold text-primary hover:underline transition-all"
                            >
                                {t("auth.registerNow")}
                            </Link>
                        </p>
                        <div className="pt-4 border-t border-border">
                            <p className="text-[10px] font-bold text-muted-foreground/85 uppercase tracking-wider">
                                {locale === "vi" ? "Dành cho chủ sân:" : "For court owners:"}{" "}
                                <Link
                                    href="/admin/register"
                                    className="font-black text-cyan-600 hover:text-cyan-500 transition-colors"
                                >
                                    {t("auth.adminRegister")}
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

