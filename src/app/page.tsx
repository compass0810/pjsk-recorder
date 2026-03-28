"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";

// スプレッドシートの列名に完全に合わせる
interface Song {
  "No": string;
  "楽曲名": string;
  "X": string;      // EXPERTレベル
  "M": string;      // MASTERレベル
  "A": string;      // APPENDレベル
  "コンボ(EXP)": string;
  "コンボ(MAS)": string;
  "コンボ(APD)": string;
}

export default function PjskRecorder() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [difficulty, setDifficulty] = useState<"EXP" | "MAS" | "APD">("MAS");

  // 判定数（企画書ロジック）
  const [great, setGreat] = useState(0);
  const [good, setGood] = useState(0);
  const [bad, setBad] = useState(0);
  const [miss, setMiss] = useState(0);

  useEffect(() => {
    // 【重要】ここに「ウェブに公開」で取得したCSVのURLを貼ってください
    const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrm3xeVZV5YSAjHFmRzmIOZwbDP14URG0LZFnnWp1bZNwgzKoQ0UwRPNXlNdESMb0jYMnHhmEsRHdG/pub?gid=536567596&single=true&output=csv";
    
    fetch(sheetUrl)
      .then(res => res.text())
      .then(csvData => {
        const results = Papa.parse(csvData, { header: true });
        // 空行を除外してセット
        const validSongs = (results.data as Song[]).filter(s => s["楽曲名"]);
        setSongs(validSongs);
        if (validSongs.length > 0) setSelectedSong(validSongs[0]);
      });
  }, []);

  // 選択中の難易度に基づいたデータを取得
  const getDisplayData = () => {
    if (!selectedSong) return { lv: "--", notes: 0 };
    if (difficulty === "EXP") return { lv: selectedSong["X"], notes: Number(selectedSong["コンボ(EXP)"]) || 0 };
    if (difficulty === "APD") return { lv: selectedSong["A"], notes: Number(selectedSong["コンボ(APD)"]) || 0 };
    return { lv: selectedSong["M"], notes: Number(selectedSong["コンボ(MAS)"]) || 0 };
  };

  const { lv, notes } = getDisplayData();
  const perfect = notes - (great + good + bad + miss);

  return (
    <div className="flex h-screen bg-slate-100">
      {/* サイドバー (省略可) */}
      <aside className="w-64 bg-slate-900 text-white p-6">
        <h2 className="text-xl font-bold mb-6">MENU</h2>
        <div className="space-y-2">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500 rounded">リザルト記録</div>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* ヘッダー：難易度で色を変える */}
          <div className={`p-4 text-white flex justify-between ${
            difficulty === "MAS" ? "bg-purple-600" : difficulty === "APD" ? "bg-pink-500" : "bg-red-500"
          }`}>
            <span className="font-bold">{difficulty} Lv.{lv}</span>
            <select 
              className="bg-black/20 outline-none rounded"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
            >
              <option value="EXP">EXPERT</option>
              <option value="MAS">MASTER</option>
              <option value="APD">APPEND</option>
            </select>
          </div>

          <div className="p-8">
            {/* 楽曲選択ドロップダウン */}
            <select 
              className="w-full text-2xl font-bold border-b-2 mb-8 outline-none"
              onChange={(e) => setSelectedSong(songs.find(s => s["楽曲名"] === e.target.value) || null)}
            >
              {songs.map(song => (
                <option key={song["No"]} value={song["楽曲名"]}>{song["楽曲名"]}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between border-b text-orange-500 font-bold">
                  <span>PERFECT</span><span>{perfect}</span>
                </div>
                {/* 各入力欄 (GREAT, GOOD, etc...) */}
                {[["GREAT", "text-pink-400", great, setGreat], 
                  ["GOOD", "text-green-400", good, setGood], 
                  ["BAD", "text-blue-400", bad, setBad], 
                  ["MISS", "text-gray-400", miss, setMiss]].map(([label, color, val, setter]: any) => (
                  <div key={label} className="flex justify-between border-b">
                    <span className={`${color} font-bold`}>{label}</span>
                    <input 
                      type="number" 
                      className="w-16 text-right outline-none" 
                      value={val} 
                      onChange={e => setter(Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center">
                <div className="text-slate-400 text-sm">TOTAL NOTES</div>
                <div className="text-3xl font-mono">{notes}</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}