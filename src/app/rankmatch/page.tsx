"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchSongs } from "@/lib/api";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { Song, RankMatchRecord, Difficulty, Top100Player } from "@/types";
import { calculateSimilarity } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

const RANKS = [
  { id: "master", name: "Master", base: 0, color: "from-purple-400 to-fuchsia-400", bg: "bg-purple-50", text: "text-purple-600", symbol: "✦" },
  { id: "diamond", name: "Diamond", base: -24, color: "from-emerald-400 to-teal-400", bg: "bg-emerald-50", text: "text-emerald-600", symbol: "♦" },
  { id: "platinum", name: "Platinum", base: -48, color: "from-cyan-400 to-blue-400", bg: "bg-cyan-50", text: "text-cyan-600", symbol: "★" },
  { id: "gold", name: "Gold", base: -72, color: "from-amber-400 to-yellow-400", bg: "bg-amber-50", text: "text-amber-600", symbol: "●" },
  { id: "silver", name: "Silver", base: -96, color: "from-slate-400 to-slate-300", bg: "bg-slate-50", text: "text-slate-600", symbol: "●" },
  { id: "bronze", name: "Bronze", base: -120, color: "from-orange-500 to-orange-400", bg: "bg-orange-50", text: "text-orange-600", symbol: "●" },
  { id: "beginner", name: "Beginner", base: -144, color: "from-lime-400 to-green-400", bg: "bg-lime-50", text: "text-lime-600", symbol: "✤" },
];

function getRankInfo(totalPoints: number) {
  if (totalPoints >= 0) {
    return { ...RANKS[0], class: null, pointInClass: totalPoints };
  }
  if (totalPoints < -144) {
    return { ...RANKS[6], class: 1, pointInClass: 0 };
  }
  for (let i = 1; i < RANKS.length; i++) {
    const rank = RANKS[i];
    if (totalPoints >= rank.base) {
      const ptsAboveBase = totalPoints - rank.base;
      const c = Math.floor(ptsAboveBase / 6) + 1;
      return { ...rank, class: Math.min(c, 4), pointInClass: ptsAboveBase % 6 };
    }
  }
  return { ...RANKS[6], class: 1, pointInClass: 0 };
}



