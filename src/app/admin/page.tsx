"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [stats, setStats] = useState({ userCount: 0, resultCount: 0, rankMatchCount: 0, bugCount: 0 });
  const [projectStats, setProjectStats] = useState({ db_size_bytes: 0, total_rows: 0 });
  const [maintenance, setMaintenance] = useState({ active: false, start: "", end: "", type: "regular", reason: "" });
  const [appVersion, setAppVersion] = useState("v1.1.0.beta3(2026.04.06)");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmActionType, setConfirmActionType] = useState<"maintenance" | "version">("maintenance");
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [dataTab, setDataTab] = useState<"results" | "rankmatch">("results");
  const [allResults, setAllResults] = useState<any[]>([]);
  const [allRankMatches, setAllRankMatches] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activeView, setActiveView] = useState<"system" | "data">("system");

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const downloadCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportResults = () => {
    const header = ["ユーザー名", "カスタムID", "楽曲No", "難易度", "クリアタイプ", "PERFECT", "GREAT", "GOOD", "BAD", "MISS", "達成率", "最終更新"];
    const rows = allResults.map((r: any) => [
      r.profiles?.username ?? "",
      r.profiles?.custom_id ?? "",
      r.song_no, r.difficulty, r.clear_type,
      r.perfect, r.great, r.good, r.bad, r.miss,
      r.accuracy,
      new Date(r.updated_at).toLocaleString('ja-JP')
    ]);
    downloadCSV([header, ...rows], `admin_play_results_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const handleExportRankMatches = () => {
    const header = ["ユーザー名", "カスタムID", "日時", "楽曲名", "難易度", "レベル", "対戦相手", "自分PF", "自分GR", "自分GO", "自分B", "自分M", "自分CT", "相手PF", "相手GR", "相手GO", "相手B", "相手M", "相手CT", "結果", "ポイント変動"];
    const rows = allRankMatches.map((r: any) => [
      r.profiles?.username ?? "",
      r.profiles?.custom_id ?? "",
      new Date(r.timestamp).toLocaleString('ja-JP'),
      r.song_name, r.difficulty, r.level_num, r.rival_name,
      r.you_perfect, r.you_great, r.you_good, r.you_bad, r.you_miss, r.you_clear_type,
      r.rival_perfect, r.rival_great, r.rival_good, r.rival_bad, r.rival_miss, r.rival_clear_type,
      r.match_result, r.point_change
    ]);
    downloadCSV([header, ...rows], `admin_rank_matches_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const loadAllData = async () => {
    if (isDataLoaded) return;
    setIsDataLoading(true);
    const [results, rankMatches] = await Promise.all([
      db.admin.getAllPlayResults(),
      db.admin.getAllRankMatches()
    ]);
    setAllResults(results);
    setAllRankMatches(rankMatches);
    setIsDataLoaded(true);
    setIsDataLoading(false);
  };

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
        const [s, m, ps, v] = await Promise.all([
          db.admin.getStats(),
          db.admin.getMaintenance(),
          db.admin.getProjectStats(),
          db.admin.getAppVersion()
        ]);
        setStats(s);
        setMaintenance(m);
        setProjectStats(ps);
        setAppVersion(v);
      }
    }
    setIsLoading(false);
  };

  const handleUpdateMaintenance = async () => {
    try {
      if (confirmActionType === "maintenance") {
        await db.admin.setMaintenance(maintenance);
        setToastMessage("メンテナンス設定を更新しました。");
      } else {
        await db.admin.setAppVersion(appVersion);
        setToastMessage("バージョン番号を更新しました。");
      }
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

  const dbSizeMB = projectStats.db_size_bytes / (1024 * 1024);
  const dbLimitMB = 500;
  const dbPercent = Math.min(100, (dbSizeMB / dbLimitMB) * 100);

  return (
    <div className="max-w-[1600px] mx-auto p-6 lg:p-10 flex flex-col gap-8 min-h-screen pb-20 font-sans">
      
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/60 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-xl border border-white">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-1">Admin Panel</h1>
          <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Platform Management Console</p>
        </div>
        
        <div className="flex bg-slate-900/5 p-1.5 rounded-2xl shadow-inner border border-white/20 backdrop-blur">
          <button 
            onClick={() => setActiveView("system")}
            className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeView === "system" ? "bg-white text-slate-800 shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-white/30"}`}
          >
            <span>⚙️</span> 系統管理 & 統計
          </button>
          <button 
            onClick={() => setActiveView("data")}
            className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeView === "data" ? "bg-white text-slate-800 shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-white/30"}`}
          >
            <span>📋</span> データ管理
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] animate-fade-in-up">
          <div className="bg-white/80 backdrop-blur-2xl shadow-2xl border-l-4 border-cyan-500 p-4 rounded-xl flex items-center gap-3 border border-white/50">
            <span className="text-cyan-500 font-black">✓</span>
            <span className="font-bold text-slate-700">{toastMessage}</span>
          </div>
        </div>
      )}

      {activeView === "system" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in-up">
          {/* Stats Cards Cluster */}
          <div className="xl:col-span-1 flex flex-col gap-8">
            <div className="bg-white/60 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-xl border border-white/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl">📈</div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter mb-6">Database Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Total Users", val: stats.userCount, color: "bg-blue-50/50 text-blue-500", icon: "👥" },
                  { label: "Play Results", val: stats.resultCount, color: "bg-purple-50/50 text-purple-500", icon: "📊" },
                  { label: "RankMatch", val: stats.rankMatchCount, color: "bg-amber-50/50 text-amber-500", icon: "⚔️" },
                  { label: "Bug Reports", val: stats.bugCount, color: "bg-rose-50/50 text-rose-500", icon: "🐞" },
                ].map((s) => (
                  <div key={s.label} className={`${s.color} rounded-3xl p-6 flex flex-col items-center justify-center border border-white/80 shadow-sm backdrop-blur-md`}>
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{s.label}</div>
                    <div className="text-3xl font-black font-mono tracking-tighter">{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-xl border border-white/50">
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter mb-6">Cloud Resources</h2>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Database Size</div>
                    <div className="text-sm font-black text-slate-800 font-mono">
                      {formatBytes(projectStats.db_size_bytes)} <span className="text-slate-300 mx-1">/</span> {dbLimitMB} MB
                    </div>
                  </div>
                  <div className="h-3 bg-slate-900/5 rounded-full overflow-hidden border border-white/50 shadow-inner">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(34,211,238,0.5)]" style={{ width: `${dbPercent}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Cumulative Records</div>
                    <div className="text-sm font-black text-slate-800 font-mono">
                      {projectStats.total_rows.toLocaleString()} <span className="text-slate-300 mx-1">/</span> 50,000 items
                    </div>
                  </div>
                  <div className="h-3 bg-slate-900/5 rounded-full overflow-hidden border border-white/50 shadow-inner">
                    <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-1000 shadow-[0_0_10px_rgba(192,132,252,0.5)]" style={{ width: `${Math.min(100, (projectStats.total_rows / 50000) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Control Large Panel */}
          <div className="xl:col-span-2 bg-white/60 backdrop-blur-2xl rounded-[3rem] shadow-xl border border-white/50 flex flex-col overflow-hidden">
            <div className="p-10 border-b border-white/50 flex justify-between items-center bg-white/40">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Maintenance Control</h2>
                <p className="text-slate-400 font-bold text-sm">アプリ全体のメンテナンス切り替え</p>
              </div>
              <div className={`px-5 py-2 rounded-full font-black text-xs tracking-widest shadow-lg ${maintenance.active ? "bg-rose-500 text-white shadow-rose-200" : "bg-emerald-500 text-white shadow-emerald-200"}`}>
                {maintenance.active ? "MAINTENANCE ACTIVE" : "SYSTEM ONLINE"}
              </div>
            </div>

            <div className="p-10 space-y-10 overflow-y-auto max-h-[600px] bg-white/20">
              <div className="flex items-center justify-between bg-white/50 backdrop-blur p-8 rounded-[2rem] border border-white/50 shadow-sm">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 mb-1">Status Toggle</h3>
                  <p className="text-slate-400 text-sm font-bold leading-relaxed">メンテナンスの有効/無効を切り替えます。有効にすると管理者以外はアクセスできなくなります。</p>
                </div>
                <button 
                  onClick={() => setMaintenance({ ...maintenance, active: !maintenance.active })}
                  className={`w-24 h-12 rounded-full p-1.5 transition-all duration-500 relative shadow-inner ${maintenance.active ? "bg-rose-500 ring-4 ring-rose-100" : "bg-slate-300/30"}`}
                >
                  <div className={`w-9 h-9 bg-white rounded-full shadow-2xl transition-all duration-500 transform ${maintenance.active ? "translate-x-12" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Maintenance Type</label>
                    <div className="flex gap-4">
                      {["regular", "emergency"].map(t => (
                        <button 
                          key={t}
                          onClick={() => setMaintenance({ ...maintenance, type: t })}
                          className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all border ${maintenance.type === t ? "bg-slate-800 text-white border-slate-800 shadow-xl" : "bg-white/50 text-slate-500 border-white hover:border-slate-300"}`}
                        >
                          {t === "regular" ? "通常メンテ" : "緊急メンテ"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Reason (メンテ画面に表示)</label>
                    <textarea 
                      value={maintenance.reason}
                      onChange={(e) => setMaintenance({ ...maintenance, reason: e.target.value })}
                      className="w-full bg-white/50 border border-white rounded-3xl p-6 font-bold outline-none focus:ring-4 ring-white/30 resize-none h-40 text-sm shadow-sm backdrop-blur"
                      placeholder="例: 大型アップデートに伴うメンテナンス..."
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Application Version</label>
                    <input 
                      type="text" value={appVersion} onChange={(e) => setAppVersion(e.target.value)}
                      className="w-full bg-white/50 border border-white rounded-2xl p-5 font-bold outline-none focus:ring-4 ring-white/30 text-sm shadow-sm backdrop-blur"
                      placeholder="例: v1.1.0..."
                    />
                    <div className="mt-2 text-right">
                      <button 
                        onClick={() => { setConfirmActionType("version"); setIsConfirmModalOpen(true); }}
                        className="px-4 py-2 bg-purple-500 text-white rounded-xl text-xs font-black shadow-sm shadow-purple-200 hover:bg-purple-600 transition-all active:scale-95"
                      >
                        バージョンのみ更新
                      </button>
                    </div>
                  </div>
                   <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Scheduled Start</label>
                    <input 
                      type="text" value={maintenance.start} onChange={(e) => setMaintenance({ ...maintenance, start: e.target.value })}
                      className="w-full bg-white/50 border border-white rounded-2xl p-5 font-bold outline-none focus:ring-4 ring-white/30 text-sm shadow-sm backdrop-blur"
                      placeholder="2026/04/01 10:00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Scheduled End</label>
                    <input 
                      type="text" value={maintenance.end} onChange={(e) => setMaintenance({ ...maintenance, end: e.target.value })}
                      className="w-full bg-white/50 border border-white rounded-2xl p-5 font-bold outline-none focus:ring-4 ring-white/30 text-sm shadow-sm backdrop-blur"
                      placeholder="2026/04/01 15:00"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-white/40 border-t border-white/50">
              <button 
                onClick={() => { setConfirmActionType("maintenance"); setIsConfirmModalOpen(true); }}
                className="w-full bg-slate-800 text-white py-6 rounded-[2rem] font-black tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 text-lg"
              >
                APPLY CONFIGURATION
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8 animate-fade-in-up">
          {/* Detailed Data Explorer View */}
          <div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] shadow-xl border border-white/50 overflow-hidden flex flex-col">
            <div className="p-10 border-b border-white/50 flex justify-between items-center bg-white/40 flex-wrap gap-6">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Database Explorer</h2>
                <p className="text-slate-400 font-bold text-sm">全ユーザーの保存データを閲覧・エクスポート</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-900/5 p-1.5 rounded-[1.25rem] shadow-inner backdrop-blur">
                  <button onClick={() => setDataTab("results")} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${dataTab === "results" ? "bg-white text-slate-800 shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-white/30"}`}>Play Results</button>
                  <button onClick={() => setDataTab("rankmatch")} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${dataTab === "rankmatch" ? "bg-white text-slate-800 shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-white/30"}`}>Rank Match</button>
                </div>
                
                {!isDataLoaded ? (
                  <button onClick={loadAllData} disabled={isDataLoading} className="bg-slate-800 text-white px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl disabled:opacity-50">
                    {isDataLoading ? "LOADING..." : "FETCH ALL DATA"}
                  </button>
                ) : (
                  <button onClick={dataTab === "results" ? handleExportResults : handleExportRankMatches} className="bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200">
                    DOWNLOAD CSV
                  </button>
                )}
              </div>
            </div>

            <div className="p-10">
              {!isDataLoaded ? (
                <div className="flex flex-col items-center justify-center p-20 text-slate-300 border-4 border-dashed border-white/50 rounded-[3rem] bg-white/20">
                  <div className="text-6xl mb-6 opacity-30">📁</div>
                  <h3 className="text-2xl font-black text-slate-400 mb-2">No Data Fetched</h3>
                  <p className="text-sm font-bold">右上の「FETCH ALL DATA」ボタンを押して内容を表示します。</p>
                </div>
              ) : (
                <div className="animate-fade-in group">
                  <p className="text-sm font-black text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,1)] animate-pulse" />
                    Showing latest {dataTab === "results" ? allResults.length : allRankMatches.length} records
                  </p>
                  
                  <div className="overflow-x-auto rounded-[2.5rem] border border-white/50 shadow-inner bg-white/20 backdrop-blur-md">
                    <table className="w-full text-sm font-bold">
                      <thead className="bg-white/40 border-b border-white text-slate-400 uppercase tracking-widest text-[11px]">
                        <tr>
                          {dataTab === "results" 
                            ? ["ユーザー名", "No", "難易度", "クリア", "PF", "GR", "GO", "B", "M", "達成率", "最終更新"].map(h => <th key={h} className="px-6 py-6 text-left">{h}</th>)
                            : ["ユーザー名", "日時", "楽曲名", "難易度", "対戦対象", "自分判定", "CT", "相手判定", "結果", "変化"].map(h => <th key={h} className="px-6 py-6 text-left">{h}</th>)
                          }
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/40">
                        {dataTab === "results" ? allResults.slice(0, 500).map((r, i) => (
                          <tr key={i} className="hover:bg-white/40 transition-colors bg-white/10">
                            <td className="px-6 py-5 font-black text-slate-700 whitespace-nowrap">{r.profiles?.username || "名無し"}</td>
                            <td className="px-6 py-5 text-slate-400 font-mono text-xs">{r.song_no}</td>
                            <td className="px-6 py-5"><span className={`px-2.5 py-1 rounded-lg text-[10px] text-white font-black shadow-sm ${r.difficulty === "APD" ? "bg-purple-500" : r.difficulty === "MAS" ? "bg-rose-500" : "bg-orange-400"}`}>{r.difficulty}</span></td>
                            <td className="px-6 py-5"><span className={`font-black ${r.clear_type === "AP" ? "text-cyan-500 drop-shadow-sm" : r.clear_type === "FC" ? "text-pink-500 drop-shadow-sm" : "text-slate-400"}`}>{r.clear_type}</span></td>
                            {[r.perfect, r.great, r.good, r.bad, r.miss].map((v, idx) => <td key={idx} className="px-6 py-5 text-slate-500 font-mono text-xs">{v}</td>)}
                            <td className="px-6 py-5 text-slate-800 font-mono text-xs">{parseFloat(r.accuracy).toFixed(4)}%</td>
                            <td className="px-6 py-5 text-slate-400 text-[10px] whitespace-nowrap">{new Date(r.updated_at).toLocaleDateString()}</td>
                          </tr>
                        )) : allRankMatches.slice(0, 500).map((r, i) => (
                          <tr key={i} className="hover:bg-white/40 transition-colors bg-white/10 text-xs">
                            <td className="px-6 py-5 font-black text-slate-700 whitespace-nowrap">{r.profiles?.username || "名無し"}</td>
                            <td className="px-6 py-5 text-slate-400 text-[10px] whitespace-nowrap">{new Date(r.timestamp).toLocaleDateString()}</td>
                            <td className="px-6 py-5 text-slate-800 truncate max-w-[140px] leading-tight">{r.song_name}</td>
                            <td className="px-6 py-5"><span className={`px-2.5 py-1 rounded-lg text-[10px] text-white font-black shadow-sm ${r.difficulty === "APD" ? "bg-purple-500" : r.difficulty === "MAS" ? "bg-rose-500" : "bg-orange-400"}`}>{r.difficulty}</span></td>
                            <td className="px-6 py-5 text-slate-500 truncate max-w-[100px]">{r.rival_name}</td>
                            <td className="px-6 py-5 text-slate-400 font-mono">{r.you_perfect}/{r.you_great}/{r.you_good}/{r.you_bad}/{r.you_miss}</td>
                            <td className="px-6 py-5 font-black text-slate-400">{r.you_clear_type}</td>
                            <td className="px-6 py-5 text-slate-400 font-mono">{r.rival_perfect}/{r.rival_great}/{r.rival_good}/{r.rival_bad}/{r.rival_miss}</td>
                            <td className="px-6 py-5 font-black text-slate-700">{r.match_result}</td>
                            <td className={`px-6 py-5 font-black font-mono ${r.point_change > 0 ? "text-cyan-500" : "text-rose-400"}`}>{r.point_change > 0 ? "+" : ""}{r.point_change}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {((dataTab === "results" ? allResults.length : allRankMatches.length) > 500) && (
                    <p className="mt-6 text-center text-xs font-bold text-slate-400">表示は最新 500 件に制限されています。全件データを確認するには右上の CSV 出力を行ってください。</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4 animate-fade-in">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white">
            <div className="p-12 text-center">
              <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner animate-pulse">⚠️</div>
              <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tighter">設定を更新しますか？</h3>
              <p className="text-slate-500 font-bold leading-relaxed px-6">
                {confirmActionType === "version" 
                  ? "システム全体のアプリケーションバージョン表記を更新します。"
                  : maintenance.active 
                    ? "メンテンナンスを【有効】に設定します。即座に全ユーザーへ通知され、操作が制限されます。" 
                    : "システムを【通常稼働】に戻します。"}
              </p>
            </div>
            <div className="p-10 bg-slate-50 border-t flex gap-6">
               <button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 py-5 rounded-3xl font-black text-slate-400 bg-white border border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">Cancel</button>
               <button onClick={handleUpdateMaintenance} className="flex-1 py-5 rounded-3xl font-black text-white bg-slate-800 hover:bg-black transition-all shadow-xl uppercase tracking-widest text-xs">Apply Now</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
