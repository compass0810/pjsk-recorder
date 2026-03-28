"use client";

 ocean: {
  /* 簡易的な状態管理 */
}
import { useState, useEffect } from "react";

export default function PjskRecorder() {
  // 企画書に基づいた入力項目
  const [songName, setSongName] = useState("マシンガンポエムドール");
  const [totalNotes, setTotalNotes] = useState(3480); // 例として
  const [great, setGreat] = useState(0);
  const [good, setGood] = useState(0);
  const [bad, setBad] = useState(0);
  const [miss, setMiss] = useState(0);
  
  // PERFECTの自動計算ロジック
  const perfect = totalNotes - (great + good + bad + miss);

  return (
    <div className="flex h-screen bg-pjsk-bg font-sans text-slate-800">
      {/* --- サイドメニュー --- */}
      <aside className="w-64 bg-pjsk-dark text-white flex flex-col">
        <div className="p-6 text-xl font-bold border-b border-slate-700">
          MENU
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button className="w-full text-left p-3 bg-pjsk-main/20 text-pjsk-main rounded-lg border border-pjsk-main">
            リザルト記録
          </button>
          <button className="w-full text-left p-3 hover:bg-white/10 rounded-lg transition">
            ランクマレコーダー
          </button>
          <button className="w-full text-left p-3 hover:bg-white/10 rounded-lg transition text-slate-400">
            譜面メーカー情報 (仮)
          </button>
          <button className="w-full text-left p-3 hover:bg-white/10 rounded-lg transition">
            アップデートログ
          </button>
        </nav>
        <div className="p-4 text-xs text-slate-500">v 0.0.0 (企画書段階)</div>
      </aside>

      {/* --- メインコンテンツ --- */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold border-l-4 border-pjsk-main pl-4">
            プロセカレコーダー
          </h1>
          <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm">
            2026.03.28 記録中
          </div>
        </header>

        {/* リザルト入力カード */}
        <div className="max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-pjsk-purple p-4 text-white flex justify-between items-center">
            <span className="font-bold">MASTER Lv.35</span>
            <span className="text-sm opacity-80">リザルト入力</span>
          </div>

          <div className="p-8">
            <div className="mb-6 text-center">
              <input 
                className="text-2xl font-bold text-center w-full border-b-2 border-slate-100 focus:border-pjsk-main outline-none pb-2"
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* 左側：判定入力 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-orange-400 font-bold">PERFECT</span>
                  <span className="text-xl font-mono">{perfect}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-pink-400 font-bold">GREAT</span>
                  <input type="number" className="w-20 text-right outline-none" value={great} onChange={e => setGreat(Number(e.target.value))} />
                </div>
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-green-400 font-bold">GOOD</span>
                  <input type="number" className="w-20 text-right outline-none" value={good} onChange={e => setGood(Number(e.target.value))} />
                </div>
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-blue-400 font-bold">BAD</span>
                  <input type="number" className="w-20 text-right outline-none" value={bad} onChange={e => setBad(Number(e.target.value))} />
                </div>
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-gray-400 font-bold">MISS</span>
                  <input type="number" className="w-20 text-right outline-none" value={miss} onChange={e => setMiss(Number(e.target.value))} />
                </div>
              </div>

              {/* 右側：スコア・達成率（企画書イメージ） */}
              <div className="flex flex-col justify-center items-center bg-slate-50 rounded-2xl p-4">
                <div className="text-sm text-slate-500 mb-1">SCORE RATE</div>
                <div className="text-4xl font-black text-pjsk-main">99.95<span className="text-xl">%</span></div>
                <div className="mt-4 flex gap-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded">FC</span>
                  <span className="px-2 py-1 bg-slate-200 text-slate-400 text-xs font-bold rounded">AP</span>
                </div>
              </div>
            </div>

            <button className="w-full mt-8 bg-pjsk-main hover:bg-cyan-400 text-pjsk-dark font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95">
              記録する
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}