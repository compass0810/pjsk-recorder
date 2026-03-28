"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchSongs } from "@/lib/api";
import { loadRankMatchRecords, saveRankMatchRecord, deleteRankMatchRecord } from "@/lib/storage";
import { Song, RankMatchRecord, Difficulty } from "@/types";

export default function RankMatchRecorder() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [records, setRecords] = useState<RankMatchRecord[]>([]);

  // フォーム用ステート
  const [selectedSongName, setSelectedSongName] = useState("");
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>("MAS");
  const [you, setYou] = useState({ great: 0, good: 0, bad: 0, miss: 0, clearType: "CLEAR" as const });
  const [rival, setRival] = useState({ great: 0, good: 0, bad: 0, miss: 0, clearType: "CLEAR" as const });

  useEffect(() => {
    fetchSongs().then(setSongs);
    setRecords(loadRankMatchRecords());
  }, []);

  // シーズン戦績の計算
  const stats = useMemo(() => {
    let win = 0, lose = 0, draw = 0;
    let totalPoints = 0;
    records.forEach(r => {
      if (r.result === "WIN") win++;
      else if (r.result === "LOSE") lose++;
      else draw++;
      totalPoints += r.pointChange;
    });
    return { matches: records.length, win, lose, draw, points: totalPoints };
  }, [records]);

  // オートコンプリート用の曲リスト提案（雑な実装）
  const songOptions = useMemo(() => songs.map(s => s.楽曲名), [songs]);

  // レベル自動取得
  const currentSong = songs.find(s => s.楽曲名 === selectedSongName);
  const currentLevel = currentSong 
    ? currentSong[selectedDiff === "EXP" ? "X" : selectedDiff === "MAS" ? "M" : "A" as keyof Song] || "??"
    : "??";

  // 勝敗・判定差計算ロジック
  const calcResult = () => {
    // ミス等による減点数（今回は簡易的に全ミスの合計とする）
    const youTotal = you.great + you.good + you.bad + you.miss;
    const rivalTotal = rival.great + rival.good + rival.bad + rival.miss;

    let result: "WIN" | "LOSE" | "DRAW" = "DRAW";
    let pointChange = 0;

    if (youTotal < rivalTotal) {
      result = "WIN";
      pointChange += 1.0;
    } else if (youTotal > rivalTotal) {
      result = "LOSE";
      pointChange -= 1.0;
    } else {
      result = "DRAW";
      // 特例: 両者AP (youTotal==0, rivalTotal==0 かつ両者AP設定時)
      if (youTotal === 0 && rivalTotal === 0 && you.clearType === "AP" && rival.clearType === "AP") {
        pointChange += 1.0; 
      }
    }

    // クリア可否によるポイント補正
    if (you.clearType === "FAILED") {
      pointChange -= 0.3;
    } else if (you.clearType === "FC" && result !== "DRAW") { // DRAWAで両者AP特例には乗らない？一旦シンプルに足す
      pointChange += 0.1;
    } else if (you.clearType === "AP") {
      pointChange += 0.2;
    }

    return { result, youTotal, rivalTotal, pointChange };
  };

  const { result: currentResult, youTotal, rivalTotal, pointChange: currentPointChange } = calcResult();

  const handleAddRecord = () => {
    if (!selectedSongName) {
      alert("楽曲名を入力または選択してください。");
      return;
    }

    const newRecord: RankMatchRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      songName: selectedSongName,
      difficulty: selectedDiff,
      level: currentLevel as string, // NOTE: level type
      you: { ...you },
      rival: { ...rival },
      result: currentResult,
      pointChange: currentPointChange
    };

    saveRankMatchRecord(newRecord);
    setRecords([newRecord, ...records]);

    // フォームリセット
    setYou({ great: 0, good: 0, bad: 0, miss: 0, clearType: "CLEAR" });
    setRival({ great: 0, good: 0, bad: 0, miss: 0, clearType: "CLEAR" });
  };

  const handleDelete = (id: string) => {
    if (confirm("この記録を削除しますか？")) {
      deleteRankMatchRecord(id);
      setRecords(records.filter(r => r.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-full p-8 gap-6 absolute inset-0 overflow-y-auto">
      {/* シーズン戦績（上部ヘッダー） */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-md border border-white flex items-center justify-between shrink-0">
        <div className="flex items-baseline gap-4">
          <h2 className="text-2xl font-bold text-slate-800">シーズン戦績</h2>
          <div className="text-xl font-bold text-slate-600">
            {stats.matches}戦 <span className="text-pink-500">{stats.win}勝</span> <span className="text-blue-500">{stats.lose}敗</span> <span className="text-slate-400">{stats.draw}引分</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-slate-400 mb-1">現在のレート（推定）</div>
          <div className={`text-4xl font-black ${stats.points >= 0 ? "text-cyan-500" : "text-rose-500"}`}>
            {stats.points > 0 ? "+" : ""}{stats.points.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* レコード追加フォーム（左側） */}
        <div className="w-1/2 flex flex-col bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl overflow-y-auto border border-white shrink-0 p-6">
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 border-b pb-3 mb-6">記録を追加</h3>
          
          <div className="space-y-6">
            {/* 楽曲選択 */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">譜面・レベル</label>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  list="song-list"
                  value={selectedSongName}
                  onChange={e => setSelectedSongName(e.target.value)}
                  placeholder="楽曲名を入力..."
                  className="flex-1 p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-cyan-400 font-bold"
                />
                <datalist id="song-list">
                  {songOptions.map(s => <option key={s} value={s} />)}
                </datalist>
                <select 
                  value={selectedDiff} onChange={e => setSelectedDiff(e.target.value as any)}
                  className="w-32 p-3 rounded-xl border border-slate-200 outline-none font-bold bg-white"
                >
                  <option value="EXP">EXPERT</option>
                  <option value="MAS">MASTER</option>
                  <option value="APD">APPEND</option>
                </select>
                <div className="w-16 p-3 bg-slate-100 rounded-xl text-center font-black border border-slate-200 uppercase">
                  {currentLevel}
                </div>
              </div>
            </div>

            {/* YOU と RIVAL のステータス入力 */}
            <div className="flex gap-4">
              {/* YOU */}
              <div className="flex-1 bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                <h4 className="font-black text-blue-500 mb-4 text-center tracking-widest">YOU</h4>
                <div className="space-y-3">
                  <select 
                    value={you.clearType} onChange={e => setYou({...you, clearType: e.target.value as any})}
                    className="w-full p-2 mb-2 rounded border border-blue-200 text-sm font-bold bg-white text-center"
                  >
                    <option value="CLEAR">CLEAR</option>
                    <option value="FC">FC (+0.1)</option>
                    <option value="AP">AP (+0.2)</option>
                    <option value="FAILED">FAILED (-0.3)</option>
                  </select>
                  {(["great", "good", "bad", "miss"] as const).map(judge => (
                    <div key={judge} className="flex justify-between items-center text-sm font-bold">
                      <span className="uppercase">{judge}</span>
                      <input type="number" min="0" value={you[judge] || ""} onChange={e => setYou({...you, [judge]: Number(e.target.value)})} className="w-16 p-1 text-right border rounded outline-none" />
                    </div>
                  ))}
                  <div className="pt-2 border-t border-blue-200 flex justify-between font-black text-blue-700">
                    <span>Miss合計</span><span>{youTotal}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center font-black text-slate-300">VS</div>

              {/* RIVAL */}
              <div className="flex-1 bg-red-50/50 rounded-2xl p-4 border border-red-100">
                <h4 className="font-black text-red-400 mb-4 text-center tracking-widest">RIVAL</h4>
                <div className="space-y-3">
                  <select 
                    value={rival.clearType} onChange={e => setRival({...rival, clearType: e.target.value as any})}
                    className="w-full p-2 mb-2 rounded border border-red-200 text-sm font-bold bg-white text-center"
                  >
                    <option value="CLEAR">CLEAR</option>
                    <option value="FC">FC</option>
                    <option value="AP">AP</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                  {(["great", "good", "bad", "miss"] as const).map(judge => (
                    <div key={judge} className="flex justify-between items-center text-sm font-bold">
                      <span className="uppercase">{judge}</span>
                      <input type="number" min="0" value={rival[judge] || ""} onChange={e => setRival({...rival, [judge]: Number(e.target.value)})} className="w-16 p-1 text-right border rounded outline-none" />
                    </div>
                  ))}
                  <div className="pt-2 border-t border-red-200 flex justify-between font-black text-red-500">
                    <span>Miss合計</span><span>{rivalTotal}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 結果プレビューと追加ボタン */}
            <div className="bg-slate-800 text-white rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-400">判定結果</div>
                <div className="text-2xl font-black mt-1">
                  {currentResult === "WIN" && <span className="text-green-400">勝利</span>}
                  {currentResult === "LOSE" && <span className="text-red-400">敗北</span>}
                  {currentResult === "DRAW" && <span className="text-yellow-400">引分</span>}
                  <span className="ml-3 text-lg font-bold text-slate-300">ポイント: {currentPointChange > 0 ? "+" : ""}{currentPointChange.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={handleAddRecord} className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 font-bold rounded-xl transition-colors shadow-lg shadow-cyan-500/30">
                追加する
              </button>
            </div>
          </div>
        </div>

        {/* 履歴リスト（右側） */}
        <div className="w-1/2 flex flex-col bg-white/50 backdrop-blur-sm rounded-3xl shadow-inner border border-white shrink-0 p-4 overflow-y-auto space-y-3">
          {records.length === 0 && <p className="text-center text-slate-400 mt-10 font-bold">まだ記録がありません。</p>}
          {records.map(r => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs font-black rounded text-white
                    ${r.result === "WIN" ? "bg-green-400" : r.result === "LOSE" ? "bg-red-400" : "bg-yellow-400"}
                  `}>
                    {r.result}
                  </span>
                  <span className={`font-black uppercase text-sm
                    ${r.difficulty === "EXP" ? "text-[var(--color-diff-expert)]" : r.difficulty === "MAS" ? "text-[var(--color-diff-master)]" : "text-[var(--color-diff-append)]"}
                  `}>
                    {r.difficulty}
                  </span>
                  <span className="font-bold text-slate-800">{r.songName}</span>
                </div>
                <div className="text-sm font-bold text-slate-500">
                  判定差: YOU({r.you.great+r.you.good+r.you.bad+r.you.miss}) vs RIVAL({r.rival.great+r.rival.good+r.rival.bad+r.rival.miss})
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-xl font-black ${r.pointChange >= 0 ? "text-cyan-500" : "text-rose-500"}`}>
                  {r.pointChange > 0 ? "+" : ""}{r.pointChange.toFixed(2)}
                </div>
                <button onClick={() => handleDelete(r.id)} className="text-slate-300 hover:text-red-500 p-2">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
