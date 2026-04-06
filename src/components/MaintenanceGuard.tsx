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

  const handleAdminLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  if (maintenance?.active && !isAdmin) {
    const isEmergency = maintenance.type === "emergency";
    
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-50/80 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col items-center text-center animate-fade-in-up">
          
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl mb-6 shadow-lg ${
            isEmergency ? "bg-rose-400 shadow-rose-100" : "bg-cyan-400 shadow-cyan-100"
          }`}>
            ⚠️
          </div>
          
          <h1 className="text-2xl font-black text-slate-800 mb-2 tracking-tighter">
            {isEmergency ? "緊急メンテナンス中" : "メンテナンス中"}
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">System Maintenance</p>
          
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 w-full text-left">
            <p className="text-slate-600 font-bold text-sm leading-relaxed mb-4">
              {maintenance.reason || "現在、メンテナンスを行っております。ご不便をおかけして申し訳ありません。"}
            </p>
            
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 text-[9px] font-bold">
               <div className="flex justify-between">
                  <span className="text-slate-400 uppercase tracking-widest">開始時刻</span>
                  <span className="text-slate-600">{maintenance.start || "---"}</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-slate-400 uppercase tracking-widest">終了予定</span>
                  <span className="text-slate-600 font-black">{maintenance.end || "順次復旧予定"}</span>
               </div>
            </div>
          </div>
          
          <div className="space-y-6 w-full">
            <p className="text-slate-400 font-bold text-[10px]">しばらく経ってから再度お試しください</p>
            
            <div className="pt-6 border-t border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Administrator Access</p>
              <button
                onClick={handleAdminLogin}
                className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-black text-[11px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-2"
              >
                管理者としてログイン
              </button>
            </div>

            <p className="text-slate-300 font-bold text-[8px]">© 2026 PJSK Recorder Team</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
