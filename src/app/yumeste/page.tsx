"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { fetchYumesteSongs } from "@/lib/api_yumeste";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { PlayResult, YumesteDifficulty, YumesteSong } from "@/types";
import { calculateSingleRating, calculateAverageOfTopN, calculateSeishoDetailed } from "@/lib/rating";

interface ListEntry {
  song: YumesteSong;
  diff: YumesteDifficulty;
  level: string;
}

const parseLevel = (levelStr: string) => {
  if (!levelStr) return 0;
  const s = String(levelStr).toUpperCase().trim();
  const romanMap: Record<string, number> = {
    "Ⅰ": 1, "I": 1,
    "Ⅱ": 2, "II": 2,
    "Ⅲ": 3, "III": 3,
    "Ⅳ": 4, "IV": 4,
    "Ⅴ": 5, "V": 5,
    "Ⅵ": 6, "VI": 6,
    "Ⅶ": 7, "VII": 7,
    "Ⅷ": 8, "VIII": 8,
    "Ⅸ": 9, "IX": 9,
    "Ⅹ": 10, "X": 10,
    "Ⅺ": 11, "XI": 11,
    "Ⅻ": 12, "XII": 12
  };
  if (romanMap[s]) {
    return romanMap[s];
  }
  const n = Number(s);
  return isNaN(n) ? 0 : n;
};

