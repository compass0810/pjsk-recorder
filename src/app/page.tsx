"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { db } from "@/lib/db";

export default function RhythmGameHub() {
  const [appVersion, setAppVersion] = useState("v---.---.---");

  useEffect(() => {
    const fetchVersion = async () => {
      const version = await db.admin.getAppVersion();
      setAppVersion(version);
    };
    fetchVersion();
  }, []);
  const games = [
    {
      id: "pjsk",
      title: "プロジェクトセカイ",
      subtitle: "カラフルステージ！",
      color: "from-cyan-400 to-blue-500",
      shadow: "shadow-cyan-500/30",
      bgLayer: "bg-cyan-50",
      path: "/pjsk",
      isReady: true,
      icon: "♪"
    },
    {
      id: "yumeste",
      title: "ワールドダイスター",
      subtitle: "夢のステラリウム",
      color: "from-amber-400 to-orange-500",
      shadow: "shadow-orange-500/30",
      bgLayer: "bg-orange-50",
      path: "/yumeste",
      isReady: true,
      icon: "★"
    },
    {
      id: "takumi",
      title: "takumi³",
      subtitle: "タクミキュービック",
      color: "from-fuchsia-400 to-purple-600",
      shadow: "shadow-purple-500/30",
      bgLayer: "bg-purple-50",
      path: "/takumi",
      isReady: false,
      icon: "³"
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden min-h-[100dvh]">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-200/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-200/40 blur-[120px] pointer-events-none" />

      <div className="flex-1 overflow-y-auto p-8 lg:p-16 relative z-10 animate-fade-in-up flex flex-col justify-center">
        <header className="mb-16 text-center">
          <div className="inline-block px-8 py-5 bg-white/60 backdrop-blur-3xl rounded-[2.5rem] mb-6 shadow-xl border border-white">
            <h1 className="text-5xl font-black bg-gradient-to-br from-cyan-600 via-blue-600 to-purple-700 bg-clip-text text-transparent tracking-tighter">
              音ゲーレコーダー
            </h1>
          </div>
          <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">
            Rhythm Game Performance Tracker
          </p>
        </header>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 w-full">
          {games.map((game) => (
            game.isReady ? (
              <Link key={game.id} href={game.path} className="group block h-full">
                <GameCard game={game} />
              </Link>
            ) : (
              <div key={game.id} className="group block h-full opacity-80 cursor-not-allowed">
                <GameCard game={game} />
              </div>
            )
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 left-0 w-full text-center z-20 pointer-events-none animate-fade-in text-slate-400 font-bold text-xs uppercase tracking-widest">
        {appVersion}<br />
        <span className="opacity-50">© 2026 Recorder Project</span>
      </div>
    </div>
  );
}

function GameCard({ game }: { game: any }) {
  return (
    <div className="h-full min-h-[360px] bg-white/80 backdrop-blur-2xl rounded-[3rem] p-8 border-2 border-white transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden group-hover:-translate-y-2">
      {/* Internal Decor */}
      <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${game.color} opacity-10 blur-2xl group-hover:opacity-30 transition-opacity duration-500`} />
      
      {!game.isReady && (
        <div className="absolute top-6 left-6 px-4 py-1.5 bg-slate-100 text-slate-500 text-xs font-black rounded-full border border-slate-200 uppercase tracking-widest shadow-inner">
          Coming Soon
        </div>
      )}

      <div className={`w-32 h-32 rounded-[2.5rem] shadow-xl mb-10 flex flex-col items-center justify-center bg-gradient-to-br ${game.color} ${game.shadow} transform group-hover:rotate-6 transition-transform duration-500`}>
        <span className="text-white text-6xl font-black italic">
          {game.icon}
        </span>
      </div>

      <div className="relative z-10 w-full px-2">
        <h3 className="text-3xl font-black text-slate-800 tracking-tighter leading-tight mb-3">
          {game.title}
        </h3>
        <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">
          {game.subtitle}
        </p>
      </div>

      <div className="mt-10 flex gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200 group-hover:bg-cyan-400 transition-colors delay-100" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200 group-hover:bg-purple-400 transition-colors delay-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200 group-hover:bg-amber-400 transition-colors delay-300" />
      </div>
    </div>
  );
}
