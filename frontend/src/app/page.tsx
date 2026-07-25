"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center text-cyan-400 font-mono text-sm">
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/80 rounded-full border border-cyan-500/30 shadow-xl">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
        <span>REDIRECTING TO NOVA BOOKING...</span>
      </div>
    </div>
  );
}
