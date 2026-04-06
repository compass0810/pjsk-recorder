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
  rating,
  style 
}: { 
  entry: ListEntry, 
  saved: PlayResult | undefined, 
  isSelected: boolean, 
  isQuickAPMode: boolean,
  onClick: () => void,
  onDoubleClick?: () => void,
  rating: number | null,
  style: React.CSSProperties
}) => {
  const diffColor = entry.diff === "STELLA" ? "bg-purple-600" : "bg-slate-900";
  const diffRingColor = entry.diff === "STELLA" ? "ring-purple-400" : "ring-slate-700";
  const diffTextColor = entry.diff === "STELLA" ? "text-purple-600" : "text-slate-900";

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
            
            {entry.diff === "OLIVIER" ? (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-900 text-white ml-auto tabular-nums flex items-center gap-1">
                <span className="text-[8px] opacity-70">星章</span> {rating ? Math.round(rating) : 0}
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

const SeishoBreakdown = ({ level, accuracy, inputs, clearType, saved }: { level: string, accuracy: string, inputs: any, clearType: any, saved?: PlayResult }) => {
  const levelNum = parseLevel(level);
  const currentAcc = parseFloat(accuracy);
  const currentPerfBelow = inputs.perfect + inputs.great + inputs.good + inputs.bad + inputs.miss;
  const current = calculateSeishoDetailed(levelNum, currentAcc, currentPerfBelow, clearType);

  // 自己ベスト側のデータ
  const bestAcc = saved ? parseFloat(saved.accuracy) : 0;
  // 達成率ベストのプレイ時の判定合計
  const bestPerfBelow = saved ? (saved.perfect || 0) + (saved.great || 0) + (saved.good || 0) + (saved.bad || 0) + (saved.miss || 0) : 999;
  const bestClearType = saved ? saved.clearType : "CLEAR";
  
  // 未記録時の表示ガード
  const isUnplayed = !saved && currentAcc === 0 && clearType === "CLEAR";

  // それぞれの分野で独立したベストを採用
  const displayBestAccPts = saved ? (saved.bestAccPts ?? calculateSeishoDetailed(levelNum, bestAcc, bestPerfBelow, bestClearType).accuracyPoints) : 0;
  const displayBestJudgePts = saved ? (saved.bestJudgePts ?? calculateSeishoDetailed(levelNum, bestAcc, bestPerfBelow, bestClearType).judgmentPoints) : 0;
  const displayBestLampPts = saved ? (saved.bestLampPts ?? calculateSeishoDetailed(levelNum, bestAcc, bestPerfBelow, bestClearType).lampPoints) : 0;
  const displayBestTotal = displayBestAccPts + displayBestJudgePts + displayBestLampPts;

  const ProgressItem = ({ 
    label, currentVal, bestVal, currentPts, bestPts, max, next, hint, units 
  }: { 
    label: string, currentVal: string | number, bestVal: string | number, currentPts: number, bestPts: number, max: number, next: any, hint: string, units: string 
  }) => (
    <div className="bg-white/60 rounded-2xl p-4 border border-white/50 shadow-sm overflow-hidden relative group">
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="flex-1">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Current</span>
              <span className="text-sm font-black text-slate-800 tabular-nums leading-none">{currentVal}{units}</span>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Best</span>
              <span className="text-sm font-black text-slate-500 tabular-nums leading-none">{bestVal}{units}</span>
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className={`text-2xl font-black tabular-nums leading-none ${currentPts > bestPts ? "text-pink-500" : "text-slate-900"}`}>
            +{currentPts}
          </div>
          <div className="text-[10px] font-bold text-slate-400">Best: {bestPts}pt</div>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative mb-1">
        <div className="absolute inset-0 bg-slate-200/50" />
        <div className={`absolute h-full transition-all duration-1000 ${currentPts >= bestPts ? "bg-pink-500" : "bg-slate-400"}`} style={{ width: `${(currentPts / max) * 100}%`, zIndex: 10 }} />
        <div className="absolute h-full bg-slate-300 opacity-50" style={{ width: `${(bestPts / max) * 100}%`, zIndex: 5 }} />
      </div>
      {(next && !isUnplayed) && (
        <div className="text-[9px] font-black text-slate-500 flex justify-between mt-1">
          <span>NEXT</span>
          <span className="text-pink-500">{hint}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-8 space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-3 px-4 mb-2">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Seisho Comparison</div>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        <ProgressItem 
          label="A: Accuracy (達成率)" currentVal={`${currentAcc.toFixed(4)}`} bestVal={`${bestAcc.toFixed(4)}`} units="%"
          max={50 + levelNum * 10} currentPts={isUnplayed ? 0 : current.accuracyPoints} bestPts={isUnplayed ? 0 : displayBestAccPts}
          next={current.nextAccuracyThreshold} hint={current.nextAccuracyThreshold ? `Next: ${current.nextAccuracyThreshold.toFixed(2)}% (+${(current.nextAccuracyThreshold - currentAcc).toFixed(4)}%)` : "MAX"}
        />
        <ProgressItem 
          label="B: Judgment (判定精度)" currentVal={currentPerfBelow} bestVal={isUnplayed ? "-" : (saved ? bestPerfBelow : "-")} units=" hits"
          max={5} currentPts={isUnplayed ? 0 : current.judgmentPoints} bestPts={isUnplayed ? 0 : displayBestJudgePts}
          next={current.nextJudgmentThreshold} hint={current.nextJudgmentThreshold !== null ? `Next: ${current.nextJudgmentThreshold} or below (-${currentPerfBelow - current.nextJudgmentThreshold})` : "MAX"}
        />
        <ProgressItem 
          label="C: Lamp (クリアランプ)" currentVal={currentAcc === 0 ? "-" : clearType} bestVal={isUnplayed ? "-" : (saved ? bestClearType : "-")} units=""
          max={5} currentPts={isUnplayed ? 0 : current.lampPoints} bestPts={isUnplayed ? 0 : displayBestLampPts}
          next={current.nextLampGoal} hint={current.nextLampGoal ? `Goal: ${current.nextLampGoal}` : "MAX"}
        />
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 text-center shadow-xl shadow-slate-900/20 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
        <div className="flex justify-center items-baseline gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current</span>
            <div className="text-4xl font-black text-pink-500 tabular-nums tracking-tighter italic">
              {isUnplayed ? 0 : current.total}
            </div>
          </div>
          <div className="w-px h-12 bg-slate-700 mx-2" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Best</span>
            <div className="text-6xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg group-hover:scale-105 transition-transform duration-500">
              {isUnplayed ? 0 : displayBestTotal}
            </div>
          </div>
        </div>
        <div className="mt-4 text-[10px] font-bold text-slate-500 italic">Composite Evaluation System for OLIVIER</div>
      </div>
    </div>
  );
};

const InputGroup = ({ label, value, onChange, color }: { label: string, value: number, onChange: (v: number) => void, color: string }) => (
  <div className="bg-white/60 p-2.5 rounded-2xl border border-white/80 shadow-sm flex flex-col justify-center">
    <div className={`text-[10px] font-black uppercase tracking-widest mb-1 leading-none ${color}`}>{label}</div>
    <div className="flex items-center gap-4">
      <input
        type="number"
        value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        onFocus={e => e.target.select()}
        className="text-2xl font-black text-slate-800 tabular-nums bg-transparent w-full outline-none"
      />
      <div className="flex flex-col gap-1">
        <button onClick={() => onChange(value + 1)} className="p-1 hover:bg-slate-100 rounded-md text-slate-400">▲</button>
        <button onClick={() => onChange(Math.max(0, value - 1))} className="p-1 hover:bg-slate-100 rounded-md text-slate-400">▼</button>
      </div>
    </div>
  </div>
);

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

  const getNotes = useCallback((song: YumesteSong, diff: YumesteDifficulty) => {
    const val = diff === "STELLA" ? song.STELLAノーツ : song.OLIVIERノーツ;
    if (!val) return 0;
    return Number(String(val).replace(/,/g, "")) || 0;
  }, []);

  const calculatePerfectPlus = () => {
    if (!selectedEntry) return 0;
    const totalNotes = getNotes(selectedEntry.song, selectedEntry.diff);
    return Math.max(0, totalNotes - (inputs.perfect + inputs.great + inputs.good + inputs.bad + inputs.miss));
  };

  const calculateAccuracy = useCallback((r: any, total: number) => {
    if (!r || total === 0 || isNaN(total)) return null;
    const pPlus = r.perfectPlus || 0;
    const p = r.perfect || 0;
    const gr = r.great || 0;
    const go = r.good || 0;
    const accuracy = ((pPlus * 101) + (p * 100) + (gr * 75) + (go * 45)) / total;
    return accuracy.toFixed(4);
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
        if (!r) return -1;
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
      const levelStr = song.OLIVIER難易度;
      if (levelStr && levelStr !== "-" && levelStr !== "***" && levelStr.trim() !== "") {
        const levelNum = parseLevel(levelStr);
        max += (60 + levelNum * 10);
        const res = results[`YM_${song.No}-OLIVIER`];
        if (res) {
          if (res.bestAccPts !== undefined) {
            earned += (res.bestAccPts || 0) + (res.bestJudgePts || 0) + (res.bestLampPts || 0);
          } else {
            const perfBelow = (res.perfect || 0) + (res.great || 0) + (res.good || 0) + (res.bad || 0) + (res.miss || 0);
            const seisho = calculateSeishoDetailed(levelNum, parseFloat(res.accuracy), perfBelow, res.clearType);
            earned += seisho.total;
          }
        }
      }
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
    return Array.from(levels).sort((a, b) => parseLevel(a) - parseLevel(b) || a.localeCompare(b));
  }, [songs]);

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

  const handleSave = async () => {
    if (!selectedEntry) return;
    const perfectPlus = calculatePerfectPlus();
    const totalNotes = getNotes(selectedEntry.song, selectedEntry.diff);
    const currentAccStr = calculateAccuracy({ perfectPlus, ...inputs }, totalNotes) || "0.0000";
    const currentAccNum = parseFloat(currentAccStr);

    let autoClearStatus: "AP" | "FC" | "CLEAR" = "CLEAR";
    if (inputs.great === 0 && inputs.good === 0 && inputs.bad === 0 && inputs.miss === 0) {
      autoClearStatus = "AP";
    } else if (inputs.bad === 0 && inputs.miss === 0) {
      autoClearStatus = "FC";
    }

    const resultKey = `YM_${selectedEntry.song.No}-${selectedEntry.diff}`;
    const prevResult = results[resultKey];
    const lvNum = parseLevel(selectedEntry.level);
    const currentPerfBelow = inputs.perfect + inputs.great + inputs.good + inputs.bad + inputs.miss;
    const currentSeisho = calculateSeishoDetailed(lvNum, currentAccNum, currentPerfBelow, autoClearStatus);

    let finalResult: PlayResult;

    if (prevResult) {
      const isNewBestAcc = currentAccNum > parseFloat(prevResult.accuracy);
      const rankMap = { "AP": 3, "FC": 2, "CLEAR": 1, "FAILED": 0 };
      
      finalResult = {
        ...prevResult,
        updatedAt: Date.now(),
        ...(isNewBestAcc ? {
          accuracy: currentAccStr,
          perfectPlus,
          perfect: inputs.perfect,
          great: inputs.great,
          good: inputs.good,
          bad: inputs.bad,
          miss: inputs.miss,
        } : {}),
        bestAccPts: Math.max(prevResult.bestAccPts || 0, currentSeisho.accuracyPoints),
        bestJudgePts: Math.max(prevResult.bestJudgePts || 0, currentSeisho.judgmentPoints),
        bestLampPts: Math.max(prevResult.bestLampPts || 0, currentSeisho.lampPoints),
        clearType: (rankMap[autoClearStatus] || 0) > (rankMap[prevResult.clearType] || 0) ? autoClearStatus : prevResult.clearType
      };
    } else {
      finalResult = {
        songNo: `YM_${selectedEntry.song.No}`,
        difficulty: selectedEntry.diff,
        perfectPlus,
        perfect: inputs.perfect,
        great: inputs.great,
        good: inputs.good,
        bad: inputs.bad,
        miss: inputs.miss,
        clearType: autoClearStatus,
        accuracy: currentAccStr,
        bestAccPts: currentSeisho.accuracyPoints,
        bestJudgePts: currentSeisho.judgmentPoints,
        bestLampPts: currentSeisho.lampPoints,
        updatedAt: Date.now()
      };
    }

    if (isLoggedIn) {
      setLastSavedResult(prevResult || null);
      setResults(prev => ({ ...prev, [resultKey]: finalResult }));
      setUndoProgress(100);
      setUndoKey(Date.now());
      setShowUndo(true);
      setToastMessage("記録を保存しました！");
      try { await db.playResults.upsert(finalResult); } catch (e) {
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
      setResults(prev => ({ ...prev, [resultKey]: lastSavedResult! }));
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
    const lvNum = parseLevel(entry.level);
    const seisho = calculateSeishoDetailed(lvNum, 101, 0, "AP");
    const newResult: PlayResult = {
      songNo: `YM_${entry.song.No}`,
      difficulty: entry.diff,
      perfectPlus: totalNotes,
      perfect: 0, great: 0, good: 0, bad: 0, miss: 0,
      clearType: "AP",
      accuracy: "101.0000",
      bestAccPts: seisho.accuracyPoints,
      bestJudgePts: seisho.judgmentPoints,
      bestLampPts: seisho.lampPoints,
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
      const lvNum = parseLevel(entry.level);
      const seisho = calculateSeishoDetailed(lvNum, 101, 0, "AP");
      return {
        songNo: `YM_${entry.song.No}`,
        difficulty: entry.diff,
        perfectPlus: totalNotes,
        perfect: 0, great: 0, good: 0, bad: 0, miss: 0,
        clearType: "AP",
        accuracy: "101.0000",
        bestAccPts: seisho.accuracyPoints,
        bestJudgePts: seisho.judgmentPoints,
        bestLampPts: seisho.lampPoints,
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
                if (saved.bestAccPts !== undefined) {
                  ratingVal = (saved.bestAccPts || 0) + (saved.bestJudgePts || 0) + (saved.bestLampPts || 0);
                } else {
                  ratingVal = calculateSeishoDetailed(levelNum, accuracyVal, perfBelow, saved.clearType).total;
                }
              } else {
                ratingVal = calculateSingleRating(String(levelNum), accuracyVal);
              }
            }

            return (
              <SongListItem 
                key={resultKey} entry={entry} saved={saved} isSelected={isSelected} isQuickAPMode={isQuickAPMode}
                onClick={() => !isQuickAPMode && setSelectedEntry(entry)}
                onDoubleClick={() => isQuickAPMode && handleQuickAP(entry)}
                rating={ratingVal}
                style={{ animationDelay: `${idx * 0.03}s` }}
              />
            );
          })}
        </div>
      </div>

      {/* 右ペイン: 入力フォーム */}
      <div className="flex-1 flex flex-col items-center justify-start pt-20 p-4 relative overflow-y-auto scrollbar-hide">
        {!selectedEntry ? (
          <div className="text-slate-400 font-bold bg-white/40 backdrop-blur px-8 py-4 rounded-full border border-white/50 tracking-wider h-max mt-20">
            左のリストから楽曲を選択してください
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-white/85 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border-2 border-white/80 flex flex-col shrink-0 animate-fade-in-up relative mb-10">
            <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-1000
              ${selectedEntry.diff === "STELLA" ? "bg-purple-500" : "bg-slate-500"}`} />

            {/* ヘッダー部 */}
            <div className="px-10 pt-10 pb-6 flex items-end gap-6 relative z-10">
              <div className="w-24 h-24 bg-slate-100 rounded-[1.5rem] shadow-inner border-2 border-slate-200/50 flex flex-col items-center justify-center shrink-0 overflow-hidden relative group">
                <img 
                  src={`https://cdn.wikiwiki.jp/to/w/wds/収録楽曲一覧/::attach/${encodeURIComponent(selectedEntry.song.曲名)}.png`}
                  alt={selectedEntry.song.曲名}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-black text-slate-800 truncate tracking-tight mb-2">
                  {selectedEntry.song.曲名}
                </h1>
                <div className="flex items-center gap-3">
                  <div className={`px-4 py-1.5 rounded-full text-white text-xs font-black shadow-sm flex items-center gap-2
                    ${selectedEntry.diff === "STELLA" ? "bg-purple-600 ring-2 ring-purple-100" : "bg-slate-900 ring-2 ring-slate-100"}`}>
                    <span className="opacity-80 uppercase tracking-widest">{selectedEntry.diff}</span>
                    <span className="text-base">Lv.{selectedEntry.level}</span>
                  </div>
                  
                  {/* Accuracy リアルタイム比較 */}
                  {(() => {
                    const resultKey = `YM_${selectedEntry.song.No}-${selectedEntry.diff}`;
                    const saved = results[resultKey];
                    const currentAccStr = calculateAccuracy({ perfectPlus: calculatePerfectPlus(), ...inputs }, getNotes(selectedEntry.song, selectedEntry.diff));
                    const bestAccStr = saved ? saved.accuracy : "0.0000";
                    const isNewBest = currentAccStr && parseFloat(currentAccStr) > parseFloat(bestAccStr);

                    return (
                      <div className="flex items-center gap-2 bg-white/60 self-stretch px-4 rounded-2xl border border-white/80 shadow-sm">
                        <div className="flex flex-col justify-center">
                          <span className="text-[8px] font-black text-slate-400 leading-none">CURRENT ACC</span>
                          <span className={`text-sm font-mono font-black leading-none mt-1 ${isNewBest ? "text-pink-500" : "text-slate-700"}`}>
                            {currentAccStr || "0.0000"}%
                          </span>
                        </div>
                        <div className="text-slate-300 mx-1 font-black">/</div>
                        <div className="flex flex-col justify-center">
                          <span className="text-[8px] font-black text-slate-400 leading-none">BEST ACC</span>
                          <span className="text-sm font-mono font-black text-slate-500 leading-none mt-1">{bestAccStr}%</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="px-10 pb-8 relative z-10 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 bg-cyan-50/50 p-3 rounded-2xl border border-cyan-100/50 flex flex-col justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-0.5 leading-none relative z-10">PERFECT+ (AUTO)</div>
                  <div className="text-3xl font-black text-cyan-500 tabular-nums leading-none relative z-10">
                    {calculatePerfectPlus()}
                  </div>
                </div>
                <InputGroup label="PERFECT" value={inputs.perfect} onChange={v => setInputs(prev => ({ ...prev, perfect: v }))} color="text-yellow-500" />
                <InputGroup label="GREAT" value={inputs.great} onChange={v => setInputs(prev => ({ ...prev, great: v }))} color="text-emerald-500" />
                <InputGroup label="GOOD" value={inputs.good} onChange={v => setInputs(prev => ({ ...prev, good: v }))} color="text-sky-500" />
                <InputGroup label="BAD" value={inputs.bad} onChange={v => setInputs(prev => ({ ...prev, bad: v }))} color="text-orange-500" />
                <InputGroup label="MISS" value={inputs.miss} onChange={v => setInputs(prev => ({ ...prev, miss: v }))} color="text-rose-500" />
              </div>

              <div className="flex gap-4">
                <button onClick={handleSave} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-slate-900/10">記録を保存</button>
                <button onClick={handleResetRecord} className="px-6 py-4 rounded-2xl border-2 border-slate-200 text-slate-400 hover:bg-slate-50 transition-all font-black">RESET</button>
              </div>

              {selectedEntry.diff === "OLIVIER" && (
                <SeishoBreakdown 
                  level={selectedEntry.level} 
                  accuracy={calculateAccuracy({ perfectPlus: calculatePerfectPlus(), ...inputs }, getNotes(selectedEntry.song, selectedEntry.diff)) || "0.0000"}
                  inputs={inputs}
                  clearType={
                    (() => {
                      if (inputs.great === 0 && inputs.good === 0 && inputs.bad === 0 && inputs.miss === 0) return "AP";
                      if (inputs.bad === 0 && inputs.miss === 0) return "FC";
                      return "CLEAR";
                    })()
                  }
                  saved={results[`YM_${selectedEntry.song.No}-${selectedEntry.diff}`]}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {showUndo && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-up">
           <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-700 relative overflow-hidden">
             <div className="absolute bottom-0 left-0 h-1 bg-pink-500 transition-all duration-50" style={{ width: `${undoProgress}%` }} />
             <span className="font-bold">保存しました</span>
             <button onClick={handleUndo} className="bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg text-xs font-black transition-all">UNDO</button>
           </div>
        </div>
      )}
    </div>
  );
}