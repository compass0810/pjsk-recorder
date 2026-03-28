"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [stats, setStats] = useState({ userCount: 0, resultCount: 0, rankMatchCount: 0, bugCount: 0 });
  const [maintenance, setMaintenance] = useState({ active: false, start: "", end: "", type: "regular", reason: "" });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);

    if (user) {
      const profile = await db.profile.get();
      if (profile?.is_admin) {
        setIsAdmin(true);
        const [s, m] = await Promise.all([
          db.admin.getStats(),
          db.admin.getMaintenance()
        ]);
        setStats(s);
        setMaintenance(m);
      }
    }
    setIsLoading(false);
  };

  const handleUpdateMaintenance = async () => {
    try {
      await db.admin.setMaintenance(maintenance);
      setToastMessage("システム設定を更新しました。");
      setIsConfirmModalOpen(false);
    } catch (e) {
      setToastMessage("エラーが発生しました。");
    }
    setTimeout(() => setToastMessage(""), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2rem] text-center max-w-md shadow-xl animate-fade-in-up">
           <h2 className="text-2xl font-black text-rose-500 mb-4 tracking-tighter">ACCESS DENIED</h2>
           <p className="text-slate-500 font-bold leading-relaxed">このページにアクセスする権限がありません。<br/>開発者アカウントでログインしてください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen p-6 lg:p-10 gap-10 bg-slate-50 pb-20">
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] animate-fade-in-up">
          <div className="bg-white/90 backdrop-blur shadow-2xl border-l-4 border-cyan-500 p-4 rounded-xl flex items-center gap-3">
            <span className="text-cyan-500 font-black">✓</span>
            <span className="font-bold text-slate-700">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 左側: Analytics */}
      <div className="w-1/3 flex flex-col gap-6">
        <div className="p-8 bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white">
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter mb-6">Database Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Total Users", val: stats.userCount, color: "bg-blue-50 text-blue-500", icon: "👥" },
              { label: "Play Results", val: stats.resultCount, color: "bg-purple-50 text-purple-500", icon: "📊" },
              { label: "RankMatch", val: stats.rankMatchCount, color: "bg-amber-50 text-amber-500", icon: "⚔️" },
              { label: "Bug Reports", val: stats.bugCount, color: "bg-rose-50 text-rose-500", icon: "🐞" },
            ].map((s) => (
              <div key={s.label} className={`${s.color} rounded-3xl p-6 flex flex-col items-center justify-center border border-white shadow-sm`}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">{s.label}</div>
                <div className="text-3xl font-black font-mono tracking-tighter">{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 p-8 bg-slate-800 text-white rounded-[2.5rem] shadow-xl border border-white/10 relative overflow-hidden">
           <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/20 blur-3xl rounded-full" />
           <h2 className="text-2xl font-black tracking-tighter mb-4 relative z-10">Admin Information</h2>
           <p className="text-slate-400 font-bold text-sm leading-relaxed mb-6 relative z-10">
             管理ページではアプリ全体の運用管理を行います。メンテナンスモードをオンにすると、管理者以外のすべてのユーザーが操作できなくなり、専用の待機画面が表示されます。
           </p>
           <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-xs font-mono relative z-10">
             <div className="flex justify-between mb-2"><span className="opacity-50">App Environment:</span> <span>Production</span></div>
             <div className="flex justify-between"><span className="opacity-50">Runtime State:</span> <span className="text-cyan-400">Normal Operation</span></div>
           </div>
        </div>
      </div>

      {/* 右側: Maintenance Control */}
      <div className="flex-1 bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white overflow-hidden flex flex-col">
        <div className="p-8 border-b border-white/50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Maintenance Control</h2>
            <p className="text-slate-400 font-bold text-sm">アプリ全体のメンテナンス切り替え</p>
          </div>
          <div className="flex items-center gap-3">
             <span className={`text-xs font-black px-4 py-1.5 rounded-full ${maintenance.active ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "bg-emerald-500 text-white shadow-lg shadow-emerald-200"}`}>
               {maintenance.active ? "MAINTENANCE ACTIVE" : "SYSTEM ONLINE"}
             </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          
          <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div>
               <h3 className="text-xl font-black text-slate-800 mb-1">Status Toggle</h3>
               <p className="text-slate-400 text-xs font-bold">メンテナンスの有効/無効を切り替えます</p>
            </div>
            <button 
              onClick={() => setMaintenance({ ...maintenance, active: !maintenance.active })}
              className={`w-20 h-10 rounded-full p-1 transition-all duration-300 relative ${maintenance.active ? "bg-rose-500" : "bg-slate-200"}`}
            >
              <div className={`w-8 h-8 bg-white rounded-full shadow-md transition-all duration-300 transform ${maintenance.active ? "translate-x-10" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6 text-slate-700">
               <div>
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Maintenance Type</label>
                 <div className="flex gap-2">
                   {["regular", "emergency"].map(t => (
                     <button 
                       key={t}
                       onClick={() => setMaintenance({ ...maintenance, type: t })}
                       className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all border ${maintenance.type === t ? "bg-slate-800 text-white border-slate-800 shadow-lg" : "bg-white text-slate-500 border-slate-200"}`}
                     >
                       {t === "regular" ? "通常メンテナンス" : "緊急メンテナンス"}
                     </button>
                   ))}
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Reason (メンテ画面に表示)</label>
                 <textarea 
                   value={maintenance.reason}
                   onChange={(e) => setMaintenance({ ...maintenance, reason: e.target.value })}
                   placeholder="例: サーバー設備のメンテナンスのため..."
                   className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 ring-slate-200 resize-none h-32 text-sm"
                 />
               </div>
            </div>

            <div className="space-y-6">
                <div>
                   <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Start Time (Optional)</label>
                   <input 
                     type="text" 
                     value={maintenance.start}
                     onChange={(e) => setMaintenance({ ...maintenance, start: e.target.value })}
                     placeholder="例: 2026/04/01 02:00"
                     className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 ring-slate-200 text-sm"
                   />
                </div>
                <div>
                   <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">End Time (Optional)</label>
                   <input 
                     type="text" 
                     value={maintenance.end}
                     onChange={(e) => setMaintenance({ ...maintenance, end: e.target.value })}
                     placeholder="例: 2026/04/01 06:00 (未定の場合は空欄)"
                     className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 ring-slate-200 text-sm"
                   />
                </div>
            </div>
          </div>

        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50">
          <button 
            onClick={() => setIsConfirmModalOpen(true)}
            className="w-full bg-slate-800 text-white py-5 rounded-[2rem] font-black tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
          >
            UPDATE SYSTEM CONFIGURATION
          </button>
        </div>
      </div>

      {/* 確認モーダル */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-white">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">⚠️</div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">設定を更新しますか？</h3>
              <p className="text-slate-500 font-bold leading-relaxed">
                {maintenance.active 
                  ? "メンテンナンスを【有効】に設定します。管理者以外の全ユーザーにメンテナンス画面が表示されます。" 
                  : "システムを【通常稼働】に設定します。"}
              </p>
            </div>
            <div className="p-8 bg-slate-50 border-t flex gap-4">
               <button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 py-4 rounded-2xl font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-all">CANCEL</button>
               <button onClick={handleUpdateMaintenance} className="flex-1 py-4 rounded-2xl font-black text-white bg-slate-800 hover:bg-black transition-all">OK, APPLY</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