const SongListItem = React.memo(({ 
  entry, 
  saved, 
  isSelected, 
  isQuickAPMode, 
  onClick, 
  onDoubleClick,
  calculateAccuracy, 
  getNotes,
  rating,
  style 
}: { 
  entry: ListEntry, 
  saved: PlayResult | undefined, 
  isSelected: boolean, 
  isQuickAPMode: boolean,
  onClick: () => void,
  onDoubleClick?: () => void,
  calculateAccuracy: (r: any, total: number) => string | null,
  getNotes: (s: YumesteSong, d: YumesteDifficulty) => number,
  rating: number | null,
  style: React.CSSProperties
}) => {
  const diffColor = entry.diff === "STELLA" ? "bg-purple-600" : "bg-slate-900";
  const diffRingColor = entry.diff === "STELLA" ? "ring-purple-400" : "ring-slate-700";
  const diffTextColor = entry.diff === "STELLA" ? "text-purple-600" : "text-slate-900";

    const seisho = (entry.diff === "OLIVIER" && saved) ? calculateSeishoDetailed(parseLevel(entry.level), parseFloat(saved.accuracy), (saved.perfect || 0) + (saved.great || 0) + (saved.good || 0) + (saved.bad || 0) + (saved.miss || 0), saved.clearType) : null;

    return (
      <button
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        style={style}
        className={`w-full text-left p-3 rounded-[1.25rem] transition-all duration-300 flex items-center gap-3 animate-fade-in-up
          ${isSelected ? `bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] ring-2 ${diffRingColor} scale-100 relative z-10` : "bg-white/50 border border-slate-200/50 hover:bg-white/80 hover:shadow-md hover:scale-[1.01]"}
          ${isQuickAPMode ? "hover:ring-2 hover:ring-rose-400" : ""}
        `}
      >
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200/50 bg-white relative">
          <img 
            src={`https://cdn.wikiwiki.jp/to/w/wds/収録楽曲一覧/::attach/${encodeURIComponent(entry.song.曲名)}.png`}
            alt="jacket"
            className="w-full h-full object-cover"
            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
          />
        </div>
  
        <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center text-white shrink-0 shadow-sm ${diffColor}`}>
          <div className="text-[8px] font-black leading-none opacity-90">{entry.diff === "STELLA" ? "ST" : "OL"}</div>
          <div className="text-lg font-black leading-none mt-0.5">{entry.level}</div>
        </div>
  
        <div className="flex-1 min-w-0 pr-2">
          <div className={`text-[15px] font-black truncate leading-tight ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{entry.song.曲名}</div>
          {!saved ? (
            <div className="text-xs font-bold text-slate-400 mt-1">未プレイ</div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              {saved.clearType !== "CLEAR" && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border leading-none uppercase
                   ${saved.clearType === "AP" ? "border-cyan-400 text-cyan-500 bg-cyan-50" : saved.clearType === "FC" ? "border-pink-400 text-pink-500 bg-pink-50" : "border-slate-300 text-slate-400"}`}>
                  {saved.clearType}
                </span>
              )}
              <span className={`text-xs font-black font-mono ${isSelected ? diffTextColor : "text-slate-500"}`}>{parseFloat(saved.accuracy).toFixed(4)}%</span>
              
              {entry.diff === "OLIVIER" && seisho ? (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-900 text-white ml-auto tabular-nums flex items-center gap-1">
                  <span className="text-[8px] opacity-70">星章</span> {seisho.total}
                </span>
              ) : rating !== null && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 ml-auto tabular-nums">
                  {rating.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    );
  });

SongListItem.displayName = "SongListItem";

const SeishoBreakdown = ({ level, accuracy, inputs, clearType }: { level: string, accuracy: string, inputs: any, clearType: any }) => {
  const levelNum = parseLevel(level);
  const accNum = parseFloat(accuracy);
  const perfBelow = inputs.perfect + inputs.great + inputs.good + inputs.bad + inputs.miss;
  const d = calculateSeishoDetailed(levelNum, accNum, perfBelow, clearType);

  const ProgressItem = ({ label, current, max, points, next, hint }: { label: string, current: string | number, max: number, points: number, next: any, hint: string }) => (
    <div className="bg-white/60 rounded-2xl p-4 border border-white/50 shadow-sm overflow-hidden relative group">
      <div className="flex justify-between items-end mb-2 relative z-10">
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
          <div className="text-xl font-black text-slate-800 tabular-nums">
            {current} <span className="text-[10px] text-slate-400 font-bold">/ {max}pt</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-slate-900 group-hover:scale-110 transition-transform">+{points}</div>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative mb-1">
        <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${(points / max) * 100}%` }} />
      </div>
      {next && (
        <div className="text-[9px] font-black text-slate-500 flex justify-between">
          <span>NEXT LEVEL</span>
          <span className="text-pink-500">{hint}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-8 space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-3 px-4 mb-2">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Seisho Breakdown</div>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        <ProgressItem 
          label="A: Accuracy (達成率)" current={`${accNum.toFixed(4)}%`} max={50 + levelNum * 10} points={d.accuracyPoints}
          next={d.nextAccuracyThreshold} hint={d.nextAccuracyThreshold ? `Next: ${d.nextAccuracyThreshold.toFixed(2)}% (+${(d.nextAccuracyThreshold - accNum).toFixed(4)}%)` : "MAXREACHED"}
        />
        <ProgressItem 
          label="B: Judgment (判定精度)" current={`${perfBelow} counts`} max={5} points={d.judgmentPoints}
          next={d.nextJudgmentThreshold} hint={d.nextJudgmentThreshold !== null ? `Next: ${d.nextJudgmentThreshold} or below (-${perfBelow - d.nextJudgmentThreshold})` : "MAXREACHED"}
        />
        <ProgressItem 
          label="C: Lamp (クリアランプ)" current={clearType} max={5} points={d.lampPoints}
          next={d.nextLampGoal} hint={d.nextLampGoal ? `Goal: ${d.nextLampGoal}` : "MAXREACHED"}
        />
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 text-center shadow-xl shadow-slate-900/20 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
        <div className="text-xs font-black text-slate-400 tracking-[0.3em] uppercase mb-1">Total Seisho Points</div>
        <div className="text-6xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg group-hover:scale-105 transition-transform duration-500">
          {d.total}
        </div>
        <div className="mt-2 text-[10px] font-bold text-slate-500 italic">Prestige Evaluation System for OLIVIER</div>
      </div>
    </div>
  );
};

export default function YumesteResultRecorder() {
  const [songs, setSongs] = useState<YumesteSong[]>([]);
  const [results, setResults] = useState<Record<string, PlayResult>>({});
  const [lastSavedResult, setLastSavedResult] = useState<PlayResult | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [undoProgress, setUndoProgress] = useState(100);
  const [undoKey, setUndoKey] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<ListEntry | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [filterDiff, setFilterDiff] = useState<YumesteDifficulty | "ALL">("ALL");
  const [filterClearType, setFilterClearType] = useState<"ALL" | "NOCLEAR" | "AP" | "FC" | "CLEAR">("ALL");
  const [sortType, setSortType] = useState<"name_asc" | "level_desc" | "level_asc" | "acc_desc" | "acc_asc">("level_desc");

  const [toastMessage, setToastMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inputs, setInputs] = useState({ perfect: 0, great: 0, good: 0, bad: 0, miss: 0 });
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isQuickAPMode, setIsQuickAPMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (isMounted) setIsLoggedIn(!!user);

      const songData = await fetchYumesteSongs((loaded, total) => {
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
    return () => { isMounted = false; };
  }, []);

  const listEntries = useMemo(() => {
    const entries: ListEntry[] = [];
    songs.forEach(song => {
      if (song.STELLA難易度 && song.STELLA難易度.trim() !== "" && song.STELLA難易度 !== "-" && song.STELLA難易度 !== "***") entries.push({ song, diff: "STELLA", level: song.STELLA難易度 });
      if (song.OLIVIER難易度 && song.OLIVIER難易度.trim() !== "" && song.OLIVIER難易度 !== "-" && song.OLIVIER難易度 !== "***") entries.push({ song, diff: "OLIVIER", level: song.OLIVIER難易度 });
    });

    return entries.filter(e => {
      const resultKey = `YM_${e.song.No}-${e.diff}`;
      const saved = results[resultKey];

      if (searchQuery && !e.song.曲名.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterDiff !== "ALL" && e.diff !== filterDiff) return false;
      if (filterLevel !== "ALL" && e.level !== filterLevel) return false;
      if (filterClearType !== "ALL") {
        if (filterClearType === "NOCLEAR" && saved) return false;
        if (filterClearType !== "NOCLEAR" && (!saved || saved.clearType !== filterClearType)) return false;
      }
      return true;
    }).sort((a, b) => {
      const getAcc = (entry: ListEntry) => {
        const resultKey = `YM_${entry.song.No}-${entry.diff}`;
        const r = results[resultKey];
        const ttl = Number(entry.diff === "STELLA" ? String(entry.song.STELLAノーツ).replace(/,/g, "") : String(entry.song.OLIVIERノーツ).replace(/,/g, ""));
        if (!r || ttl === 0 || isNaN(ttl)) return -1;
        return parseFloat(r.accuracy);
      };

      if (sortType === "name_asc") return a.song.曲名.localeCompare(b.song.曲名, 'ja');
      
      const lvA = parseLevel(a.level);
      const lvB = parseLevel(b.level);
      
      const diffWeightA = a.diff === "OLIVIER" ? 100 : 0;
      const diffWeightB = b.diff === "OLIVIER" ? 100 : 0;
      
      const totalA = lvA + diffWeightA;
      const totalB = lvB + diffWeightB;

      if (sortType === "level_desc") return totalB - totalA || a.song.曲名.localeCompare(b.song.曲名, 'ja');
      if (sortType === "level_asc") return totalA - totalB || a.song.曲名.localeCompare(b.song.曲名, 'ja');
      if (sortType === "acc_desc") return getAcc(b) - getAcc(a) || a.song.曲名.localeCompare(b.song.曲名, 'ja');
      if (sortType === "acc_asc") return getAcc(a) - getAcc(b) || a.song.曲名.localeCompare(b.song.曲名, 'ja');
      return 0;
    });
  }, [songs, results, searchQuery, filterDiff, filterLevel, filterClearType, sortType]);

  const seishoStats = useMemo(() => {
    let earned = 0;
    let max = 0;
    songs.forEach(song => {
      const diffs: YumesteDifficulty[] = ["OLIVIER"]; // 星章は OLIVIER のみ集計
      diffs.forEach(diff => {
        const levelStr = song.OLIVIER難易度;
        if (levelStr && levelStr !== "-" && levelStr !== "***" && levelStr.trim() !== "") {
          const levelNum = parseLevel(levelStr);
          max += (60 + levelNum * 10); // 理論値: Base(50+LV*10) + Judge5 + Lamp5 = 60 + LV*10

          const res = results[`YM_${song.No}-${diff}`];
          if (res) {
            const perfBelow = (res.perfect || 0) + (res.great || 0) + (res.good || 0) + (res.bad || 0) + (res.miss || 0);
            const seisho = calculateSeishoDetailed(levelNum, parseFloat(res.accuracy), perfBelow, res.clearType);
            earned += seisho.total;
          }
        }
      });
    });
    const rate = max > 0 ? (earned / max) * 100 : 0;
    return { earned, max, rate };
  }, [songs, results]);

  const levelOptions = useMemo(() => {
    const levels = new Set<string>();
    songs.forEach(s => {
      if (s.STELLA難易度 && s.STELLA難易度 !== "-" && s.STELLA難易度 !== "***") levels.add(s.STELLA難易度);
      if (s.OLIVIER難易度 && s.OLIVIER難易度 !== "-" && s.OLIVIER難易度 !== "***") levels.add(s.OLIVIER難易度);
    });
    // レベル順でソート（OLIVIER表記も考慮）
    return Array.from(levels).sort((a, b) => parseLevel(a) - parseLevel(b) || a.localeCompare(b));
  }, [songs]);

  const getNotes = useCallback((song: YumesteSong, diff: YumesteDifficulty) => {
    const val = diff === "STELLA" ? song.STELLAノーツ : song.OLIVIERノーツ;
    if (!val) return 0;
    return Number(String(val).replace(/,/g, "")) || 0;
  }, []);

  useEffect(() => {
    if (selectedEntry) {
      const resultKey = `YM_${selectedEntry.song.No}-${selectedEntry.diff}`;
      const saved = results[resultKey];
      if (saved) {
        setInputs({ perfect: saved.perfect || 0, great: saved.great || 0, good: saved.good || 0, bad: saved.bad || 0, miss: saved.miss || 0 });
      } else {
        setInputs({ perfect: 0, great: 0, good: 0, bad: 0, miss: 0 });
      }
    }
  }, [selectedEntry, results]);

  const calculatePerfectPlus = () => {
    if (!selectedEntry) return 0;
    const totalNotes = getNotes(selectedEntry.song, selectedEntry.diff);
    return Math.max(0, totalNotes - (inputs.perfect + inputs.great + inputs.good + inputs.bad + inputs.miss));
  };

  const calculateAccuracy = useCallback((r: any, total: number) => {
    if (!r || total === 0 || isNaN(total)) return null;
    // PERFECT+=101, PERFECT=100, GREAT=75, GOOD=45, BAD/MISS=0
    // r.perfectPlus, r.perfect, r.great, r.good
    const pPlus = r.perfectPlus || 0;
    const p = r.perfect || 0;
    const gr = r.great || 0;
    const go = r.good || 0;
    
    const accuracy = ((pPlus * 101) + (p * 100) + (gr * 75) + (go * 45)) / total;
    return accuracy.toFixed(4); // max 101.0000
  }, []);

  const handleSave = async () => {
    if (!selectedEntry) return;
    const perfectPlus = calculatePerfectPlus();
    const totalNotes = getNotes(selectedEntry.song, selectedEntry.diff);

    let autoClearStatus: "AP" | "FC" | "CLEAR" = "CLEAR";
    if (inputs.perfect === 0 && inputs.great === 0 && inputs.good === 0 && inputs.bad === 0 && inputs.miss === 0) {
      autoClearStatus = "AP"; // PERFECT+ のみの場合もAP (もしくはAP+的な表示にするか？)
    } else if (inputs.great === 0 && inputs.good === 0 && inputs.bad === 0 && inputs.miss === 0) {
      autoClearStatus = "AP"; // ゆめすてだとどれがAP扱いかは定義によるが一旦PとP+のみでAP
    } else if (inputs.bad === 0 && inputs.miss === 0) {
      autoClearStatus = "FC";
    }

    const resultKey = `YM_${selectedEntry.song.No}-${selectedEntry.diff}`;
    const newResult: PlayResult = {
      songNo: `YM_${selectedEntry.song.No}`,
      difficulty: selectedEntry.diff,
      perfectPlus,
      perfect: inputs.perfect,
      great: inputs.great,
      good: inputs.good,
      bad: inputs.bad,
      miss: inputs.miss,
      clearType: autoClearStatus,
      accuracy: calculateAccuracy({ perfectPlus, ...inputs }, totalNotes) || "0.0000",
      updatedAt: Date.now()
    };

    if (isLoggedIn) {
      const prevResult = results[resultKey];
      setLastSavedResult(prevResult || null);
      setResults(prev => ({ ...prev, [resultKey]: newResult }));
      setUndoProgress(100);
      setUndoKey(Date.now());
      setShowUndo(true);
      setToastMessage("記録を保存しました！");

      try {
        await db.playResults.upsert(newResult);
      } catch (e) {
        setResults(prev => {
          const next = { ...prev };
          if (prevResult) next[resultKey] = prevResult;
          else delete next[resultKey];
          return next;
        });
        setToastMessage("クラウド保存に失敗しました。");
      }
    } else {
      setToastMessage("保存に失敗しました。ログインが必要です。");
    }
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleUndo = async () => {
    if (!selectedEntry || !showUndo) return;
    const resultKey = `YM_${selectedEntry.song.No}-${selectedEntry.diff}`;
    
    if (lastSavedResult) {
      await db.playResults.upsert(lastSavedResult);
      setResults(prev => ({ ...prev, [resultKey]: lastSavedResult }));
      setInputs({ 
        perfect: lastSavedResult.perfect || 0, great: lastSavedResult.great, good: lastSavedResult.good, bad: lastSavedResult.bad, miss: lastSavedResult.miss 
      });
    } else {
      await db.playResults.delete(`YM_${selectedEntry.song.No}`, selectedEntry.diff);
      setResults(prev => {
        const next = { ...prev };
        delete next[resultKey];
        return next;
      });
      setInputs({ perfect: 0, great: 0, good: 0, bad: 0, miss: 0 });
    }
    
    setShowUndo(false);
    setToastMessage("取り消しました。");
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleResetRecord = async () => {
    if (!selectedEntry || !isLoggedIn) return;
    if (!confirm("本当に消去しますか？")) return;

    const resultKey = `YM_${selectedEntry.song.No}-${selectedEntry.diff}`;
    await db.playResults.delete(`YM_${selectedEntry.song.No}`, selectedEntry.diff);
    
    setResults(prev => {
      const next = { ...prev };
      delete next[resultKey];
      return next;
    });
    setInputs({ perfect: 0, great: 0, good: 0, bad: 0, miss: 0 });
    setToastMessage("リセットしました。");
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
    if (!showUndo) return;
    const startTime = Date.now();
    const duration = 5000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setUndoProgress(remaining);
      if (elapsed >= duration) {
        setShowUndo(false);
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [showUndo, undoKey]);

  const handleQuickAP = useCallback(async (entry: ListEntry) => {
    if (!isLoggedIn) {
       setToastMessage("失敗：ログインが必要");
       setTimeout(() => setToastMessage(""), 3000);
       return;
    }

    const totalNotes = getNotes(entry.song, entry.diff);
    if (!totalNotes) { setToastMessage("ノーツ数が不明です"); return; }
    
    const resultKey = `YM_${entry.song.No}-${entry.diff}`;
    const newResult: PlayResult = {
      songNo: `YM_${entry.song.No}`,
      difficulty: entry.diff,
      perfectPlus: totalNotes, // ここではすべてP+とする
      perfect: 0, great: 0, good: 0, bad: 0, miss: 0,
      clearType: "AP",
      accuracy: "101.0000",
      updatedAt: Date.now()
    };

    const prevResult = results[resultKey];
    setLastSavedResult(prevResult || null);
    setSelectedEntry(entry);

    setResults(prev => ({ ...prev, [resultKey]: newResult }));
    setUndoProgress(100);
    setUndoKey(Date.now());
    setShowUndo(true);
    setToastMessage(`${entry.song.曲名} を AP で保存しました！`);

    try { await db.playResults.upsert(newResult); } catch (e) {
      setResults(prev => {
        const next = { ...prev };
        if (prevResult) next[resultKey] = prevResult;
        else delete next[resultKey];
        return next;
      });
      setToastMessage("保存に失敗しました。");
    }
    setTimeout(() => setToastMessage(""), 3000);
  }, [isLoggedIn, results, getNotes]);

  const handleBatchAP = async () => {
    if (!isLoggedIn || listEntries.length === 0) return;
    setIsProcessingBatch(true);

    const now = Date.now();
    const batchData: PlayResult[] = listEntries.map(entry => {
      const totalNotes = getNotes(entry.song, entry.diff);
      return {
        songNo: `YM_${entry.song.No}`,
        difficulty: entry.diff,
        perfectPlus: totalNotes,
        perfect: 0, great: 0, good: 0, bad: 0, miss: 0,
        clearType: "AP",
        accuracy: "101.0000",
        updatedAt: now
      };
    });

    try {
      await db.playResults.upsertMany(batchData);
      const newResults = { ...results };
      batchData.forEach(r => { newResults[`${r.songNo}-${r.difficulty}`] = r; });
      setResults(newResults);
      setIsProcessingBatch(false);
      setIsBatchModalOpen(false);
      setToastMessage(`${listEntries.length} 件を一括 AP 保存しました！`);
    } catch (e) {
      setIsProcessingBatch(false);
      setToastMessage("一括保存に失敗しました。");
    }
    setTimeout(() => setToastMessage(""), 3000);
  };

  if (isLoading) {
    const pct = loadingProgress.total === 0 ? 0 : Math.round((loadingProgress.loaded / loadingProgress.total) * 100);
    return (
      <div className="flex flex-col items-center justify-center h-full absolute inset-0 w-full animate-fade-in-up bg-rose-50/50">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-10 shadow-2xl border border-white flex flex-col items-center max-w-sm w-full">
          <div className="w-16 h-16 border-4 border-rose-100 border-t-pink-500 rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">読み込み中...</h2>
          <div className="w-full bg-slate-100 h-3 rounded-full flex overflow-hidden">
            <div className="bg-gradient-to-r from-pink-400 to-purple-500 h-full transition-all" style={{ width: `${pct}%` }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full p-6 lg:p-8 gap-6 absolute inset-0 overflow-hidden bg-gradient-to-br from-pink-50/80 via-rose-50/60 to-purple-50/80">
      <div className="fixed top-8 right-8 z-[60] animate-fade-in-up">
        <div className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-full px-6 py-2 shadow-2xl flex items-center gap-6 group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
          <div className="flex flex-col">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Seisho Achievement</div>
            <div className="flex items-baseline gap-2">
              <div className="flex items-baseline gap-1 bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent">
                <span className="text-xl font-black font-mono italic leading-none">{seishoStats.earned}</span>
                <span className="text-[10px] font-black text-slate-300 mx-0.5">/</span>
                <span className="text-sm font-black font-mono text-slate-400 leading-none">{seishoStats.max}</span>
              </div>
              <div className="h-3 w-px bg-slate-200 mx-1" />
              <div className="flex items-baseline gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Rate</span>
                <span className="text-base font-black text-slate-900 font-mono tracking-tighter leading-none">{seishoStats.rate.toFixed(2)}%</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100/50">
            <div className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 transition-all duration-1000 shadow-[0_0_10px_rgba(236,72,153,0.4)]" style={{ width: `${seishoStats.rate}%` }} />
          </div>
        </div>
      </div>

      <div className={`fixed top-6 right-6 z-50 transition-all duration-500 transform ${toastMessage ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0 pointer-events-none"}`}>
        <div className="bg-white/90 backdrop-blur border-l-4 border-pink-400 p-4 rounded-xl shadow-2xl flex items-center gap-4">
          <div className="bg-pink-100 text-pink-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">✓</div>
          <div className="font-bold text-slate-700">{toastMessage}</div>
        </div>
      </div>

      {/* 左ペイン */}
      <div className="w-1/3 min-w-[320px] flex flex-col bg-white/70 backdrop-blur-xl rounded-[2rem] shadow-xl overflow-hidden border border-white shrink-0">
        <div className="p-5 bg-gradient-to-r from-pink-100/40 to-purple-100/40 border-b border-white/50 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xl font-black text-pink-500 tracking-tight">YumeSte Songs</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsQuickAPMode(!isQuickAPMode)}
                className={`text-[10px] font-black px-2 py-1 rounded-lg transition-all uppercase tracking-tighter shadow-sm border
                  ${isQuickAPMode ? "bg-pink-500 text-white border-pink-600 ring-2 ring-pink-300" : "bg-white text-slate-400"}
                `}
              >
                Quick AP {isQuickAPMode ? "ON" : "OFF"}
              </button>
              <button 
                onClick={() => setIsBatchModalOpen(true)}
                disabled={listEntries.length === 0}
                className="text-[10px] font-black px-2 py-1 bg-white text-purple-500 border border-purple-200 rounded-lg hover:bg-purple-50 disabled:opacity-30 transition-all uppercase shadow-sm"
              >
                Batch AP
              </button>
              <span className="text-xs font-bold px-2 py-1 bg-white/80 rounded-full text-slate-500">{listEntries.length} 譜面</span>
            </div>
          </div>

          <input
            type="text" placeholder="楽曲名で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/80 border border-slate-200 outline-none p-2.5 rounded-xl font-bold text-sm focus:ring-2 focus:ring-pink-300 transition-all shadow-inner"
          />

          <div className="flex gap-2 text-xs font-bold">
            <select value={filterDiff} onChange={e => setFilterDiff(e.target.value as any)} className="bg-white/80 p-2 rounded-lg border border-slate-200 outline-none flex-1">
              <option value="ALL">全難易度</option><option value="STELLA">STELLA</option><option value="OLIVIER">OLIVIER</option>
            </select>
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="bg-white/80 p-2 rounded-lg border border-slate-200 outline-none w-20">
              <option value="ALL">Lv</option>{levelOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={filterClearType} onChange={e => setFilterClearType(e.target.value as any)} className="bg-white/80 p-2 rounded-lg border border-slate-200 outline-none flex-1">
              <option value="ALL">状態</option><option value="NOCLEAR">未クリア</option><option value="CLEAR">CLEAR</option><option value="FC">FC</option><option value="AP">AP</option>
            </select>
          </div>
          <div className="flex gap-2 text-xs font-bold pt-1">
            <select value={sortType} onChange={e => setSortType(e.target.value as any)} className="bg-white/90 p-2 rounded-lg border border-slate-200 outline-none flex-1">
              <option value="name_asc">五十音順</option>
              <option value="level_desc">難易度 (高い順)</option>
              <option value="level_asc">難易度 (低い順)</option>
              <option value="acc_desc">達成率 (高い順)</option>
              <option value="acc_asc">達成率 (低い順)</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {listEntries.map((entry, idx) => {
            const resultKey = `YM_${entry.song.No}-${entry.diff}`;
            const saved = results[resultKey];
            const isSelected = selectedEntry?.song.No === entry.song.No && selectedEntry?.diff === entry.diff;

            const levelNum = parseLevel(entry.level);
            const accuracyVal = saved ? parseFloat(saved.accuracy) : 0;
            const perfBelow = saved ? (saved.perfect || 0) + (saved.great || 0) + (saved.good || 0) + (saved.bad || 0) + (saved.miss || 0) : 0;

            let ratingVal = null;
            if (saved) {
              if (entry.diff === "OLIVIER") {
                ratingVal = calculateSeishoDetailed(levelNum, accuracyVal, perfBelow, saved.clearType).total;
              } else {
                ratingVal = calculateSingleRating(String(levelNum), accuracyVal);
              }
            }

            return (
              <SongListItem 
                key={resultKey} entry={entry} saved={saved} isSelected={isSelected} isQuickAPMode={isQuickAPMode}
                onClick={() => !isQuickAPMode && setSelectedEntry(entry)}
                onDoubleClick={() => isQuickAPMode && handleQuickAP(entry)}
                calculateAccuracy={calculateAccuracy} getNotes={getNotes}
                rating={ratingVal}
                style={{ animationDelay: `${idx * 0.03}s` }}
              />
            );
          })}
        </div>
      </div>

      {/* 右ペイン */}
      <div className="flex-1 flex flex-col items-center justify-start pt-32 p-4 relative">
        {!selectedEntry ? (
          <div className="text-slate-400 font-bold bg-white/40 backdrop-blur px-8 py-4 rounded-full border border-white/50 tracking-wider">
            左のリストから楽曲を選択してください
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-white/85 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border-2 border-white/80 overflow-hidden flex flex-col h-full animate-fade-in-up relative">
            <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-1000
              ${selectedEntry.diff === "STELLA" ? "bg-purple-500" : "bg-slate-900"}`} />

            <div className="px-10 pt-8 pb-4 flex items-end gap-6 relative z-10 border-b border-white/50 bg-white/40">
              <div className="w-24 h-24 bg-slate-100 rounded-[1.5rem] shadow-inner border-2 border-slate-200/50 flex flex-col items-center justify-center shrink-0 overflow-hidden relative group">
                <img 
                  src={`https://cdn.wikiwiki.jp/to/w/wds/収録楽曲一覧/::attach/${encodeURIComponent(selectedEntry.song.曲名)}.png`}
                  alt={selectedEntry.song.曲名}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-black text-white ${selectedEntry.diff === "STELLA" ? "bg-purple-600" : "bg-slate-900"}`}>
                    {selectedEntry.diff} {selectedEntry.level}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter leading-tight">{selectedEntry.song.曲名}</h2>
              </div>
              <div className="text-right pb-1">
                <div className="text-xs font-black text-slate-400 tracking-wider mb-1 uppercase">{selectedEntry.diff === "OLIVIER" ? "Current Seisho" : "Best Accuracy"}</div>
                {selectedEntry.diff === "OLIVIER" ? (
                  <div className="text-5xl font-black text-slate-900 font-mono italic">
                    {(() => {
                      const saved = results[`YM_${selectedEntry.song.No}-${selectedEntry.diff}`];
                      if (!saved) return "---";
                      const perfBelow = (saved.perfect || 0) + (saved.great || 0) + (saved.good || 0) + (saved.bad || 0) + (saved.miss || 0);
                      return calculateSeishoDetailed(parseLevel(selectedEntry.level), parseFloat(saved.accuracy), perfBelow, saved.clearType).total;
                    })()}
                  </div>
                ) : (
                  <div className="text-3xl font-black font-mono text-purple-500 border-b-2 border-purple-200 pb-1">
                    {results[`YM_${selectedEntry.song.No}-${selectedEntry.diff}`]?.accuracy || "---.----"}<span className="text-lg opacity-70 ml-1">%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 px-8 pb-8 pt-4 flex flex-col relative z-10 overflow-y-auto">
              <div className="bg-slate-50/50 rounded-[2rem] p-6 border border-white/60 shadow-inner flex flex-col h-full overflow-y-auto min-h-[350px]">
                <div className="flex justify-between items-center mb-6 px-8 shrink-0">
                  <div className="flex-1 text-center">
                    <div className="text-cyan-400 font-black text-xs tracking-widest mb-1">PERFECT+</div>
                    <div className="text-5xl font-black font-mono text-cyan-400 transition-all duration-300">
                      {calculatePerfectPlus()}
                    </div>
                  </div>
                  <div className="w-px h-12 bg-slate-200/80 mx-4" />
                  <div className="flex-1 text-center">
                    <div className="text-slate-400 font-black text-xs tracking-widest mb-1">TOTAL NOTES</div>
                    <div className="text-3xl font-black font-mono text-slate-400">
                      {getNotes(selectedEntry.song, selectedEntry.diff)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 flex-1 mb-4">
                  {[
                    // 水色、薄紫、オレンジ、青、紫、灰色
                    { key: "perfect", label: "PERFECT", colorClasses: { label: "text-purple-300", bgLine: "bg-purple-300/30 group-focus-within:bg-purple-300", ring: "focus-within:ring-purple-200", input: "text-purple-400" } },
                    { key: "great", label: "GREAT", colorClasses: { label: "text-orange-400", bgLine: "bg-orange-400/20 group-focus-within:bg-orange-400", ring: "focus-within:ring-orange-300", input: "text-orange-500" } },
                    { key: "good", label: "GOOD", colorClasses: { label: "text-blue-500", bgLine: "bg-blue-500/20 group-focus-within:bg-blue-500", ring: "focus-within:ring-blue-300", input: "text-blue-600" } },
                    { key: "bad", label: "BAD", colorClasses: { label: "text-purple-600", bgLine: "bg-purple-600/20 group-focus-within:bg-purple-600", ring: "focus-within:ring-purple-300", input: "text-purple-700" } },
                    { key: "miss", label: "MISS", colorClasses: { label: "text-slate-400", bgLine: "bg-slate-400/20 group-focus-within:bg-slate-400", ring: "focus-within:ring-slate-300", input: "text-slate-600" } },
                  ].map((j) => (
                    <label key={j.key} className={`bg-white rounded-[1.25rem] p-3 shadow-sm border border-slate-100 flex flex-col group transition-all duration-200 focus-within:ring-2 ${j.colorClasses.ring} hover:shadow-md cursor-text relative overflow-hidden`}>
                      <div className={`absolute top-0 left-0 w-full h-1 ${j.colorClasses.bgLine} transition-colors`} />
                      <span className={`text-[11px] font-black tracking-wider ${j.colorClasses.label} mb-1 uppercase`}>{j.label}</span>
                      <input
                        type="number" min="0" value={(inputs as any)[j.key] === 0 ? "" : (inputs as any)[j.key]} placeholder="0"
                        onChange={e => setInputs(prev => ({ ...prev, [j.key]: Number(e.target.value) }))}
                        className={`w-full text-right text-3xl font-black font-mono bg-transparent outline-none ${j.colorClasses.input} flex-1`}
                      />
                    </label>
                  ))}
                </div>

                <div className="flex gap-3 h-14 shrink-0">
                  <button onClick={handleResetRecord} className="w-14 h-14 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-200/50 group">
                    <span className="text-[10px] font-black uppercase tracking-tighter group-hover:scale-95 transition-transform">Reset</span>
                  </button>
                  <button onClick={handleSave} className="flex-1 bg-gradient-to-br from-pink-400 to-purple-500 text-white rounded-xl shadow-lg shadow-pink-500/30 font-black tracking-widest text-lg hover:shadow-pink-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer">
                    RECORD SAVE
                  </button>
                </div>

                {selectedEntry.diff === "OLIVIER" && (
                   <SeishoBreakdown 
                     level={selectedEntry.level} 
                     accuracy={calculateAccuracy({ perfectPlus: calculatePerfectPlus(), ...inputs }, getNotes(selectedEntry.song, selectedEntry.diff)) || "0.0000"}
                     inputs={inputs}
                     clearType={(() => {
                        if (inputs.great === 0 && inputs.good === 0 && inputs.bad === 0 && inputs.miss === 0) return "AP";
                        if (inputs.bad === 0 && inputs.miss === 0) return "FC";
                        return "CLEAR";
                     })()}
                   />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showUndo && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-up">
          <div className="bg-slate-900 border border-white/20 shadow-2xl rounded-2xl p-4 flex items-center gap-6 text-white min-w-[320px] relative overflow-hidden">
            <div className="flex-1">
              <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Recent Change</div>
              <div className="text-sm font-bold truncate max-w-[200px]">{selectedEntry?.song.曲名} ({selectedEntry?.diff})</div>
            </div>
            <button onClick={handleUndo} className="bg-white text-slate-900 px-6 py-2 rounded-xl font-black text-xs hover:bg-rose-400 hover:text-white transition-all active:scale-95">UNDO</button>
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-rose-400 to-purple-500 transition-all duration-75" style={{ width: `${undoProgress}%` }} />
          </div>
        </div>
      )}

      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-white/50">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl font-black italic">AP</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">一括 AP 処理</h3>
              <p className="text-slate-500 font-bold leading-relaxed">
                リストに表示中の <span className="text-purple-500 text-xl mx-1">{listEntries.length}</span> 譜面を「AP」で保存します。
              </p>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setIsBatchModalOpen(false)} disabled={isProcessingBatch} className="flex-1 py-4 rounded-2xl font-black text-slate-500 bg-white border border-slate-200">CANCEL</button>
              <button onClick={handleBatchAP} disabled={isProcessingBatch} className="flex-1 py-4 rounded-2xl font-black text-white bg-purple-500 shadow-lg shadow-purple-200 flex items-center justify-center gap-2">
                {isProcessingBatch ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "EXECUTE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}