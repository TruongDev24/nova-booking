"use client";

import React, { useState, useEffect } from "react";
import InteractiveShowcase from "@/components/auth/interactive-showcase";
import { Languages, Sun, Moon } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { useTheme } from "next-themes";
import { AuthUIProvider, useAuthUI } from "@/context/auth-ui-context";

function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const { locale, setLocale } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { formState, passwordLength } = useAuthUI();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen w-full relative bg-slate-950 text-foreground transition-colors duration-300 overflow-hidden select-none">
      
      {/* Background Canvas Layer (Spans 100% full screen behind both left and right sides) */}
      <div className="absolute inset-0 z-0">
        <InteractiveShowcase formState={formState} passwordLength={passwordLength} />
      </div>

      {/* Top Floating Toggles */}
      <div className="absolute top-5 right-5 z-50 flex items-center gap-2">
        <button
          onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-black tracking-widest uppercase bg-slate-900/80 backdrop-blur-md text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-full transition-all border border-cyan-500/30 cursor-pointer active:scale-95 shadow-lg"
        >
          <Languages className="w-3.5 h-3.5" />
          {locale}
        </button>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 text-slate-300 hover:text-white bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 rounded-full transition-all border border-slate-700/60 cursor-pointer active:scale-95 shadow-lg"
          aria-label="Toggle theme"
        >
          {mounted && theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
          )}
        </button>
      </div>

      {/* Foreground Container: Balanced Desktop Layout */}
      <div className="relative z-10 min-h-screen w-full flex flex-col lg:flex-row items-center justify-center lg:justify-end lg:pr-20 xl:pr-36 p-4 sm:p-8 pointer-events-none">
        
        {/* Right Floating Glass Form Container (Pushed Inward) */}
        <div className="w-full max-w-md lg:w-[420px] xl:w-[450px] flex flex-col items-center justify-center pointer-events-auto my-auto py-6">
          
          {/* Outer Ambient Glow Aura around Form Card */}
          <div className="w-full relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 via-indigo-500/30 to-purple-500/30 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition duration-1000 pointer-events-none"></div>

            {/* Inner Form Card Floating Container */}
            <div className="w-full relative z-10">
              {children}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthUIProvider>
      <AuthLayoutContent>{children}</AuthLayoutContent>
    </AuthUIProvider>
  );
}
