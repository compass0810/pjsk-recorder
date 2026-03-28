"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState<{ active: boolean; start: string; end: string; type: string; reason: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkStatus();
    // 30秒ごとにステータスをチェック
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const [m, { data: { user } }] = await Promise.all([
        db.admin.getMaintenance(),
        supabase.auth.getUser()
      ]);

      setMaintenance(m);

      if (user) {
        const profile = await db.profile.get();
        setIsAdmin(!!profile?.is_admin);
      } else {
        setIsAdmin(false);
      }
    } catch (e) {
      console.error("Maintenance check failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <>{children}</>;

  if (maintenance?.active && !isAdmin) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-6 lg:p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/micro-carbon.png')]" />
        
        <div className="max-w-2xl w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[3rem] p-10 lg:p-16 shadow-2xl flex flex-col items-center text-center relative animate-fade-in-up">
          <div className="w-24 h-24 bg-amber-500 rounded-[2rem] flex items-center justify-center text-white text-5xl mb-10 shadow-lg shadow-amber-500/30 animate-pulse">
            ⚠️
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tighter uppercase leading-tight">
            Under Maintenance
          </h1>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-10 w-full text-left">
            <h2 className="text-amber-400 font-black text-xs uppercase tracking-widest mb-4">Maintenance Details</h2>
            <p className="text-slate-100 font-bold text-lg leading-relaxed mb-6">
              {maintenance.reason || "現在、システムメンテナンスを行っております。"}
            </p>
            
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10 text-xs">
               <div>
                  <span className="text-slate-400 font-black block mb-1 uppercase tracking-tighter">Start Time</span>
                  <span className="text-white font-mono font-bold text-sm tracking-widest">{maintenance.start || "---"}</span>
               </div>
               <div>
                  <span className="text-slate-400 font-black block mb-1 uppercase tracking-tighter">End Time</span>
                  <span className="text-white font-mono font-bold text-sm tracking-widest">{maintenance.end || "順次復旧予定"}</span>
               </div>
            </div>
          </div>
          
          <p className="text-slate-400 font-bold text-sm italic">
            ご不便をおかけしますが、しばらくお待ちください。<br/>
            © 2026 PJSK Recorder Development Team
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
