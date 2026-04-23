import React from "react";
import { User, Phone, Mail, Camera, Save, ShieldCheck } from "lucide-react";

export default function UserProfilePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Hồ sơ của tôi</h1>
        <p className="text-slate-500">Quản lý thông tin cá nhân và bảo mật tài khoản.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Profile Header Background */}
        <div className="h-32 bg-gradient-to-r from-cyan-500 to-indigo-600 relative">
           <div className="absolute -bottom-12 left-8">
              <div className="relative group">
                 <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-xl">
                    <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                       <User className="w-12 h-12" />
                    </div>
                 </div>
                 <button className="absolute bottom-0 right-0 p-2 bg-white rounded-lg shadow-md border border-slate-100 text-slate-600 hover:text-cyan-600 transition-all">
                    <Camera className="w-4 h-4" />
                 </button>
              </div>
           </div>
        </div>

        <div className="pt-16 p-8 space-y-8">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                 <User className="w-4 h-4" /> Họ và tên
              </label>
              <input 
                type="text" 
                defaultValue="Trường Lê" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-medium text-slate-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                 <Phone className="w-4 h-4" /> Số điện thoại
              </label>
              <input 
                type="tel" 
                defaultValue="0339050379" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-medium text-slate-900"
              />
            </div>
            <div className="col-span-1 md:col-span-2 space-y-1.5">
              <label className="text-sm font-bold text-slate-400 ml-1 flex items-center gap-2">
                 <Mail className="w-4 h-4" /> Email (Không thể thay đổi)
              </label>
              <input 
                type="email" 
                defaultValue="truong.dev@example.com" 
                disabled 
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
             <div className="flex items-center gap-2 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Tài khoản đã xác thực</span>
             </div>
             <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-slate-900/10">
                <Save className="w-5 h-5" />
                Lưu thay đổi
             </button>
          </div>
        </div>
      </div>

      {/* Security Tip Card */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white flex items-center justify-between overflow-hidden relative">
         <div className="relative z-10">
            <h4 className="font-bold mb-1">Cần đổi mật khẩu?</h4>
            <p className="text-xs text-slate-400">Hãy cập nhật mật khẩu thường xuyên để bảo vệ tài khoản.</p>
         </div>
         <button className="relative z-10 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-all backdrop-blur-sm">
            Đổi mật khẩu
         </button>
         <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500 rounded-full blur-[60px] opacity-20 -mr-16 -mt-16"></div>
      </div>
    </div>
  );
}
