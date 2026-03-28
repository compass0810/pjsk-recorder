"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchSongs } from "@/lib/api";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
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

  // フィルター用ステート
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [filterDiff, setFilterDiff] = useState<Difficulty | "ALL">("ALL");
  const [filterClearType, setFilterClearType] = useState<"ALL" | "NOCLEAR" | "AP" | "FC" | "CLEAR">("ALL");
  const [sortType, setSortType] = useState<"name_asc" | "level_desc" | "level_asc" | "acc_desc" | "acc_asc">("level_desc");

  // Toast / Auth
  const [toastMessage, setToastMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [inputs, setInputs] = useState({ great: 0, good: 0, bad: 0, miss: 0 });
  // ローディング / 一括処理
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isQuickAPMode, setIsQuickAPMode] = useState(false);

  // 初回データ読込
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      
      // Auth 状態確認
      const { data: { user } } = await supabase.auth.getUser();
      if (isMounted) setIsLoggedIn(!!user);

      const songData = await fetchSongs((loaded, total) => {
        if (isMounted) setLoadingProgress({ loaded, total });
      });

      if (isMounted) {
        setSongs(songData);
        if (user) {
          const cloudResults = await db.playResults.getAll();
          setResults(cloudResults);
        }
        setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // 譜面リストの生成とフィルタリング
  const listEntries = useMemo(() => {
    const entries: ListEntry[] = [];
    songs.forEach(song => {
      if (song.X && song.X.trim() !== "" && song.X !== "-") entries.push({ song, diff: "EXP", level: song.X });
      if (song.M && song.M.trim() !== "" && song.M !== "-") entries.push({ song, diff: "MAS", level: song.M });
      if (song.A && song.A.trim() !== "" && song.A !== "-") entries.push({ song, diff: "APD", level: song.A });
    });

    return entries.filter(e => {
      const resultKey = `${e.song.No}-${e.diff}`;
      const saved = results[resultKey];

      // 検索フィルタ
      if (searchQuery && !e.song.楽曲名.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      // 難易度フィルタ
      if (filterDiff !== "ALL" && e.diff !== filterDiff) return false;
      // レベルフィルタ
      if (filterLevel !== "ALL" && e.level !== filterLevel) return false;
      // クリア状況フィルタ
      if (filterClearType !== "ALL") {
        if (filterClearType === "NOCLEAR" && saved) return false;
        if (filterClearType !== "NOCLEAR" && (!saved || saved.clearType !== filterClearType)) return false;
      }
      return true;
    }).sort((a, b) => {
      // 達成率計算用ヘルパー
      const getAcc = (entry: ListEntry) => {
        const resultKey = `${entry.song.No}-${entry.diff}`;
        const r = results[resultKey];
        const ttl = Number(String(entry.song[`コンボ\n(${entry.diff})` as keyof Song] || "0").replace(/,/g, ""));
        if (!r || ttl === 0) return -1; // 未プレイ
        return parseFloat(r.accuracy);
      };

      if (sortType === "name_asc") {
        return a.song.楽曲名.localeCompare(b.song.楽曲名, 'ja');
      } else if (sortType === "level_desc") {
        return Number(b.level || 0) - Number(a.level || 0) || a.song.楽曲名.localeCompare(b.song.楽曲名, 'ja');
      } else if (sortType === "level_asc") {
        return Number(a.level || 0) - Number(b.level || 0) || a.song.楽曲名.localeCompare(b.song.楽曲名, 'ja');
      } else if (sortType === "acc_desc") {
        return getAcc(b) - getAcc(a) || a.song.楽曲名.localeCompare(b.song.楽曲名, 'ja');
      } else if (sortType === "acc_asc") {
        return getAcc(a) - getAcc(b) || a.song.楽曲名.localeCompare(b.song.楽曲名, 'ja');
      }
      return 0;
    });
  }, [songs, results, searchQuery, filterDiff, filterLevel, filterClearType, sortType]);

  const levelOptions = useMemo(() => {
    const levels = new Set<string>();
    songs.forEach(s => {
      if (s.X && s.X !== "-") levels.add(s.X);
      if (s.M && s.M !== "-") levels.add(s.M);
      if (s.A && s.A !== "-") levels.add(s.A);
    });
    return Array.from(levels).sort((a, b) => Number(b) - Number(a)); // 降順
  }, [songs]);

  const getNotes = (song: Song, diff: Difficulty) => {
    const key = `コンボ\n(${diff})` as keyof Song;
    const val = song[key];
    if (!val) return 0;
    return Number(String(val).replace(/,/g, "")) || 0;
  };

  useEffect(() => {
    if (selectedEntry) {
      const resultKey = `${selectedEntry.song.No}-${selectedEntry.diff}`;
      const saved = results[resultKey];
      if (saved) {
        setInputs({ great: saved.great, good: saved.good, bad: saved.bad, miss: saved.miss });
      } else {
        setInputs({ great: 0, good: 0, bad: 0, miss: 0 });
      }
    }
  }, [selectedEntry, results]);

  const calculatePerfect = () => {
    if (!selectedEntry) return 0;
    const totalNotes = getNotes(selectedEntry.song, selectedEntry.diff);
    return Math.max(0, totalNotes - (inputs.great + inputs.good + inputs.bad + inputs.miss));
  };

  const calculateAccuracy = (r: { perfect: number, great: number, good: number, bad: number, miss: number } | undefined, total: number) => {
    if (!r || total === 0) return null;
    const score = (r.perfect * 3) + (r.great * 2) + (r.good * 1);
    const pct = (score / (total * 3)) * 100;
    return pct.toFixed(4);
  };

  const handleSave = async () => {
    if (!selectedEntry) return;
    const perfect = calculatePerfect();
    const totalNotes = getNotes(selectedEntry.song, selectedEntry.diff);

    let autoClearStatus: "AP" | "FC" | "CLEAR" = "CLEAR";
    if (inputs.great === 0 && inputs.good === 0 && inputs.bad === 0 && inputs.miss === 0) {
      autoClearStatus = "AP";
    } else if (inputs.good === 0 && inputs.bad === 0 && inputs.miss === 0) {
      autoClearStatus = "FC";
    }

    const resultKey = `${selectedEntry.song.No}-${selectedEntry.diff}`;
    const newResult: PlayResult = {
      songNo: selectedEntry.song.No,
      difficulty: selectedEntry.diff,
      ...inputs,
      perfect,
      clearType: autoClearStatus,
      accuracy: calculateAccuracy({ ...inputs, perfect }, totalNotes) || "0.0000",
      updatedAt: Date.now()
    };

    if (isLoggedIn) {
      await db.playResults.upsert(newResult);
      setResults(prev => ({ ...prev, [resultKey]: newResult }));
      setToastMessage("クラウドに記録を保存しました！");
    } else {
      setToastMessage("保存に失敗しました。ログイン状態を確認してください。");
    }
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleQuickAP = async (entry: ListEntry) => {
    if (!isLoggedIn) {
       setToastMessage("失敗：ログインが必要です");
       setTimeout(() => setToastMessage(""), 3000);
       return;
    }

    const totalNotes = getNotes(entry.song, entry.diff);
    const resultKey = `${entry.song.No}-${entry.diff}`;
    const newResult: PlayResult = {
      songNo: entry.song.No,
      difficulty: entry.diff,
      great: 0, good: 0, bad: 0, miss: 0,
      perfect: totalNotes,
      clearType: "AP",
      accuracy: "100.0000",
      updatedAt: Date.now()
    };

    await db.playResults.upsert(newResult);
    setResults(prev => ({ ...prev, [resultKey]: newResult }));
    setToastMessage(`${entry.song.楽曲名} を AP で保存しました！`);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleBatchAP = async () => {
    if (!isLoggedIn || listEntries.length === 0) return;
    setIsProcessingBatch(true);

    const now = Date.now();
    const batchData: PlayResult[] = listEntries.map(entry => {
      const totalNotes = getNotes(entry.song, entry.diff);
      return {
        songNo: entry.song.No,
        difficulty: entry.diff,
        great: 0, good: 0, bad: 0, miss: 0,
        perfect: totalNotes,
        clearType: "AP",
        accuracy: "100.0000",
        updatedAt: now
      };
    });

    await db.playResults.upsertMany(batchData);

    // ローカルステート一括更新
    const newResults = { ...results };
    batchData.forEach(r => {
      newResults[`${r.songNo}-${r.difficulty}`] = r;
    });
    setResults(newResults);

    setIsProcessingBatch(false);
    setIsBatchModalOpen(false);
    setToastMessage(`${listEntries.length} 件を一括 AP 保存しました！`);
    setTimeout(() => setToastMessage(""), 3000);
  };

  if (isLoading) {
    const pct = loadingProgress.total === 0 ? 0 : Math.round((loadingProgress.loaded / loadingProgress.total) * 100);
    return (
      <div className="flex flex-col items-center justify-center h-full absolute inset-0 w-full animate-fade-in-up">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-10 shadow-2xl border border-white flex flex-col items-center max-w-sm w-full">
          <div className="w-16 h-16 border-4 border-cyan-100 border-t-cyan-500 rounded-full animate-spin mb-6 shadow-sm"></div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter mb-2">読み込み中...</h2>
          <div className="text-slate-500 font-bold mb-6 font-mono bg-slate-100 px-4 py-1 rounded-full text-sm">
            {loadingProgress.loaded} / {loadingProgress.total || "????"}
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner flex">
            <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-75 ease-linear rounded-full" style={{ width: `${pct}%` }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full p-6 lg:p-8 gap-6 absolute inset-0 overflow-hidden">

      {/* Toast */}
      <div className={`fixed top-6 right-6 z-50 transition-all duration-500 transform ${toastMessage ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0 pointer-events-none"}`}>
        <div className="bg-white/90 backdrop-blur border-l-4 border-cyan-400 p-4 rounded-xl shadow-2xl flex items-center gap-4">
          <div className="bg-cyan-100 text-cyan-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">✓</div>
          <div className="font-bold text-slate-700">{toastMessage}</div>
        </div>
      </div>

      {/* 楽曲リストペイン */}
      <div className="w-1/3 min-w-[320px] flex flex-col bg-white/70 backdrop-blur-xl rounded-[2rem] shadow-xl overflow-hidden border border-white shrink-0">
        <div className="p-5 bg-gradient-to-r from-blue-100/30 to-cyan-100/30 border-b border-white/50 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Songs</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsQuickAPMode(!isQuickAPMode)}
                className={`text-[10px] font-black px-2 py-1 rounded-lg transition-all uppercase tracking-tighter shadow-sm border
                  ${isQuickAPMode ? "bg-sky-500 text-white border-sky-600 ring-2 ring-sky-300" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"}
                `}
                title="リストをクリックするだけでAP登録するモード"
              >
                Quick AP ON
              </button>
              <button 
                onClick={() => setIsBatchModalOpen(true)}
                disabled={listEntries.length === 0}
                className="text-[10px] font-black px-2 py-1 bg-white text-sky-500 border border-sky-200 rounded-lg hover:bg-sky-50 disabled:opacity-30 transition-all uppercase tracking-tighter shadow-sm"
              >
                Batch AP
              </button>
              <span className="text-xs font-bold px-2 py-1 bg-white/80 rounded-full text-slate-500">{listEntries.length} 譜面</span>
            </div>
          </div>

          <input
            type="text" placeholder="楽曲名で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/80 border border-slate-200 outline-none p-2.5 rounded-xl font-bold text-sm focus:ring-2 focus:ring-cyan-300 transition-all shadow-inner"
          />

          <div className="flex gap-2 text-xs font-bold">
            <select value={filterDiff} onChange={e => setFilterDiff(e.target.value as any)} className="bg-white/80 p-2 rounded-lg border border-slate-200 outline-none flex-1">
              <option value="ALL">全難易度</option><option value="EXP">EXPERT</option><option value="MAS">MASTER</option><option value="APD">APPEND</option>
            </select>
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="bg-white/80 p-2 rounded-lg border border-slate-200 outline-none w-20">
              <option value="ALL">Lv</option>{levelOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={filterClearType} onChange={e => setFilterClearType(e.target.value as any)} className="bg-white/80 p-2 rounded-lg border border-slate-200 outline-none flex-1">
              <option value="ALL">状態</option><option value="NOCLEAR">未クリア</option><option value="CLEAR">CLEAR</option><option value="FC">FC</option><option value="AP">AP</option>
            </select>
          </div>
          <div className="flex gap-2 text-xs font-bold pt-1">
            <select value={sortType} onChange={e => setSortType(e.target.value as any)} className="bg-white/90 p-2 rounded-lg border border-slate-200 outline-none flex-1 text-slate-700">
              <option value="name_asc">五十音順</option>
              <option value="level_desc">難易度 (高い順)</option>
              <option value="level_asc">難易度 (低い順)</option>
              <option value="acc_desc">達成率 (高い順)</option>
              <option value="acc_asc">達成率 (低い順)</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {listEntries.length === 0 && <p className="text-center text-slate-400 mt-10 font-bold">見つかりませんでした</p>}
          {listEntries.map((entry, idx) => {
            const resultKey = `${entry.song.No}-${entry.diff}`;
            const saved = results[resultKey];
            const isSelected = selectedEntry?.song.No === entry.song.No && selectedEntry?.diff === entry.diff;

            const diffColor = entry.diff === "EXP" ? "bg-[var(--color-diff-expert)]" : entry.diff === "MAS" ? "bg-[var(--color-diff-master)]" : "bg-[var(--color-diff-append)]";
            const diffRingColor = entry.diff === "EXP" ? "ring-[var(--color-diff-expert)]" : entry.diff === "MAS" ? "ring-[var(--color-diff-master)]" : "ring-[var(--color-diff-append)]";
            const diffTextColor = entry.diff === "EXP" ? "text-[var(--color-diff-expert)]" : entry.diff === "MAS" ? "text-[var(--color-diff-master)]" : "text-[var(--color-diff-append)]";

            return (
              <button
                key={resultKey}
                onClick={() => isQuickAPMode ? handleQuickAP(entry) : setSelectedEntry(entry)}
                style={{ animationDelay: `${idx * 0.03}s` }}
                className={`w-full text-left p-3 rounded-[1.25rem] transition-all duration-300 flex items-center gap-4 animate-fade-in-up
                  ${isSelected ? `bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] ring-2 ${diffRingColor} scale-100 relative z-10` : "bg-white/50 border border-slate-200/50 hover:bg-white/80 hover:shadow-md hover:scale-[1.01]"}
                  ${isQuickAPMode ? "hover:ring-2 hover:ring-sky-400" : ""}
                `}
              >
                {/* 難易度とレベルの丸形バッジ */}
                <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-white shrink-0 shadow-sm ${diffColor}`}>
                  <div className="text-[10px] font-black leading-none opacity-90">{entry.diff}</div>
                  <div className="text-xl font-black leading-none mt-0.5">{entry.level}</div>
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <div className={`text-[15px] font-black truncate leading-tight ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{entry.song.楽曲名}</div>
                  {!saved ? (
                    <div className="text-xs font-bold text-slate-400 mt-1">未プレイ</div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      {saved.clearType !== "CLEAR" && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border leading-none uppercase
                           ${saved.clearType === "AP" ? "border-sky-400 text-sky-500 bg-sky-50" : saved.clearType === "FC" ? "border-pink-400 text-pink-500 bg-pink-50" : "border-slate-300 text-slate-400"}`}>
                          {saved.clearType}
                        </span>
                      )}
                      <span className={`text-xs font-black font-mono ${isSelected ? diffTextColor : "text-slate-500"}`}>{parseFloat(saved.accuracy).toFixed(4)}%</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右ペイン: 入力フォーム */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {!selectedEntry ? (
          <div className="text-slate-400 font-bold bg-white/40 backdrop-blur px-8 py-4 rounded-full border border-white/50 tracking-wider">
            左のリストから楽曲を選択してください
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-white/85 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border-2 border-white/80 overflow-hidden flex flex-col h-full animate-fade-in-up relative">

            {/* 動的な背景装飾 */}
            <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-1000
              ${selectedEntry.diff === "EXP" ? "bg-rose-500" : selectedEntry.diff === "MAS" ? "bg-purple-500" : "bg-fuchsia-500"}`} />

            {/* ヘッダー部 */}
            <div className="px-10 pt-10 pb-6 flex items-end gap-6 relative z-10">
              <div className="w-24 h-24 bg-slate-100 rounded-[1.5rem] shadow-inner border-2 border-slate-200/50 flex flex-col items-center justify-center shrink-0 p-2 overflow-hidden relative">
                <div className="opacity-10 absolute inset-0 bg-stripes pointer-events-none" />
                <span className={`font-black uppercase text-[10px] ${selectedEntry.diff === "EXP" ? "text-[var(--color-diff-expert)]" : selectedEntry.diff === "MAS" ? "text-[var(--color-diff-master)]" : "text-[var(--color-diff-append)]"}`}>jacket</span>
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-black text-white ${selectedEntry.diff === "EXP" ? "bg-[var(--color-diff-expert)]" : selectedEntry.diff === "MAS" ? "bg-[var(--color-diff-master)]" : "bg-[var(--color-diff-append)]"}`}>
                    {selectedEntry.diff === "EXP" ? "EXPERT" : selectedEntry.diff === "MAS" ? "MASTER" : "APPEND"} {selectedEntry.level}
                  </span>
                </div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tighter leading-tight">{selectedEntry.song.楽曲名}</h2>
              </div>
              <div className="text-right pb-1">
                <div className="text-xs font-black text-slate-400 tracking-wider mb-1 uppercase">Best Accuracy</div>
                <div className="text-3xl font-black font-mono text-cyan-500 border-b-2 border-cyan-200 pb-1">
                  {results[`${selectedEntry.song.No}-${selectedEntry.diff}`]?.accuracy || "---.----"}<span className="text-lg opacity-70 ml-1">%</span>
                </div>
              </div>
            </div>

            {/* 入力エリア */}
            <div className="flex-1 px-10 pb-10 flex flex-col justify-center relative z-10">
              <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-white/60 shadow-inner flex flex-col h-full">

                <div className="flex justify-between items-center mb-8 px-8">
                  <div className="flex-1 text-center">
                    <div className="text-orange-400/80 font-black text-sm tracking-widest mb-1">PERFECT</div>
                    <div className="text-6xl font-black font-mono text-orange-400 transition-all duration-300">
                      {calculatePerfect()}
                    </div>
                  </div>
                  <div className="w-px h-16 bg-slate-200/80 mx-4" />
                  <div className="flex-1 text-center">
                    <div className="text-slate-400 font-black text-sm tracking-widest mb-1">TOTAL NOTES</div>
                    <div className="text-4xl font-black font-mono text-slate-400">
                      {getNotes(selectedEntry.song, selectedEntry.diff)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                  {[
                    { key: "great", label: "GREAT", colorClasses: { label: "text-pink-400", bgLine: "bg-pink-400/20 group-focus-within:bg-pink-400", ring: "focus-within:ring-pink-300", input: "text-pink-500" } },
                    { key: "good", label: "GOOD", colorClasses: { label: "text-blue-400", bgLine: "bg-blue-400/20 group-focus-within:bg-blue-400", ring: "focus-within:ring-blue-300", input: "text-blue-500" } },
                    { key: "bad", label: "BAD", colorClasses: { label: "text-emerald-400", bgLine: "bg-emerald-400/20 group-focus-within:bg-emerald-400", ring: "focus-within:ring-emerald-300", input: "text-emerald-500" } },
                    { key: "miss", label: "MISS", colorClasses: { label: "text-slate-400", bgLine: "bg-slate-400/20 group-focus-within:bg-slate-400", ring: "focus-within:ring-slate-300", input: "text-slate-700" } },
                  ].map((j) => (
                    <label key={j.key} className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col group transition-all duration-200 focus-within:ring-2 ${j.colorClasses.ring} hover:shadow-md cursor-text relative overflow-hidden`}>
                      <div className={`absolute top-0 left-0 w-full h-1 ${j.colorClasses.bgLine} transition-colors`} />
                      <span className={`text-sm font-black tracking-wider ${j.colorClasses.label} mb-2 uppercase`}>{j.label}</span>
                      <input
                        type="number" min="0"
                        value={(inputs as any)[j.key] === 0 ? "" : (inputs as any)[j.key]} placeholder="0"
                        onChange={e => setInputs(prev => ({ ...prev, [j.key]: Number(e.target.value) }))}
                        className={`w-full text-right text-4xl font-black font-mono bg-transparent outline-none ${j.colorClasses.input} flex-1`}
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-8 flex gap-4 h-16">
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-2xl shadow-lg shadow-cyan-500/30 font-black tracking-widest text-xl hover:shadow-cyan-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    RECORD SAVE
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>

      {/* 一括 AP 確認モーダル */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-white/50">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-sky-100 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl font-black italic">AP</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">一括 AP 処理</h3>
              <p className="text-slate-500 font-bold leading-relaxed">
                現在リストに表示されている <span className="text-sky-500 text-xl mx-1">{listEntries.length}</span> 譜面を<br/>すべて「AP」としてクラウドに記録します。
              </p>
              <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3 text-left">
                <span className="text-amber-500 mt-0.5">⚠️</span>
                <p className="text-xs font-bold text-amber-700 leading-tight">
                  既存のクリア記録（FC等）がある場合も AP で上書きされます。この操作は取り消せません。
                </p>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => setIsBatchModalOpen(false)}
                disabled={isProcessingBatch}
                className="flex-1 py-4 rounded-2xl font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                CANCEL
              </button>
              <button 
                onClick={handleBatchAP}
                disabled={isProcessingBatch}
                className="flex-1 py-4 rounded-2xl font-black text-white bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessingBatch ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : "EXECUTE"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}