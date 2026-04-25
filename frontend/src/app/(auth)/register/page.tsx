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
} from "lucide-react";
import Link from "next/link";

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
const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters").max(100, "Full name is too long"),
    email: z.string().email("Please enter a valid email address").max(150),
    phone: z
      .string()
      .regex(
        /^(0[3|5|7|8|9])[0-9]{8}$/,
        "Please enter a valid 10-digit Vietnam phone number"
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
      .regex(/[0-9]/, "Password must contain at least 1 number"),
    confirmPassword: z.string(),
    role: z.enum(["USER", "ADMIN"], {
          message: "Role must be USER or ADMIN"
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "USER",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const response = await axios.post<RegisterResponse>(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/register`,
        {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: data.role,
        }
      );

      // Save token to Cookies for middleware compatibility
      const token = response.data?.access_token;
      const user = response.data?.user;
      const userRole = user?.role || data.role; // Fallback to form role

      if (token) {
        Cookies.set("access_token", token, { path: "/" });
        sessionStorage.setItem("access_token", token);
        if (user) {
          sessionStorage.setItem("user", JSON.stringify(user));
        }
      }

      toast.success("Account created successfully!");
      
      // Redirect based on role
      setTimeout(() => {
        if (userRole === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/user");
        }
      }, 1500);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as { message?: string | string[] };
        const errorMsg = errorData.message || "Something went wrong during registration.";
        
        if (Array.isArray(errorMsg)) {
          toast.error(errorMsg[0]);
        } else {
          toast.error(errorMsg);
        }
      } else {
        toast.error("An unexpected error occurred.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Toaster position="top-right" reverseOrder={false} />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        
        <div className="bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500 rounded-full opacity-10 blur-2xl"></div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-cyan-500 rounded-full opacity-10 blur-xl"></div>
          
          <div className="flex justify-center items-center gap-2 mb-2 relative z-10">
            <Activity className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              NOVA<span className="text-cyan-400">-booking</span>
            </h1>
          </div>
          <p className="text-slate-400 text-sm relative z-10">
            Create your account to book sports courts instantly
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="bg-slate-50 p-1.5 rounded-xl flex gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setValue("role", "USER")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                  selectedRole === "USER"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Người chơi (USER)
              </button>
              <button
                type="button"
                onClick={() => setValue("role", "ADMIN")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                  selectedRole === "ADMIN"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Chủ sân (ADMIN)
              </button>
            </div>
            {errors.role && (
              <p className="text-xs text-red-500 text-center">{errors.role.message}</p>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
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
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
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
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
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
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
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
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
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
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
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
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
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
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                  Processing...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-cyan-600 hover:text-cyan-500 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
