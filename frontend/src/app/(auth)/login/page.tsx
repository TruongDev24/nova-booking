"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Activity,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";

// --- Validation Schema with Zod ---
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
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

      const { access_token, user } = response.data;

      // Save token to both localStorage and Cookies (for Middleware compatibility)
      localStorage.setItem("access_token", access_token);
      Cookies.set("access_token", access_token, { expires: 1 }); // 1 day

      toast.success("Login successful! Redirecting...");

      // Role-based redirection
      setTimeout(() => {
        if (user.role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/user");
        }
      }, 1500);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Login Backend Error Details:", error.response?.data || error);
        
        const errorMsg = error.response?.status === 401 
          ? "Invalid email or password" 
          : error.response?.data?.message || "Something went wrong during login.";

        // Handle array messages from class-validator if any
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
        
        {/* Header Section */}
        <div className="bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500 rounded-full opacity-10 blur-2xl"></div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-cyan-500 rounded-full opacity-10 blur-xl"></div>
          
          <div className="flex justify-center items-center gap-2 mb-2 relative z-10">
            <Activity className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              NOVA<span className="text-cyan-400">-booking</span>
            </h1>
          </div>
          <p className="text-slate-400 text-sm relative z-10">
            Sign in to manage your court bookings
          </p>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
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

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link href="#" className="text-xs font-semibold text-cyan-600 hover:text-cyan-500 transition-colors">
                  Forgot password?
                </Link>
              </div>
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-cyan-600 hover:text-cyan-500 transition-colors"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
