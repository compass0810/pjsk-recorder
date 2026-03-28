"use client";

import { useState, useEffect } from "react";
import { fetchSongs } from "@/lib/api";
import { loadResults, saveResult, getResultKey } from "@/lib/storage";
import { Song, PlayResult, Difficulty } from "@/types";

export default function ResultRecorder() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [results, setResults] = useState<Record<string, PlayResult>>({});
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>("EXP");
  
  // 入力フォームの状態
  const [inputs, setInputs] = useState({ great: 0, good: 0, bad: 0, miss: 0 });
  const [clearType, setClearType] = useState<"CLEAR" | "FC" | "AP" | "FAILED">("CLEAR");

  useEffect(() => {
    // 初回マウント時にマスタデータとローカルデータを取得
    Promise.all([fetchSongs(), Promise.resolve(loadResults())]).then(([songData, savedResults]) => {
      setSongs(songData);
      setResults(savedResults);
    });
  }, []);

  // 選択中の楽曲や難易度が変わったら、入力フォームを過去の実績値でセットする
  useEffect(() => {
    if (selectedSong) {
      const key = getResultKey(selectedSong.No, selectedDiff);
      const saved = results[key];
      if (saved) {
        setInputs({ great: saved.great, good: saved.good, bad: saved.bad, miss: saved.miss });
        setClearType(saved.clearType);
      } else {
        setInputs({ great: 0, good: 0, bad: 0, miss: 0 });
        setClearType("CLEAR");
      }
    }
  }, [selectedSong, selectedDiff, results]);

  const handleSave = () => {
    if (!selectedSong) return;
    
    // total notes
    const comboKey = `コンボ(${selectedDiff})` as keyof Song;
    const totalNotes = Number(selectedSong[comboKey]) || 0;
    
    // perfect 逆算
    const totalMisjudges = inputs.great + inputs.good + inputs.bad + inputs.miss;
    const perfect = Math.max(0, totalNotes - totalMisjudges);
    
    const newResult: PlayResult = {
      songNo: selectedSong.No,
      difficulty: selectedDiff,
      ...inputs,
      perfect,
      clearType,
      updatedAt: Date.now()
    };
    
    saveResult(newResult);
    setResults(prev => ({ ...prev, [getResultKey(selectedSong.No, selectedDiff)]: newResult }));
    alert("記録を保存しました！");
  };

  return (
    <div className="flex h-full p-8 gap-8 absolute inset-0 overflow-hidden">
      {/* 楽曲リスト (左ペイン) */}
      <div className="w-1/2 flex flex-col bg-white/60 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden border border-white/40 border-t-white/80 shrink-0">
        <div className="p-4 bg-gradient-to-r from-blue-100/50 to-cyan-100/50 border-b border-blue-200/50">
          <h2 className="text-xl font-bold text-blue-800">楽曲一覧</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {songs.length === 0 && <p className="text-center text-slate-500 mt-10 animate-pulse">読み込み中...</p>}
          {songs.map(song => (
            <button
              key={song.No}
              onClick={() => setSelectedSong(song)}
              className={`w-full text-left p-3 rounded-2xl transition-all duration-200 shadow-sm border ${
                selectedSong?.No === song.No 
                  ? "bg-gradient-to-r from-white to-blue-50/80 border-cyan-400 ring-2 ring-cyan-400/30 scale-[1.02]" 
                  : "bg-white/80 border-slate-200 hover:bg-white hover:shadow-md"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-200 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-slate-400 text-xs">Jacket</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 truncate">{song.楽曲名}</div>
                  <div className="flex gap-2 mt-1 text-xs">
                    {song.X && <span className="bg-[var(--color-diff-expert)] text-white px-2 py-0.5 rounded-full font-bold">EX {song.X}</span>}
                    {song.M && <span className="bg-[var(--color-diff-master)] text-white px-2 py-0.5 rounded-full font-bold">MAS {song.M}</span>}
                    {song.A && <span className="bg-[var(--color-diff-append)] text-white px-2 py-0.5 rounded-full font-bold">APP {song.A}</span>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 詳細データ入力 (右ペイン) */}
      <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden border border-white/50 shrink-0">
        {!selectedSong ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            左のリストから楽曲を選択してください
          </div>
        ) : (
          <>
            {/* ヘッダー */}
            <div className="p-6 border-b border-slate-200 bg-white/50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{selectedSong.楽曲名}</h2>
                <div className="flex mt-3 gap-2">
                  {(["EXP", "MAS", "APD"] as Difficulty[]).map(diff => {
                    const diffKey = diff === "EXP" ? "X" : diff === "MAS" ? "M" : "A";
                    if (!selectedSong[diffKey as keyof Song]) return null;
                    
                    const isSelected = selectedDiff === diff;
                    const colorClass = diff === "EXP" ? "bg-[var(--color-diff-expert)]" : 
                                       diff === "MAS" ? "bg-[var(--color-diff-master)]" : 
                                       "bg-[var(--color-diff-append)]";
                                       
                    return (
                      <button 
                        key={diff}
                        onClick={() => setSelectedDiff(diff)}
                        className={`px-4 py-1.5 rounded-full font-bold text-sm transition-all ${
                          isSelected ? `${colorClass} text-white shadow-lg scale-105` : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                        }`}
                      >
                        {diff} {selectedSong[diffKey as keyof Song]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 入力フォーム */}
            <div className="p-8 flex-1 overflow-y-auto">
              <div className="max-w-md mx-auto space-y-8">
                
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
                          className="w-20 text-right text-lg border-b-2 font-bold bg-transparent outline-none focus:border-cyan-400 transition-colors"
                        />
                      </div>
                    )
                  })}
                </div>

                {/* 自動計算 PERFECT / TOTAL */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 text-center shadow-inner border border-slate-200">
                  <div className="text-[var(--color-judge-perfect)] font-bold mb-2 tracking-widest">PERFECT</div>
                  <div className="text-4xl font-black font-mono text-slate-800">
                    {Math.max(0, (Number(selectedSong[`コンボ(${selectedDiff})` as keyof Song]) || 0) - (inputs.great + inputs.good + inputs.bad + inputs.miss))}
                  </div>
                  <div className="text-xs text-slate-400 mt-2 font-bold tracking-widest">TOTAL {Number(selectedSong[`コンボ(${selectedDiff})` as keyof Song]) || 0}</div>
                </div>

                {/* クリア判定と保存ボタン */}
                <div className="space-y-4">
                  <select 
                    value={clearType} 
                    onChange={e => setClearType(e.target.value as any)}
                    className="w-full p-4 rounded-xl border border-slate-200 font-bold text-center outline-none focus:ring-2 focus:ring-cyan-300 appearance-none bg-white font-mono"
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