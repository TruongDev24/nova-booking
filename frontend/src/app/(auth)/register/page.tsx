"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
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
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import { useAuthUI } from "@/context/auth-ui-context";

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
  const { t, locale } = useLanguage();
  const { setFormState, setPasswordLength } = useAuthUI();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
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
    formState: { errors, isSubmitting },
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
      setFormState("submitting");
      await axios.post<RegisterResponse>(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/register`,
        {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          password: data.password,
        }
      );

      toast.success(t("auth.registerSuccess"));
      router.push("/login");
    } catch (error: unknown) {
      setFormState("idle");
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as { message?: string | string[] };
        const errorMsg =
          errorData.message ||
          (locale === "vi"
            ? "Đã xảy ra lỗi trong quá trình đăng ký."
            : "An error occurred during registration.");

        if (Array.isArray(errorMsg)) {
          toast.error(errorMsg[0]);
        } else {
          toast.error(errorMsg);
        }
      } else {
        toast.error(
          locale === "vi"
            ? "Đã xảy ra lỗi không xác định."
            : "An unknown error occurred."
        );
      }
    }
  };

  const nameField = register("fullName");
  const emailField = register("email");
  const phoneField = register("phone");
  const passwordField = register("password");
  const confirmPasswordField = register("confirmPassword");

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <div className="w-full bg-card/85 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-500 relative group">
        {/* Visual accent top glowing line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 shadow-[0_0_12px_#06b6d4]"></div>

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
            {t("auth.registerToBook")}
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                {t("auth.fullName")}
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors">
                  <User
                    className={`h-4.5 w-4.5 transition-colors duration-300 ${
                      activeField === "fullName"
                        ? "text-cyan-400 animate-pulse"
                        : "text-muted-foreground/60 group-hover/input:text-cyan-400/80"
                    }`}
                  />
                </div>
                <input
                  type="text"
                  {...nameField}
                  onFocus={() => setActiveField("fullName")}
                  onBlur={(e) => {
                    nameField.onBlur(e);
                    setActiveField(null);
                  }}
                  className={`block w-full pl-10 pr-3 py-2.5 border rounded-2xl bg-background/50 text-foreground text-sm font-medium focus:ring-4 focus:bg-background transition-all duration-300 outline-none ${
                    errors.fullName
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-border hover:border-cyan-500/50 hover:bg-background/80 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)] focus:border-cyan-500 focus:ring-cyan-500/20 focus:shadow-[0_0_22px_rgba(6,182,212,0.25)]"
                  }`}
                  placeholder="John Doe"
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-500 font-bold">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                {t("auth.email")}
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
                  className={`block w-full pl-10 pr-3 py-2.5 border rounded-2xl bg-background/50 text-foreground text-sm font-medium focus:ring-4 focus:bg-background transition-all duration-300 outline-none ${
                    errors.email
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-border hover:border-cyan-500/50 hover:bg-background/80 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)] focus:border-cyan-500 focus:ring-cyan-500/20 focus:shadow-[0_0_22px_rgba(6,182,212,0.25)]"
                  }`}
                  placeholder="hello@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 font-bold">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                {t("auth.phone")}
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors">
                  <Phone
                    className={`h-4.5 w-4.5 transition-colors duration-300 ${
                      activeField === "phone"
                        ? "text-cyan-400 animate-pulse"
                        : "text-muted-foreground/60 group-hover/input:text-cyan-400/80"
                    }`}
                  />
                </div>
                <input
                  type="tel"
                  {...phoneField}
                  onFocus={() => setActiveField("phone")}
                  onBlur={(e) => {
                    phoneField.onBlur(e);
                    setActiveField(null);
                  }}
                  className={`block w-full pl-10 pr-3 py-2.5 border rounded-2xl bg-background/50 text-foreground text-sm font-medium focus:ring-4 focus:bg-background transition-all duration-300 outline-none ${
                    errors.phone
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-border hover:border-cyan-500/50 hover:bg-background/80 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)] focus:border-cyan-500 focus:ring-cyan-500/20 focus:shadow-[0_0_22px_rgba(6,182,212,0.25)]"
                  }`}
                  placeholder="0912345678"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-red-500 font-bold">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                {t("auth.password")}
              </label>
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
                  className={`block w-full pl-10 pr-10 py-2.5 border rounded-2xl bg-background/50 text-foreground text-sm font-medium focus:ring-4 focus:bg-background transition-all duration-300 outline-none ${
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
                <p className="mt-1 text-xs text-red-500 font-bold">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                {t("auth.confirmPassword")}
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors">
                  <Lock
                    className={`h-4.5 w-4.5 transition-colors duration-300 ${
                      activeField === "confirmPassword"
                        ? "text-cyan-400 animate-pulse"
                        : "text-muted-foreground/60 group-hover/input:text-cyan-400/80"
                    }`}
                  />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  {...confirmPasswordField}
                  onFocus={() => setActiveField("confirmPassword")}
                  onBlur={(e) => {
                    confirmPasswordField.onBlur(e);
                    setActiveField(null);
                  }}
                  className={`block w-full pl-10 pr-10 py-2.5 border rounded-2xl bg-background/50 text-foreground text-sm font-medium focus:ring-4 focus:bg-background transition-all duration-300 outline-none ${
                    errors.confirmPassword
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-border hover:border-cyan-500/50 hover:bg-background/80 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)] focus:border-cyan-500 focus:ring-cyan-500/20 focus:shadow-[0_0_22px_rgba(6,182,212,0.25)]"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-cyan-400 transition-colors focus:outline-none cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500 font-bold">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-cyan-500 via-primary to-indigo-600 hover:shadow-[0_0_25px_rgba(6,182,212,0.45)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 cursor-pointer relative overflow-hidden group mt-2"
            >
              {/* Shimmer glaze overlay */}
              <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>

              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                  {t("auth.creatingAccount")}
                </>
              ) : (
                <span className="flex items-center gap-2 relative z-10">
                  {t("auth.registerBtn")} <Sparkles className="w-4 h-4 text-cyan-200" />
                </span>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-6 text-center">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link
                href="/login"
                className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition-all"
              >
                {t("auth.loginNow")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