export default function RankMatchRecorder() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [records, setRecords] = useState<RankMatchRecord[]>([]);
  const [basePoints, setBasePoints] = useState(0);
  const [baseStats, setBaseStats] = useState({ win: 0, lose: 0, draw: 0, aps: 0 });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [top100Players, setTop100Players] = useState<Top100Player[]>([]);
  const [top100DataTime, setTop100DataTime] = useState("");

  const [selectedSongName, setSelectedSongName] = useState("");
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>("MAS");
  const [rivalName, setRivalName] = useState("");
  const debouncedRivalName = useDebounce(rivalName, 500);

  const [you, setYou] = useState({ gr: 0, go: 0, b: 0, m: 0, isZeroLife: false });
  const [rival, setRival] = useState({ gr: 0, go: 0, b: 0, m: 0 });
  const [isCountPoints, setIsCountPoints] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordTime, setRecordTime] = useState("");

  const [toastMessage, setToastMessage] = useState("");

  // Override Modal State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideRank, setOverrideRank] = useState(RANKS[0].id);
  const [overrideClass, setOverrideClass] = useState(1);
  const [overridePoint, setOverridePoint] = useState(0.0);
  const [overrideWin, setOverrideWin] = useState(0);
  const [overrideLose, setOverrideLose] = useState(0);
  const [overrideDraw, setOverrideDraw] = useState(0);
  const [overrideAps, setOverrideAps] = useState(0);

  useEffect(() => {
    fetchSongs().then(setSongs);
    
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      if (user) {
        const [cloudRecords, profile] = await Promise.all([
          db.rankMatch.getAll(),
          db.profile.get()
        ]);
        setRecords(cloudRecords);
        if (profile) {
          setBasePoints(parseFloat(profile.base_points));
          setBaseStats({ 
            win: profile.base_win, 
            lose: profile.base_lose, 
            draw: profile.base_draw, 
            aps: profile.base_aps 
          });
        }
      }
    };
    init();

    const fetchTop100 = async () => {
      try {
        const res = await fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vS9l4M9dIYIysExtETc_G238AWRe2-Cy3l9vOvBbRfjF-vNJ24XHbXQW9jmLX-W_n5f_YCS8D_c6AeI/pub?gid=1141253994&single=true&output=csv");
        const text = await res.text();
        const lines = text.split('\n');
        if (lines.length > 0) {
          const header = lines[0].split(',');
          if (header.length > 5) {
            setTop100DataTime(header[5].trim());
          }
          const players: Top100Player[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length >= 3 && cols[1].trim() !== "") {
              players.push({
                rank: parseInt(cols[0], 10),
                name: cols[1].trim(),
                score: cols[2].trim()
              });
            }
          }
          setTop100Players(players);
        }
      } catch (e) {
        console.error("Top100 fetch error:", e);
      }
    };
    fetchTop100();

    // 現在時刻のセット
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    setRecordTime(localISOTime);
  }, []);

  const stats = useMemo(() => {
    let win = 0, lose = 0, draw = 0, aps = 0;
    let recordsPointsOffset = 0;
    records.forEach(r => {
      if (r.result === "WIN") win++;
      else if (r.result === "LOSE") lose++;
      else draw++;

      if (r.you.clearType === "AP") aps++;
      
      const pChange = typeof r.pointChange === 'number' && !isNaN(r.pointChange) ? r.pointChange : 0;
      if (r.isCountPoints !== false) {
        recordsPointsOffset += pChange;
      }
    });
    const totalPoints = basePoints + recordsPointsOffset;
    return {
      matches: records.length + baseStats.win + baseStats.lose + baseStats.draw,
      win: win + baseStats.win,
      lose: lose + baseStats.lose,
      draw: draw + baseStats.draw,
      aps: aps + baseStats.aps,
      recordsPointsOffset,
      totalPoints
    };
  }, [records, basePoints, baseStats]);

  const winRateTotal = stats.win + stats.lose;
  const winRate = winRateTotal > 0 ? (stats.win / winRateTotal * 100).toFixed(1) : "0.0";

  const rankInfo = getRankInfo(stats.totalPoints);

  const songOptions = useMemo(() => songs.map(s => s.楽曲名), [songs]);

  const currentSong = songs.find(s => s.楽曲名 === selectedSongName);
  const currentLevel = currentSong
    ? currentSong[selectedDiff === "EXP" ? "X" : selectedDiff === "MAS" ? "M" : "A" as keyof Song] || "??"
    : "??";

  const calcPenalty = (gr: number, go: number, b: number, m: number) => {
    return (gr * 1) + (go * 2) + (b * 3) + (m * 3);
  };

  const calcResult = () => {
    const yPenalty = calcPenalty(you.gr, you.go, you.b, you.m);
    const rPenalty = calcPenalty(rival.gr, rival.go, rival.b, rival.m);

    let result: "WIN" | "LOSE" | "DRAW" = "DRAW";
    let pointChange = 0;

    if (yPenalty < rPenalty) { result = "WIN"; pointChange += 1.0; }
    else if (yPenalty > rPenalty) { result = "LOSE"; pointChange -= 1.0; }
    else {
      result = "DRAW";
      if (yPenalty === 0 && rPenalty === 0) pointChange += 1.0; 
    }

    let pClearType: "AP" | "FC" | "CLEAR" | "FAILED" = "CLEAR";

    if (you.isZeroLife) {
      pClearType = "FAILED";
      pointChange -= 0.3;
    } else {
      if (you.gr === 0 && you.go === 0 && you.b === 0 && you.m === 0) {
        pClearType = "AP";
        pointChange += 0.2;
      } else if (you.go === 0 && you.b === 0 && you.m === 0) {
        pClearType = "FC";
        if (result !== "DRAW") pointChange += 0.1;
      }
    }

    let rClearType: "AP" | "FC" | "CLEAR" | "FAILED" = "CLEAR";
    if (rival.gr === 0 && rival.go === 0 && rival.b === 0 && rival.m === 0) {
      rClearType = "AP";
    } else if (rival.go === 0 && rival.b === 0 && rival.m === 0) {
      rClearType = "FC";
    }

    return { result, yPenalty, rPenalty, pointChange, pClearType, rClearType };
  };

  const { result: currentResult, yPenalty, rPenalty, pointChange: currentPointChange, pClearType, rClearType } = calcResult();

  const handleAddRecord = async () => {
    if (!selectedSongName) {
      alert("楽曲名を選択してください。");
      return;
    }
    if (!isLoggedIn) {
      alert("ログインが必要です。アカウントページからログインしてください。");
      return;
    }

    const selectedSong = songs.find(s => s.楽曲名 === selectedSongName);
    const getNotes = (song: Song | undefined, diff: Difficulty) => {
      if (!song) return 0;
      const key = `コンボ\n(${diff})` as keyof Song;
      const val = song[key];
      if (!val) return 0;
      return Number(String(val).replace(/,/g, "")) || 0;
    };
    const songNotes = getNotes(selectedSong, selectedDiff);

    const recordData: RankMatchRecord = {
      id: editingId || Date.now().toString(),
      timestamp: new Date(recordTime).getTime(),
      songName: selectedSongName,
      difficulty: selectedDiff,
      level: currentLevel as string,
      rivalName: rivalName || "名無し",
      you: { perfect: Math.max(0, songNotes - (you.gr + you.go + you.b + you.m)), great: you.gr, good: you.go, bad: you.b, miss: you.m, clearType: pClearType },
      rival: { perfect: Math.max(0, songNotes - (rival.gr + rival.go + rival.b + rival.m)), great: rival.gr, good: rival.go, bad: rival.b, miss: rival.m, clearType: rClearType },
      result: currentResult,
      pointChange: currentPointChange,
      isCountPoints: isCountPoints
    };

    try {
      if (editingId) {
        await db.rankMatch.update(editingId, recordData);
        setRecords(records.map(r => r.id === editingId ? recordData : r));
        setToastMessage("戦績を更新しました！");
      } else {
        await db.rankMatch.insert(recordData);
        setRecords([recordData, ...records]);
        setToastMessage("戦績を記録しました！");
      }

      // Reset Form
      setYou({ gr: 0, go: 0, b: 0, m: 0, isZeroLife: false });
      setRival({ gr: 0, go: 0, b: 0, m: 0 });
      setRivalName("");
      setSelectedSongName("");
      setIsCountPoints(true);
      setEditingId(null);
      
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      setRecordTime(new Date(now.getTime() - offset).toISOString().slice(0, 16));
    } catch (e) {
      console.error("Rank Match Save Error:", e);
      // db.ts で local には保存されている
      setRecords(prev => {
        const exists = prev.find(r => r.id === recordData.id);
        if (exists) return prev.map(r => r.id === recordData.id ? recordData : r);
        return [recordData, ...prev];
      });
      setToastMessage("保存完了（一時的にローカルへ）");
      
      // フォームリセット
      setYou({ gr: 0, go: 0, b: 0, m: 0, isZeroLife: false });
      setRival({ gr: 0, go: 0, b: 0, m: 0 });
      setSelectedSongName("");
      setEditingId(null);
    }
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleEdit = (r: RankMatchRecord) => {
    setEditingId(r.id);
    setSelectedSongName(r.songName);
    setSelectedDiff(r.difficulty);
    setRivalName(r.rivalName);
    setYou({ 
      gr: r.you.great, 
      go: r.you.good, 
      b: r.you.bad, 
      m: r.you.miss, 
      isZeroLife: r.you.clearType === "FAILED" 
    });
    setRival({ 
      gr: r.rival.great, 
      go: r.rival.good, 
      b: r.rival.bad, 
      m: r.rival.miss 
    });
    setIsCountPoints(r.isCountPoints !== false);
    
    // 時刻のセット
    const d = new Date(r.timestamp);
    const offset = d.getTimezoneOffset() * 60000;
    setRecordTime(new Date(d.getTime() - offset).toISOString().slice(0, 16));
    
    // スクロールを上へ（モバイル対応）
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setYou({ gr: 0, go: 0, b: 0, m: 0, isZeroLife: false });
    setRival({ gr: 0, go: 0, b: 0, m: 0 });
    setRivalName("");
    setSelectedSongName("");
    setIsCountPoints(true);
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    setRecordTime(new Date(now.getTime() - offset).toISOString().slice(0, 16));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("この対戦記録を削除してよろしいですか？")) {
      await db.rankMatch.delete(id);
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const handleOverrideSave = async () => {
    if (!isLoggedIn) return;
    const rankObj = RANKS.find(r => r.id === overrideRank);
    if (!rankObj) return;

    let targetTotal = 0;
    if (rankObj.id === "master") {
      targetTotal = overridePoint;
    } else {
      targetTotal = rankObj.base + ((overrideClass - 1) * 6) + overridePoint;
    }

    const newBase = targetTotal - stats.recordsPointsOffset;
    
    await Promise.all([
      db.profile.updatePoints(newBase),
      db.profile.updateStats({ win: overrideWin, lose: overrideLose, draw: overrideDraw, aps: overrideAps })
    ]);

    setBasePoints(newBase);
    setBaseStats({ win: overrideWin, lose: overrideLose, draw: overrideDraw, aps: overrideAps });
    setIsOverrideModalOpen(false);

    setToastMessage("設定を保存しました");
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleExportCSV = () => {
    const header = ["日時","楽曲名","難易度","レベル","対戦相手","自分PERFECT","自分GREAT","自分GOOD","自分BAD","自分MISS","自分ClearType","相手PERFECT","相手GREAT","相手GOOD","相手BAD","相手MISS","相手ClearType","結果","ポイント変動"];
    const rows = records.map(r => [
      new Date(r.timestamp).toLocaleString('ja-JP'),
      r.songName,
      r.difficulty,
      r.level,
      r.rivalName || "名無し",
      r.you.perfect,
      r.you.great,
      r.you.good,
      r.you.bad,
      r.you.miss,
      r.you.clearType,
      r.rival.perfect,
      r.rival.great,
      r.rival.good,
      r.rival.bad,
      r.rival.miss,
      r.rival.clearType,
      r.result,
      r.pointChange > 0 ? `+${r.pointChange}` : r.pointChange
    ]);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); 
    a.href = url;
    a.download = `pjsk_rankmatch_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSync = async () => {
    if (!isLoggedIn || isSyncing) return;
    const unsynced = records.filter(r => !r.isSynced);
    if (unsynced.length === 0) {
      setToastMessage("すべてのデータが同期済みです");
      setTimeout(() => setToastMessage(""), 3000);
      return;
    }

    setIsSyncing(true);
    let successCount = 0;
    let failCount = 0;
    for (const r of unsynced) {
      try {
        await db.rankMatch.syncOne(r);
        successCount++;
      } catch (err) {
        failCount++;
        const msg = err instanceof Error ? err.message : (err as any)?.message ?? JSON.stringify(err);
        console.error("Sync error for", r.id, msg);
      }
    }
    
    // 最新状態を再取得
    const updated = await db.rankMatch.getAll();
    setRecords(updated);
    setIsSyncing(false);
    setToastMessage(
      failCount === 0
        ? `${successCount}件のデータを同期しました`
        : `${successCount}件同期、${failCount}件失敗しました`
    );
    setTimeout(() => setToastMessage(""), 3000);
  };

  const youBarWidth = Math.max(5, (yPenalty / (yPenalty + rPenalty || 1)) * 100);
  const rivalBarWidth = 100 - youBarWidth;
  const diffColor = selectedDiff === "EXP" ? "var(--color-diff-expert)" : selectedDiff === "MAS" ? "var(--color-diff-master)" : "var(--color-diff-append)";

  const matchedTop100Player = useMemo(() => {
    if (!debouncedRivalName || debouncedRivalName.length < 2) return null;
    return top100Players.find(p => calculateSimilarity(p.name, debouncedRivalName) >= 0.8);
  }, [top100Players, debouncedRivalName]);

  return (
    <div className="flex flex-col h-full p-6 lg:p-8 gap-6 absolute inset-0 overflow-y-auto w-full">

      {/* Toast */}
      <div className={`fixed top-6 right-6 z-50 transition-all duration-500 transform ${toastMessage ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0 pointer-events-none"}`}>
        <div className="bg-white/90 backdrop-blur border-l-4 border-rose-400 p-4 rounded-xl shadow-2xl flex items-center gap-4">
          <div className="bg-rose-100 text-rose-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">✓</div>
          <div className="font-bold text-slate-700">{toastMessage}</div>
        </div>
      </div>

      {/* ランク上書きモーダル */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-white/50">
            <div className="bg-gradient-to-r from-slate-100 to-slate-50 p-6 border-b border-slate-200">
              <h3 className="text-xl font-black text-slate-800">Rank Override</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">現在のランク情報を手動で設定します</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black tracking-widest text-slate-400 uppercase mb-1 block">Rank</label>
                <select value={overrideRank} onChange={e => setOverrideRank(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300">
                  {RANKS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              
              {overrideRank !== "master" && (
                <div>
                  <label className="text-xs font-black tracking-widest text-slate-400 uppercase mb-1 block">Class</label>
                  <select value={overrideClass} onChange={e => setOverrideClass(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300">
                    <option value={1}>Class 1 (最下位)</option>
                    <option value={2}>Class 2</option>
                    <option value={3}>Class 3</option>
                    <option value={4}>Class 4 (昇格直前)</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="text-xs font-black tracking-widest text-slate-400 uppercase mb-1 block">
                  {overrideRank === "master" ? "Total Points" : "Points in Class (0.0 - 5.9)"}
                </label>
                <input type="number" step="0.1" value={overridePoint} onChange={e => setOverridePoint(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold font-mono text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-xl" />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3 text-center">Base Counter Override</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black tracking-widest text-rose-400 uppercase">Win</label>
                    <input type="number" value={overrideWin} onChange={e => setOverrideWin(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-black font-mono text-slate-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black tracking-widest text-blue-400 uppercase">Lose</label>
                    <input type="number" value={overrideLose} onChange={e => setOverrideLose(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-black font-mono text-slate-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">Draw</label>
                    <input type="number" value={overrideDraw} onChange={e => setOverrideDraw(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-black font-mono text-slate-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black tracking-widest text-pink-400 uppercase">AP</label>
                    <input type="number" value={overrideAps} onChange={e => setOverrideAps(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-black font-mono text-slate-700" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setIsOverrideModalOpen(false)} className="flex-1 py-3 rounded-xl font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-colors">Cancel</button>
              <button onClick={handleOverrideSave} className="flex-1 py-3 rounded-xl font-black text-white bg-slate-800 hover:bg-slate-700 shadow-md shadow-slate-300 transition-all">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー戦績 */}
      <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] p-6 shadow-md border border-white flex flex-col xl:flex-row items-center justify-between gap-6 shrink-0 animate-fade-in-up">
        
        {/* レート・バッジ UI */}
        <div className="flex items-center gap-4 bg-white/60 p-4 rounded-2xl shadow-sm border border-slate-100 flex-1 w-full max-w-sm shrink-0">
          <div className={`w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br flex items-center justify-center ${rankInfo.color} shadow-lg text-white`}>
            <span className="text-3xl font-black drop-shadow-sm">{rankInfo.symbol}</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex justify-between items-center w-full">
              <span className="text-[10px] tracking-widest uppercase text-slate-400 font-bold">Current Rank</span>
              <button onClick={() => setIsOverrideModalOpen(true)} className="text-slate-400 hover:text-slate-600 transition-colors" title="ランクを手動で修正">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5 truncate">
              <h3 className={`text-xl font-black truncate ${rankInfo.text}`}>{rankInfo.name}</h3>
              {rankInfo.class && <span className={`text-xl font-black ${rankInfo.text}`}> {rankInfo.class}</span>}
            </div>
            {rankInfo.class ? (
              <div className="text-xs font-bold text-slate-500 font-mono mt-0.5">
                {rankInfo.pointInClass.toFixed(1)} <span className="text-[10px] text-slate-400 italic">/ 6.0 pt</span>
              </div>
            ) : (
              <div className="text-xs font-bold text-slate-500 font-mono mt-0.5">
                {rankInfo.pointInClass.toFixed(2)} pt
              </div>
            )}
            
            {rankInfo.class && (
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden shrink-0">
                <div className={`h-full bg-gradient-to-r ${rankInfo.color} transition-all duration-500`} style={{ width: `${(rankInfo.pointInClass / 6) * 100}%` }}></div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 w-full justify-between">
          <div className="flex items-baseline gap-4 md:gap-6 text-xl font-bold bg-slate-50/50 px-6 py-3 rounded-xl border border-slate-100 shadow-inner w-full md:w-auto justify-between flex-wrap">
            <div className="flex flex-col items-center"><span className="text-slate-700 text-3xl md:text-4xl font-black">{stats.matches}</span><span className="text-[10px] tracking-widest uppercase text-slate-400">Match</span></div>
            <div className="flex flex-col items-center"><span className="text-rose-500 text-3xl md:text-4xl font-black">{stats.win}</span><span className="text-[10px] tracking-widest uppercase text-rose-400">Win</span></div>
            <div className="flex flex-col items-center"><span className="text-blue-500 text-3xl md:text-4xl font-black">{stats.lose}</span><span className="text-[10px] tracking-widest uppercase text-blue-400">Lose</span></div>
            <div className="flex flex-col items-center"><span className="text-emerald-500 text-3xl md:text-4xl font-black">{stats.draw}</span><span className="text-[10px] tracking-widest uppercase text-emerald-400">Draw</span></div>
            <div className="flex flex-col items-center ml-2 border-l-2 border-slate-100 pl-4 md:pl-6">
              <span className="text-3xl md:text-4xl font-black text-rose-500">{winRate}%</span>
              <span className="text-[10px] tracking-widest uppercase font-bold text-slate-400">Win Rate</span>
            </div>
            <div className="flex flex-col items-center ml-2 border-l-2 border-slate-100 pl-4 md:pl-6">
              <span className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-sky-400">{stats.aps}</span>
              <span className="text-[10px] tracking-widest uppercase font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-sky-400">AP</span>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 text-right w-full md:w-auto">
            <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Total Score</div>
            <div className={`text-4xl font-black font-mono tracking-tighter shadow-sm bg-white px-4 py-2 rounded-xl border border-slate-100 w-full md:w-auto ${stats.totalPoints > 0 ? "text-cyan-500" : stats.totalPoints < 0 ? "text-rose-500" : "text-slate-400"}`}>
              {stats.totalPoints > 0 ? "+" : ""}{stats.totalPoints.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0">

        {/* 左: 新規レコード VS */}
        <div className="xl:w-[60%] flex flex-col bg-white/85 backdrop-blur-2xl rounded-[1.5rem] shadow-xl border border-white/80 shrink-0 p-5 relative animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

          <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
            <div className="flex-1 flex items-center bg-slate-50/80 rounded-lg shadow-sm border border-slate-100 pr-2 w-full overflow-hidden">
              {selectedSongName && (
                <div className="w-11 h-11 shrink-0 border-r border-slate-100 bg-white shadow-sm overflow-hidden">
                  <img 
                    src={`https://pjsekai.com/?plugin=ref&page=${encodeURIComponent(selectedSongName)}&src=${encodeURIComponent(selectedSongName)}.jpg`}
                    alt="jacket"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                  />
                </div>
              )}
              <input
                list="song-list" value={selectedSongName} onChange={e => setSelectedSongName(e.target.value)}
                placeholder="楽曲を選択..." className="w-full outline-none font-bold text-sm p-2 text-slate-800 placeholder:text-slate-400 bg-transparent px-3"
              />
              <datalist id="song-list">{songOptions.map(s => <option key={s} value={s} />)}</datalist>
            </div>

            <div className="flex items-center gap-2 bg-slate-50/80 rounded-lg shadow-sm border border-slate-100 overflow-hidden w-full sm:w-auto">
              <select value={selectedDiff} onChange={e => setSelectedDiff(e.target.value as any)} className="outline-none bg-transparent font-black px-3 py-2 text-slate-700 w-full sm:w-auto text-base">
                <option value="EXP">EXPERT</option><option value="MAS">MASTER</option><option value="APD">APPEND</option>
              </select>
              <div className="w-10 h-10 rounded-full border-[3px] flex items-center justify-center font-black mr-2 bg-white text-base shrink-0" style={{ borderColor: diffColor, color: diffColor }}>
                {currentLevel}
              </div>
            </div>

            <div className="font-black text-slate-300 mx-2 italic text-xl hidden sm:block">VS</div>

            <div className="flex-1 relative">
              <div className="bg-slate-50/80 rounded-lg shadow-sm border border-slate-100 w-full flex items-center">
                <input
                  type="text" value={rivalName} onChange={e => setRivalName(e.target.value)}
                  placeholder="RIVAL NAME" className="outline-none bg-transparent font-black text-blue-600 tracking-widest w-full text-base p-3 placeholder:text-slate-300"
                  list={stats.totalPoints >= 0 ? "top100-rivals" : undefined}
                />
                {stats.totalPoints >= 0 && top100Players.length > 0 && (
                  <datalist id="top100-rivals">
                    {top100Players.map(p => <option key={p.rank} value={p.name} />)}
                  </datalist>
                )}
              </div>
              {matchedTop100Player && (
                <div className="absolute top-full left-0 mt-2 flex items-center gap-1.5 animate-fade-in-up z-20 pointer-events-none">
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                    <span className="drop-shadow-sm">👑 TOP100</span>
                    <span className="bg-white/20 px-1 rounded">{matchedTop100Player.rank}位</span>
                    <span className="bg-white/20 px-1 rounded">{matchedTop100Player.score}粒</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {editingId && (
            <div className="mb-4 flex items-center justify-between bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="animate-pulse w-2 h-2 bg-amber-500 rounded-full"></span>
                <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Editing Mode</span>
              </div>
              <button 
                onClick={handleCancelEdit}
                className="text-[10px] font-black bg-white border border-amber-200 text-amber-600 px-3 py-1 rounded-lg hover:bg-amber-100 transition-colors"
                title="編集をキャンセルして新規入力に戻ります"
              >
                CANCEL EDIT
              </button>
            </div>
          )}

          <div className="flex flex-col flex-1 justify-center">

            <div className="mb-4 text-center">
               <input
                 type="datetime-local"
                 value={recordTime}
                 onChange={e => setRecordTime(e.target.value)}
                 className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-1.5 text-xs font-black text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300 transition-all text-center"
               />
            </div>

            <div className="mb-6 text-center relative px-2">
              <div className="flex justify-between items-end mb-1">
                <div className="text-4xl font-black text-rose-500 font-mono tracking-tighter" title="YOU 失点">{yPenalty === 0 ? "0" : `-${yPenalty}`}</div>
                <div className="text-xs font-black tracking-widest flex flex-col items-center">
                  <span className="text-slate-400">JUDGE</span>
                  <span className={`text-lg -translate-y-1 ${currentResult === "WIN" ? "text-rose-500" : currentResult === "LOSE" ? "text-blue-500" : "text-emerald-500"}`}>{currentResult}</span>
                </div>
                <div className="text-4xl font-black text-blue-500 font-mono tracking-tighter" title="RIVAL 失点">{rPenalty === 0 ? "0" : `-${rPenalty}`}</div>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden shadow-inner flex-row-reverse">
                <div className="h-full bg-rose-400 transition-all duration-500" style={{ width: `${yPenalty === 0 && rPenalty === 0 ? 50 : 100 - youBarWidth}%` }}></div>
                <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${yPenalty === 0 && rPenalty === 0 ? 50 : 100 - rivalBarWidth}%` }}></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 bg-gradient-to-br from-rose-50/30 to-white rounded-[1rem] p-4 border border-rose-100 relative pt-6">
                <div className="absolute -top-3 left-4 bg-rose-500 text-white px-4 py-0.5 text-xs rounded-full font-black tracking-widest shadow-sm">YOU</div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { key: "gr", label: "GR(-1)", classes: { border: "border-pink-200 focus-within:ring-pink-300", text: "text-pink-400", bg: "bg-pink-100" } },
                    { key: "go", label: "GO(-2)", classes: { border: "border-blue-200 focus-within:ring-blue-300", text: "text-blue-400", bg: "bg-blue-100" } },
                    { key: "b", label: "B(-3)", classes: { border: "border-emerald-200 focus-within:ring-emerald-300", text: "text-emerald-400", bg: "bg-emerald-100" } },
                    { key: "m", label: "M(-3)", classes: { border: "border-slate-200 focus-within:ring-slate-300", text: "text-slate-400", bg: "bg-slate-100" } },
                  ].map((j) => (
                    <div key={j.key} className={`bg-white border ${j.classes.border} rounded-lg p-2 flex flex-col items-center focus-within:ring-2 transition-all relative overflow-hidden group`}>
                      <div className={`text-[10px] font-black tracking-tighter ${j.classes.text} mb-1 z-10 whitespace-nowrap`}>{j.label}</div>
                      <input type="number" min="0" value={(you as any)[j.key] === 0 ? "" : (you as any)[j.key]} onChange={e => setYou({ ...you, [j.key]: Math.max(0, Number(e.target.value)) })}
                        className="w-full text-center text-2xl font-black font-mono bg-transparent outline-none z-10 text-slate-700" placeholder="0" />
                      <div className={`absolute bottom-0 w-full h-1 ${j.classes.bg} group-focus-within:h-full group-focus-within:opacity-30 transition-all`}></div>
                    </div>
                  ))}
                </div>

                <label className="flex items-center gap-2 mt-4 ml-1 cursor-pointer w-fit select-none">
                  <input type="checkbox" checked={you.isZeroLife} onChange={e => setYou({ ...you, isZeroLife: e.target.checked })} className="w-5 h-5 rounded text-rose-500 focus:ring-rose-400 cursor-pointer" />
                  <span className="text-sm font-black text-slate-600 uppercase">ライフ０ (-0.3pt)</span>
                </label>
              </div>

              <div className="flex-1 bg-gradient-to-br from-blue-50/30 to-white rounded-[1rem] p-4 border border-blue-100 relative pt-6 mb-4 sm:mb-0">
                <div className="absolute -top-3 right-4 bg-blue-500 text-white px-4 py-0.5 text-xs rounded-full font-black tracking-widest shadow-sm uppercase">Rival</div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { key: "gr", label: "GR(-1)", classes: { border: "border-pink-200 focus-within:ring-pink-300", text: "text-pink-400", bg: "bg-pink-100" } },
                    { key: "go", label: "GO(-2)", classes: { border: "border-blue-200 focus-within:ring-blue-300", text: "text-blue-400", bg: "bg-blue-100" } },
                    { key: "b", label: "B(-3)", classes: { border: "border-emerald-200 focus-within:ring-emerald-300", text: "text-emerald-400", bg: "bg-emerald-100" } },
                    { key: "m", label: "M(-3)", classes: { border: "border-slate-200 focus-within:ring-slate-300", text: "text-slate-400", bg: "bg-slate-100" } },
                  ].map((j) => (
                    <div key={j.key} className={`bg-white border ${j.classes.border} rounded-lg p-2 flex flex-col items-center focus-within:ring-2 transition-all relative overflow-hidden group`}>
                      <div className={`text-[10px] font-black tracking-tighter ${j.classes.text} mb-1 z-10 whitespace-nowrap`}>{j.label}</div>
                      <input type="number" min="0" value={(rival as any)[j.key] === 0 ? "" : (rival as any)[j.key]} onChange={e => setRival({ ...rival, [j.key]: Math.max(0, Number(e.target.value)) })}
                        className="w-full text-center text-2xl font-black font-mono bg-transparent outline-none z-10 text-slate-700" placeholder="0" />
                      <div className={`absolute bottom-0 w-full h-1 ${j.classes.bg} group-focus-within:h-full group-focus-within:opacity-30 transition-all`}></div>
                    </div>
                  ))}
                </div>

                <div className="absolute -bottom-[20px] left-0 w-full px-4 sm:static sm:bottom-auto sm:px-0 sm:mt-4 h-12 flex justify-between items-end gap-3">
                  <label className="flex items-center gap-2 mb-1 cursor-pointer select-none group">
                    <div className={`relative w-10 h-6 rounded-full transition-colors ${isCountPoints ? "bg-cyan-500" : "bg-slate-300"}`}>
                      <input type="checkbox" checked={isCountPoints} onChange={e => setIsCountPoints(e.target.checked)} className="sr-only" />
                      <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${isCountPoints ? "translate-x-4" : ""}`}></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 tracking-tighter leading-none group-hover:text-slate-700">ポイントに含める</span>
                  </label>
                  <button onClick={handleAddRecord} className={`text-white font-black text-sm px-6 py-3 rounded-xl shadow-xl hover:shadow-2xl transition-all tracking-widest mt-auto mb-[-16px] sm:mb-0 z-20 ${editingId ? "bg-amber-500 hover:bg-amber-600" : "bg-slate-800 hover:bg-cyan-600"}`}>
                    {editingId ? "UPDATE RECORD" : "SAVE RECORD"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 右（縦）: 履歴リスト */}
        <div className="xl:w-[40%] flex flex-col bg-white/60 backdrop-blur-xl rounded-[1.5rem] shadow-xl border border-white shrink-0 p-5 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3 px-2 border-b-2 border-slate-200 pb-1">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Record History</h3>
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={!isLoggedIn || isSyncing}
                className={`text-[10px] font-black px-2 py-1 border rounded-lg transition-all uppercase tracking-tighter shadow-sm flex items-center gap-1 ${isSyncing ? "bg-amber-50 text-amber-500 border-amber-200 animate-pulse" : "bg-white text-cyan-500 border-cyan-200 hover:bg-cyan-50"}`}
                title="ローカルデータをクラウドへ同期"
              >
                {isSyncing ? "Syncing..." : "Sync"}
              </button>
              <button
                onClick={handleExportCSV}
                disabled={records.length === 0}
                className="text-[10px] font-black px-2 py-1 bg-white text-emerald-500 border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-30 transition-all uppercase tracking-tighter shadow-sm"
                title="戦績履歴をCSVでエクスポート"
              >
                CSV
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {records.length === 0 && <p className="text-center text-slate-400 mt-10 font-bold text-sm">No Records</p>}
            {records.map(r => {
              const yPen = calcPenalty(r.you.great, r.you.good, r.you.bad, r.you.miss);
              const rPen = calcPenalty(r.rival.great, r.rival.good, r.rival.bad, r.rival.miss);
              const isWin = r.result === "WIN";
              const isLose = r.result === "LOSE";

              const badgeColor = r.you.clearType === "AP" ? "border-sky-400 text-sky-500 bg-sky-50" : r.you.clearType === "FC" ? "border-pink-400 text-pink-500 bg-pink-50" : r.you.clearType === "FAILED" ? "border-red-400 text-red-500 bg-red-50" : "border-slate-300 text-slate-400 bg-slate-50";
              const rBadgeColor = r.rival.clearType === "AP" ? "border-sky-400 text-sky-500 bg-sky-50" : r.rival.clearType === "FC" ? "border-pink-400 text-pink-500 bg-pink-50" : "border-slate-300 text-slate-400 bg-slate-50";

              const histMatchedTop100 = top100Players.find(p => calculateSimilarity(p.name, r.rivalName) >= 0.8);

              return (
                <div key={r.id} className={`bg-white rounded-xl p-3 shadow-sm border relative group transition-all hover:shadow-md ${editingId === r.id ? "ring-2 ring-amber-400 border-amber-200" : "border-slate-100"}`}>
                  <div className="absolute top-1 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(r)} className="text-slate-400 hover:text-amber-500 font-bold" title="編集">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-slate-300 hover:text-red-500 font-bold" title="削除">✕</button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-xl ${isWin ? "bg-rose-400" : isLose ? "bg-blue-400" : "bg-emerald-400"}`}></div>

                    <div className="pl-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-100 bg-white shadow-sm">
                          <img 
                            src={`https://pjsekai.com/?plugin=ref&page=${encodeURIComponent(r.songName)}&src=${encodeURIComponent(r.songName)}.jpg`}
                            alt="jacket"
                            className="w-full h-full object-cover"
                            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                          />
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded text-white ${isWin ? "bg-rose-500" : isLose ? "bg-blue-500" : "bg-emerald-500"}`}>{r.result}</span>
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <span 
                            className="px-1.5 h-4.5 rounded flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: r.difficulty === "EXP" ? "var(--color-diff-expert)" : r.difficulty === "MAS" ? "var(--color-diff-master)" : "var(--color-diff-append)" }}
                          >
                            {r.level}
                          </span>
                          <div className="font-black text-slate-800 truncate leading-tight tracking-tight text-sm">{r.songName}</div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 min-w-[70px]">
                          <div className="text-[9px] font-black text-slate-300 font-mono italic text-right">
                            {new Date(r.timestamp).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {r.isSynced === false && (
                            <span className="text-[7px] font-black bg-amber-100 text-amber-600 px-1 rounded animate-pulse uppercase tracking-tighter">Local only</span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 overflow-hidden">
                          {r.you.clearType !== "CLEAR" && (
                            <span className={`px-1 rounded border leading-none font-black ${badgeColor} shrink-0`}>{r.you.clearType}</span>
                          )}
                          <span className={yPen > 0 ? "text-rose-500 font-black font-mono text-sm shrink-0" : "text-sm font-black font-mono shrink-0"}>{yPen > 0 ? `-${yPen}` : "0"}</span>
                          <span className="mx-1 text-slate-400 text-[10px] italic shrink-0">vs</span>
                          <div className="flex items-center gap-1.5 min-w-0 max-w-[140px]">
                            <span className="font-bold truncate text-xs text-slate-600 leading-none">
                              {r.rivalName || "RIVAL"}
                            </span>
                            {histMatchedTop100 && (
                              <span className="bg-orange-500 text-white font-black px-1.5 h-4.5 rounded flex items-center justify-center text-[10px] shrink-0 shadow-sm leading-none" title={`TOP100 / 粒数: ${histMatchedTop100.score}`}>
                                #{histMatchedTop100.rank}
                              </span>
                            )}
                          </div>
                          <span className={rPen > 0 ? "text-blue-500 font-black font-mono ml-1 text-sm shrink-0" : "ml-1 text-sm font-black font-mono shrink-0"}>{rPen > 0 ? `-${rPen}` : "0"}</span>
                          {r.rival.clearType !== "CLEAR" && (
                            <span className={`px-1 rounded border leading-none font-black ${rBadgeColor} shrink-0`}>{r.rival.clearType}</span>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <div className={`font-black font-mono text-lg leading-none shrink-0 ml-2 ${r.isCountPoints === false ? "text-slate-300 line-through scale-90" : r.pointChange > 0 ? "text-cyan-500" : "text-slate-500"}`}>
                            {r.pointChange > 0 ? "+" : ""}{r.pointChange.toFixed(2)}
                          </div>
                          {r.isCountPoints === false && (
                            <div className="text-[8px] font-black text-rose-400 uppercase tracking-tighter mt-0.5">Excluded</div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
