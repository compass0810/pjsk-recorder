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
    const isEmergency = maintenance.type === "emergency";
    
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-50 flex items-center justify-center p-6 lg:p-12 overflow-hidden">
        {/* 背景の装飾 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-cyan-200/40 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-200/40 blur-[120px] rounded-full" />
        </div>
        
        <div className="max-w-2xl w-full bg-white/70 backdrop-blur-3xl border border-white rounded-[3rem] p-10 lg:p-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] flex flex-col items-center text-center relative animate-fade-in-up">
          
          {/* アイコン部分 (タイプによって色を変更) */}
          <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white text-5xl mb-10 shadow-2xl transition-all duration-500 animate-pulse ${
            isEmergency ? "bg-rose-500 shadow-rose-200" : "bg-cyan-500 shadow-cyan-200"
          }`}>
            ⚠️
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-black text-slate-800 mb-6 tracking-tighter uppercase leading-tight">
            System <br />
            <span className={isEmergency ? "text-rose-500" : "text-cyan-600"}>Maintenance</span>
          </h1>
          
          <div className="bg-slate-50/50 border border-white rounded-[2rem] p-8 mb-10 w-full text-left shadow-inner">
            <h2 className={`font-black text-[10px] uppercase tracking-widest mb-4 ${isEmergency ? "text-rose-400" : "text-cyan-500"}`}>
              {isEmergency ? "Emergency Maintenance" : "Regular Maintenance"}
            </h2>
            <p className="text-slate-600 font-bold text-lg leading-relaxed mb-6">
              {maintenance.reason || "現在、システムメンテナンスを行っております。"}
            </p>
            
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white text-[10px]">
               <div>
                  <span className="text-slate-400 font-black block mb-1 uppercase tracking-tighter">Start Time</span>
                  <span className="text-slate-600 font-bold text-sm tracking-widest">{maintenance.start || "---"}</span>
               </div>
               <div>
                  <span className="text-slate-400 font-black block mb-1 uppercase tracking-tighter">Expected End</span>
                  <span className="text-slate-600 font-bold text-sm tracking-widest">{maintenance.end || "順次復旧予定"}</span>
               </div>
            </div>
          </div>
          
          <p className="text-slate-400 font-bold text-xs">
            ご不便をおかけしますが、しばらくお待ちください。<br/>
            © 2026 PJSK Recorder Team
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
