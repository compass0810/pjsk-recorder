"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchSongs } from "@/lib/api";
import { loadResults, saveResult, getResultKey } from "@/lib/storage";
import { Song, PlayResult, Difficulty } from "@/types";

interface ListEntry {
  song: Song;
  diff: Difficulty;
  level: string;
}

export default function ResultRecorder() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [results, setResults] = useState<Record<string, PlayResult>>({});
  const [selectedEntry, setSelectedEntry] = useState<ListEntry | null>(null);
  
  // 入力フォームの状態
  const [inputs, setInputs] = useState({ great: 0, good: 0, bad: 0, miss: 0 });
  const [clearType, setClearType] = useState<"CLEAR" | "FC" | "AP" | "FAILED">("CLEAR");

  useEffect(() => {
    Promise.all([fetchSongs(), Promise.resolve(loadResults())]).then(([songData, savedResults]) => {
      setSongs(songData);
      setResults(savedResults);
    });
  }, []);

  // 譜面ごとのリスト作成
  const listEntries = useMemo(() => {
    return songs.flatMap(song => {
      const entries: ListEntry[] = [];
      if (song.X && song.X.trim() !== "" && song.X !== "-") {
        entries.push({ song, diff: "EXP", level: song.X });
      }
      if (song.M && song.M.trim() !== "" && song.M !== "-") {
        entries.push({ song, diff: "MAS", level: song.M });
      }
      if (song.A && song.A.trim() !== "" && song.A !== "-") {
        entries.push({ song, diff: "APD", level: song.A });
      }
      return entries;
    });
  }, [songs]);

  // ノーツ数の取得（カンマなど文字混入に対応）
  const getNotes = (song: Song, diff: Difficulty) => {
    const key = `コンボ(${diff})` as keyof Song;
    const val = song[key];
    if (!val) return 0;
    return Number(String(val).replace(/,/g, "")) || 0;
  };

  // 選択変更時にフォームリセット
  useEffect(() => {
    if (selectedEntry) {
      const key = getResultKey(selectedEntry.song.No, selectedEntry.diff);
      const saved = results[key];
      if (saved) {
        setInputs({ great: saved.great, good: saved.good, bad: saved.bad, miss: saved.miss });
        setClearType(saved.clearType);
      } else {
        setInputs({ great: 0, good: 0, bad: 0, miss: 0 });
        setClearType("CLEAR");
      }
    }
  }, [selectedEntry, results]);

  const handleSave = () => {
    if (!selectedEntry) return;
    
    const totalNotes = getNotes(selectedEntry.song, selectedEntry.diff);
    const totalMisjudges = inputs.great + inputs.good + inputs.bad + inputs.miss;
    const perfect = Math.max(0, totalNotes - totalMisjudges);
    
    const newResult: PlayResult = {
      songNo: selectedEntry.song.No,
      difficulty: selectedEntry.diff,
      ...inputs,
      perfect,
      clearType,
      updatedAt: Date.now()
    };
    
    saveResult(newResult);
    setResults(prev => ({ ...prev, [getResultKey(selectedEntry.song.No, selectedEntry.diff)]: newResult }));
    
    // アラートの代わりに少し演出を入れたいですが、ひとまず標準のアラートで
    alert("記録を保存しました！");
  };

  const calculateAccuracy = (r: PlayResult | undefined, total: number) => {
    if (!r || total === 0) return null;
    const score = (r.perfect * 3) + (r.great * 2) + (r.good * 1);
    const maxScore = total * 3;
    const pct = (score / maxScore) * 100;
    // 小数第4位まで表示
    return pct.toFixed(4);
  };

  return (
    <div className="flex h-full p-8 gap-8 absolute inset-0 overflow-hidden">
      {/* 楽曲リスト (左ペイン) */}
      <div className="w-1/2 flex flex-col bg-white/60 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden border border-white/40 border-t-white/80 shrink-0">
        <div className="p-4 bg-gradient-to-r from-blue-100/50 to-cyan-100/50 border-b border-blue-200/50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-blue-800">楽曲一覧</h2>
          <span className="text-sm font-bold text-blue-600">全 {listEntries.length} 譜面</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {listEntries.length === 0 && <p className="text-center text-slate-500 mt-10 animate-pulse">読み込み中...</p>}
          
          {listEntries.map(entry => {
            const key = getResultKey(entry.song.No, entry.diff);
            const saved = results[key];
            const isSelected = selectedEntry?.song.No === entry.song.No && selectedEntry?.diff === entry.diff;
            
            // 難易度によるカラー切り替え
            const diffColor = entry.diff === "EXP" ? "bg-[var(--color-diff-expert)]" : 
                              entry.diff === "MAS" ? "bg-[var(--color-diff-master)]" : 
                              "bg-[var(--color-diff-append)]";
            const diffTextColor = entry.diff === "EXP" ? "text-[var(--color-diff-expert)]" : 
                                  entry.diff === "MAS" ? "text-[var(--color-diff-master)]" : 
                                  "text-[var(--color-diff-append)]";
                                  
            const clearBadgeColor = saved?.clearType === "AP" ? "border-blue-400 text-blue-500" :
                                    saved?.clearType === "FC" ? "border-pink-400 text-pink-500" :
                                    saved?.clearType === "CLEAR" ? "border-orange-400 text-orange-500" :
                                    "border-gray-300 text-gray-400";

            const notes = getNotes(entry.song, entry.diff);
            const acc = calculateAccuracy(saved, notes);

            return (
              <button
                key={key}
                onClick={() => setSelectedEntry(entry)}
                className={`w-full text-left p-3 rounded-2xl transition-all duration-200 shadow-sm border flex items-center gap-4 ${
                  isSelected 
                    ? "bg-gradient-to-r from-white to-blue-50/80 border-cyan-400 ring-2 ring-cyan-400/30 scale-[1.02]" 
                    : "bg-white/80 border-slate-200 hover:bg-white hover:shadow-md"
                }`}
              >
                {/* 左端：丸い難易度とレベル枠 */}
                <div className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center shrink-0 ${diffTextColor} border-current`}>
                  <div className="text-[10px] font-bold uppercase leading-none mt-1">{entry.diff === "EXP" ? "EXPERT" : entry.diff === "MAS" ? "MASTER" : "APPEND"}</div>
                  <div className="text-2xl font-black leading-none mt-1">{entry.level}</div>
                </div>
                
                {/* ジャケット */}
                <div className="w-16 h-16 bg-slate-200 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-slate-400 text-xs font-bold border border-slate-300">
                  <div className="bg-stripes w-full h-full opacity-30"></div>
                </div>

                {/* 曲名とRECORD */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="font-bold text-slate-800 truncate text-lg">{entry.song.楽曲名}</div>
                  <div className="flex items-center gap-3 mt-1 text-sm font-bold">
                    {saved ? (
                      <>
                        <span className={`px-2 py-0.5 rounded border-2 leading-none uppercase ${clearBadgeColor}`}>
                          {saved.clearType.substring(0,2)}
                        </span>
                        <span className="text-slate-600">BEST: {acc}%</span>
                      </>
                    ) : (
                      <span className="text-slate-400">未記録</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 詳細データ入力 (右ペイン) */}
      <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden border border-white/50 shrink-0">
        {!selectedEntry ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">
            左のリストから譜面を選択してください
          </div>
        ) : (
          <>
            {/* ヘッダー */}
            <div className={`p-6 border-b text-white flex items-center justify-between shadow-sm
              ${selectedEntry.diff === "EXP" ? "bg-gradient-to-r from-[var(--color-diff-expert)] to-rose-400" : 
                selectedEntry.diff === "MAS" ? "bg-gradient-to-r from-[var(--color-diff-master)] to-purple-400" : 
                "bg-gradient-to-r from-[var(--color-diff-append)] to-fuchsia-400"}`}
            >
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{selectedEntry.song.楽曲名}</h2>
                <div className="mt-1 font-bold opacity-90">
                  {selectedEntry.diff === "EXP" ? "EXPERT" : selectedEntry.diff === "MAS" ? "MASTER" : "APPEND"} LEVEL {selectedEntry.level}
                </div>
              </div>
            </div>

            {/* 入力フォーム */}
            <div className="p-8 flex-1 overflow-y-auto">
              <div className="max-w-md mx-auto space-y-8">
                
                {/* 自動計算 PERFECT / TOTAL */}
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 text-center shadow-md border border-slate-100 flex justify-around items-center">
                  <div className="flex flex-col items-center">
                    <div className="text-[var(--color-judge-perfect)] font-bold tracking-widest text-sm mb-1">PERFECT</div>
                    <div className="text-4xl font-black font-mono text-[var(--color-judge-perfect)]">
                      {Math.max(0, getNotes(selectedEntry.song, selectedEntry.diff) - (inputs.great + inputs.good + inputs.bad + inputs.miss))}
                    </div>
                  </div>
                  
                  <div className="h-12 w-px bg-slate-200"></div>

                  <div className="flex flex-col items-center">
                    <div className="text-slate-400 font-bold tracking-widest text-sm mb-1">TOTAL</div>
                    <div className="text-3xl font-black font-mono text-slate-400">
                      {getNotes(selectedEntry.song, selectedEntry.diff)}
                    </div>
                  </div>
                </div>

                {/* 判定入力 */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                  {(["great", "good", "bad", "miss"] as const).map((judge) => {
                    const colorMap = {
                      great: "text-[var(--color-judge-great)]",
                      good: "text-[var(--color-judge-good)]",
                      bad: "text-[var(--color-judge-bad)]",
                      miss: "text-[var(--color-judge-miss)]"
                    };
                    return (
                      <div key={judge} className="flex justify-between items-center pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <span className={`font-bold uppercase tracking-wider ${colorMap[judge]}`}>{judge}</span>
                        <input 
                          type="number"
                          min="0"
                          value={inputs[judge] || ""}
                          onChange={(e) => setInputs(prev => ({ ...prev, [judge]: Number(e.target.value) }))}
                          className="w-20 text-right text-xl border-b-2 border-slate-200 font-bold bg-transparent outline-none focus:border-cyan-400 transition-colors"
                        />
                      </div>
                    )
                  })}
                </div>

                {/* クリア判定と保存ボタン */}
                <div className="space-y-4">
                  <select 
                    value={clearType} 
                    onChange={e => setClearType(e.target.value as any)}
                    className="w-full p-4 rounded-xl border border-slate-200 font-bold text-center outline-none focus:ring-2 focus:ring-cyan-300 appearance-none bg-white font-mono cursor-pointer"
                  >
                    <option value="CLEAR">CLEAR</option>
                    <option value="FC">FULL COMBO (FC)</option>
                    <option value="AP">ALL PERFECT (AP)</option>
                    <option value="FAILED">FAILED (LIFE 0)</option>
                  </select>

                  <button 
                    onClick={handleSave}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all active:translate-y-0"
                  >
                    記録を保存する
                  </button>
                </div>
                
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}