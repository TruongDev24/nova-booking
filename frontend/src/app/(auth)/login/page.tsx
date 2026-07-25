"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Activity,
  Loader2,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { authService } from "@/services/auth.service";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import { useAuthUI } from "@/context/auth-ui-context";

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

  const [activeField, setActiveField] = useState<string | null>(null);

  const { locale, t } = useLanguage();
  const { setFormState, setPasswordLength } = useAuthUI();

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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const emailVal = watch("email");

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setFormState("submitting");
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/login`,
        data
      );

      const { access_token, user } = response.data;
      Cookies.set("access_token", access_token, {
        path: "/",
        expires: 7,
        sameSite: "Lax",
      });
      sessionStorage.setItem("user", JSON.stringify(user));

      toast.success(
        locale === "vi"
          ? "Đăng nhập thành công! Đang chuyển hướng..."
          : "Login successful! Redirecting..."
      );

      const redirectTarget = user.role === "ADMIN" ? "/admin" : "/user";
      if (!user.bankAccountNumber && user.role !== "ADMIN") {
        toast(
          locale === "vi"
            ? "Vui lòng cập nhật thông tin ngân hàng trong trang cá nhân để thuận tiện cho việc hoàn tiền khi hủy sân."
            : "Please update your bank details in your profile for seamless refunds on cancellations.",
          {
            duration: 6000,
            icon: "🏦",
          }
        );
      }

      setTimeout(() => {
        window.location.href = redirectTarget;
      }, 600);
    } catch (error) {
      setFormState("idle");
      if (axios.isAxiosError(error)) {
        const errorMsg =
          error.response?.status === 401
            ? locale === "vi"
              ? "Email hoặc mật khẩu không chính xác"
              : "Invalid email or password"
            : error.response?.data?.message ||
              (locale === "vi"
                ? "Đã xảy ra lỗi trong quá trình đăng nhập."
                : "An error occurred during login.");

        toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
      } else {
        toast.error(
          locale === "vi"
            ? "Đã xảy ra lỗi không xác định."
            : "An unknown error occurred."
        );
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error(
        locale === "vi"
          ? "Vui lòng nhập địa chỉ email"
          : "Please enter your email address"
      );
      return;
    }
    try {
      setIsForgotLoading(true);
      await authService.forgotPassword({ email: forgotEmail });
      toast.success(
        locale === "vi"
          ? "Hướng dẫn đặt lại mật khẩu đã gửi vào email!"
          : "Password reset instructions sent to your email!"
      );
      setIsForgotMode(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message =
        err.response?.data?.message ||
        (locale === "vi"
          ? "Lỗi khi gửi link đặt lại mật khẩu"
          : "Failed to send reset link");
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsForgotLoading(false);
    }
  };

  const emailField = register("email");
  const passwordField = register("password");

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />

      <div className="w-full bg-card/85 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-500 relative group">
        {/* Visual accent top glowing line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 shadow-[0_0_12px_#06b6d4]"></div>

        {/* Header Section */}
        <div className="bg-slate-950/90 dark:bg-slate-950/70 px-6 py-8 text-center relative overflow-hidden border-b border-border/60">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-500/20 rounded-full opacity-40 blur-3xl"></div>
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-indigo-500/20 rounded-full opacity-40 blur-2xl"></div>

          <div className="flex justify-center items-center gap-2 mb-2 relative z-10">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              NOVA<span className="text-cyan-400 font-bold">-booking</span>
            </h1>
          </div>
          <p className="text-slate-400 text-xs font-semibold relative z-10">
            {isForgotMode
              ? locale === "vi"
                ? "Khôi phục truy cập tài khoản"
                : "Recover account access"
              : t("auth.loginToManage")}
          </p>
        </div>

        {/* Form Section */}
        <div className="p-8">
          {isForgotMode ? (
            <form key="forgot-password-form" onSubmit={handleForgotPassword} className="space-y-6">
              <button
                type="button"
                onClick={() => setIsForgotMode(false)}
                className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-all mb-2 cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {t("auth.backToLogin")}
              </button>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4.5 w-4.5 text-cyan-400/70" />
                  </div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    onFocus={() => setFormState("email_focus")}
                    onBlur={() => setFormState("idle")}
                    className="block w-full pl-10 pr-3 py-3 border border-border rounded-2xl bg-background/50 text-foreground text-sm font-medium focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 focus:bg-background focus:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300"
                    placeholder="hello@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isForgotLoading}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-cyan-500 via-primary to-indigo-600 hover:shadow-[0_0_25px_rgba(6,182,212,0.45)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 cursor-pointer relative overflow-hidden group"
              >
                {isForgotLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
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
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                  <span>{t("auth.email")}</span>
                  {emailVal && !errors.email && (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> READY
                    </span>
                  )}
                </label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors">
                    <Mail
                      className={`h-4.5 w-4.5 transition-colors duration-300 ${
                        activeField === "email"
                          ? "text-cyan-400 animate-pulse"
                          : "text-muted-foreground/60 group-hover/input:text-cyan-400/80"
                      }`}
                    />
                  </div>
                  <input
                    type="email"
                    {...emailField}
                    onFocus={() => {
                      setActiveField("email");
                      setFormState("email_focus");
                    }}
                    onBlur={(e) => {
                      emailField.onBlur(e);
                      setActiveField(null);
                      setFormState("idle");
                    }}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-2xl bg-background/50 text-foreground text-sm font-medium focus:ring-4 focus:bg-background transition-all duration-300 outline-none ${
                      errors.email
                        ? "border-red-500 focus:ring-red-500/20"
                        : "border-border hover:border-cyan-500/50 hover:bg-background/80 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)] focus:border-cyan-500 focus:ring-cyan-500/20 focus:shadow-[0_0_22px_rgba(6,182,212,0.25)]"
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
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition-all cursor-pointer"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors">
                    <Lock
                      className={`h-4.5 w-4.5 transition-colors duration-300 ${
                        activeField === "password"
                          ? "text-cyan-400 animate-pulse"
                          : "text-muted-foreground/60 group-hover/input:text-cyan-400/80"
                      }`}
                    />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    {...passwordField}
                    onFocus={() => {
                      setActiveField("password");
                      setFormState("password_typing");
                    }}
                    onChange={(e) => {
                      passwordField.onChange(e);
                      setPasswordLength(e.target.value.length);
                    }}
                    onBlur={(e) => {
                      passwordField.onBlur(e);
                      setActiveField(null);
                      setFormState("idle");
                    }}
                    className={`block w-full pl-10 pr-10 py-3 border rounded-2xl bg-background/50 text-foreground text-sm font-medium focus:ring-4 focus:bg-background transition-all duration-300 outline-none ${
                      errors.password
                        ? "border-red-500 focus:ring-red-500/20"
                        : "border-border hover:border-cyan-500/50 hover:bg-background/80 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)] focus:border-cyan-500 focus:ring-cyan-500/20 focus:shadow-[0_0_22px_rgba(6,182,212,0.25)]"
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-cyan-400 transition-colors focus:outline-none cursor-pointer"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-cyan-500 via-primary to-indigo-600 hover:shadow-[0_0_25px_rgba(6,182,212,0.45)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 cursor-pointer relative overflow-hidden group"
              >
                {/* Shimmer glaze overlay */}
                <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>

                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    {t("auth.authenticating")}
                  </>
                ) : (
                  <span className="flex items-center gap-2 relative z-10">
                    {t("auth.login")} <Sparkles className="w-4 h-4 text-cyan-200" />
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Footer Link */}
          <div className="mt-8 text-center space-y-4">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link
                href="/register"
                className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition-all"
              >
                {t("auth.registerNow")}
              </Link>
            </p>
            <div className="pt-4 border-t border-border/80">
              <p className="text-[10px] font-bold text-muted-foreground/85 uppercase tracking-wider">
                {locale === "vi" ? "Dành cho chủ sân:" : "For court owners:"}{" "}
                <Link
                  href="/admin/register"
                  className="font-black text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {t("auth.adminRegister")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
