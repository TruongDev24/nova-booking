"use client";

import React, {useState, useEffect, Suspense} from "react";
import {useSearchParams, useRouter} from "next/navigation";
import {authService} from "@/services/auth.service";
import {toast, Toaster} from "react-hot-toast";
import {Lock, Eye, EyeOff, Activity, Loader2, CheckCircle2} from "lucide-react";

function ResetPasswordForm({ t, locale }: { t: (key: string) => string; locale: string }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error(locale === "vi" ? "Mã xác thực không hợp lệ hoặc đã hết hạn." : "Verification token is invalid or expired.");
            setTimeout(() => router.push("/login"), 3000);
        }
    }, [token, router, locale]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 8) {
            toast.error(locale === "vi" ? "Mật khẩu phải có ít nhất 8 ký tự." : "Password must be at least 8 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error(locale === "vi" ? "Mật khẩu xác nhận không khớp." : "Confirm password does not match.");
            return;
        }

        try {
            setIsLoading(true);
            await authService.resetPassword({token: token as string, newPassword});
            toast.success(locale === "vi" ? "Đổi mật khẩu thành công!" : "Password updated successfully!");
            setIsSuccess(true);
            setTimeout(() => router.push("/login"), 3000);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message || (locale === "vi" ? "Không thể đặt lại mật khẩu. Vui lòng thử lại." : "Could not reset password. Please try again.");
            toast.error(Array.isArray(message) ? message[0] : message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center space-y-4 py-8">
                <div className="flex justify-center">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce"/>
                </div>
                <h2 className="text-2xl font-black text-foreground">{locale === "vi" ? "Thành công!" : "Success!"}</h2>
                <p className="text-muted-foreground text-sm font-medium">
                    {locale === "vi" 
                        ? "Mật khẩu của bạn đã được cập nhật. Đang chuyển hướng về trang đăng nhập..." 
                        : "Your password has been updated. Redirecting to login page..."}
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        {locale === "vi" ? "Mật khẩu mới" : "New Password"}
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-4.5 w-4.5 text-muted-foreground/60"/>
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={8}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="block w-full pl-10 pr-10 py-2.5 border border-border rounded-xl bg-background/50 text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        {t("auth.confirmPassword")}
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-4.5 w-4.5 text-muted-foreground/60"/>
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="block w-full pl-10 pr-10 py-2.5 border border-border rounded-xl bg-background/50 text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/15 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"/>
                        {t("auth.sending")}
                    </>
                ) : (
                    locale === "vi" ? "Cập nhật mật khẩu" : "Update Password"
                )}
            </button>
        </form>
    );
}

import {useLanguage} from "@/context/language-context";

export default function ResetPasswordPage() {
    const {t, locale} = useLanguage();

    return (
        <>
            <Toaster position="top-center"/>
            <div className="w-full bg-card/70 dark:bg-card/40 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-border/80 transition-all duration-300 relative group">
                {/* Visual accent top line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-500"></div>

                <div className="bg-slate-950/90 dark:bg-slate-950/60 px-6 py-8 text-center relative overflow-hidden border-b border-border/60">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full opacity-35 blur-2xl"></div>
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-cyan-500/10 rounded-full opacity-35 blur-xl"></div>

                    <div className="flex justify-center items-center gap-2 mb-2 relative z-10">
                        <Activity className="w-8 h-8 text-primary"/>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                            NOVA<span className="text-primary font-medium">-booking</span>
                        </h1>
                    </div>
                    <p className="text-slate-400 text-xs font-semibold relative z-10">
                        {locale === "vi" ? "Thiết lập lại mật khẩu tài khoản" : "Reset your account password"}
                    </p>
                </div>

                <div className="p-8">
                    <Suspense fallback={
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin w-8 h-8 text-primary"/>
                        </div>
                    }>
                        <ResetPasswordForm t={t} locale={locale}/>
                    </Suspense>
                </div>
            </div>
        </>
    );
}
