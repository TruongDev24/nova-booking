"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { toast, Toaster } from "react-hot-toast";
import { Lock, Eye, EyeOff, Activity, Loader2, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
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
      toast.error("Mã xác thực không hợp lệ hoặc đã hết hạn.");
      setTimeout(() => router.push("/login"), 3000);
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setIsLoading(true);
      await authService.resetPassword({ token: token as string, newPassword });
      toast.success("Đổi mật khẩu thành công!");
      setIsSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err.response?.data?.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.";
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Thành công!</h2>
        <p className="text-slate-600">Mật khẩu của bạn đã được cập nhật. Đang chuyển hướng về trang đăng nhập...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 outline-none transition-all"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !token}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
            Đang xử lý...
          </>
        ) : (
          "Cập nhật mật khẩu"
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 px-6 py-8 text-center relative">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Activity className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white uppercase tracking-wider">
              Thiết lập lại mật khẩu
            </h1>
          </div>
          <p className="text-slate-400 text-sm italic">
            Nhập mật khẩu mới cho tài khoản của bạn
          </p>
        </div>

        <div className="p-8">
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="animate-spin w-8 h-8 text-cyan-600" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
