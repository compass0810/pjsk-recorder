"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchSongs } from "@/lib/api";
import { loadRankMatchRecords, saveRankMatchRecord, deleteRankMatchRecord } from "@/lib/storage";
import { Song, RankMatchRecord, Difficulty } from "@/types";

export default function RankMatchRecorder() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [records, setRecords] = useState<RankMatchRecord[]>([]);

  const [selectedSongName, setSelectedSongName] = useState("");
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>("MAS");
  const [rivalName, setRivalName] = useState("");

  // youのライフ0判定（isZeroLife）を管理。trueの場合FAILEDとなり-0.3ptのペナルティ。
  const [you, setYou] = useState({ gr: 0, go: 0, b: 0, m: 0, isZeroLife: false });
  const [rival, setRival] = useState({ gr: 0, go: 0, b: 0, m: 0 });

  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    fetchSongs().then(setSongs);
    setRecords(loadRankMatchRecords());
  }, []);

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

  const songOptions = useMemo(() => songs.map(s => s.楽曲名), [songs]);

  const currentSong = songs.find(s => s.楽曲名 === selectedSongName);
  const currentLevel = currentSong
    ? currentSong[selectedDiff === "EXP" ? "X" : selectedDiff === "MAS" ? "M" : "A" as keyof Song] || "??"
    : "??";


  // 失点(Penalty)計算: GREAT=1, GOOD=2, BAD=3, MISS=3
  const calcPenalty = (gr: number, go: number, b: number, m: number) => {
    return (gr * 1) + (go * 2) + (b * 3) + (m * 3);
  };

  const calcResult = () => {
    const yPenalty = calcPenalty(you.gr, you.go, you.b, you.m);
    const rPenalty = calcPenalty(rival.gr, rival.go, rival.b, rival.m);

    let result: "WIN" | "LOSE" | "DRAW" = "DRAW";
    let pointChange = 0;

    // 失点が少ないほうが勝利
    if (yPenalty < rPenalty) { result = "WIN"; pointChange += 1.0; }
    else if (yPenalty > rPenalty) { result = "LOSE"; pointChange -= 1.0; }
    else {
      result = "DRAW";
      if (yPenalty === 0 && rPenalty === 0) pointChange += 1.0; // AP引き分け特例
    }

    let pClearType: "AP" | "FC" | "CLEAR" | "FAILED" = "CLEAR";

    if (you.isZeroLife) {
      pClearType = "FAILED";
      pointChange -= 0.3;
    } else {
      // isClear が True の場合、AP / FC を自動判定
      if (you.gr === 0 && you.go === 0 && you.b === 0 && you.m === 0) {
        pClearType = "AP";
        pointChange += 0.2;
      } else if (you.go === 0 && you.b === 0 && you.m === 0) {
        pClearType = "FC";
        if (result !== "DRAW") pointChange += 0.1;
      }
    }

    return { result, yPenalty, rPenalty, pointChange, pClearType };
  };

  const { result: currentResult, yPenalty, rPenalty, pointChange: currentPointChange, pClearType } = calcResult();

  const handleAddRecord = () => {
    if (!selectedSongName) {
      alert("楽曲名を選択してください。");
      return;
    }
    const newRecord: RankMatchRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      songName: selectedSongName,
      difficulty: selectedDiff,
      level: currentLevel as string,
      rivalName: rivalName || "名無し",
      you: { great: you.gr, good: you.go, bad: you.b, miss: you.m, clearType: pClearType },
      rival: { great: rival.gr, good: rival.go, bad: rival.b, miss: rival.m, clearType: "CLEAR" },
      result: currentResult,
      pointChange: currentPointChange
    };

    saveRankMatchRecord(newRecord);
    setRecords([newRecord, ...records]);

    setToastMessage("戦績を記録しました！");
    setTimeout(() => setToastMessage(""), 3000);

    setYou({ gr: 0, go: 0, b: 0, m: 0, isZeroLife: false });
    setRival({ gr: 0, go: 0, b: 0, m: 0 });
    setRivalName("");
  };

  const handleDelete = (id: string) => {
    if (window.confirm("この対戦記録を削除してよろしいですか？")) {
      deleteRankMatchRecord(id);
      setRecords(records.filter(r => r.id !== id));
    }
  };

  // 天秤ゲージ用の計算 (失点での比較)
  const maxScale = Math.max(yPenalty, rPenalty) || 1;
  const youBarWidth = Math.max(5, (yPenalty / (yPenalty + rPenalty || 1)) * 100);
  const rivalBarWidth = 100 - youBarWidth;

  const diffColor = selectedDiff === "EXP" ? "var(--color-diff-expert)" : selectedDiff === "MAS" ? "var(--color-diff-master)" : "var(--color-diff-append)";

  return (
    <div className="flex flex-col h-full p-6 lg:p-8 gap-6 absolute inset-0 overflow-y-auto w-full">

      {/* Toast */}
      <div className={`fixed top-6 right-6 z-50 transition-all duration-500 transform ${toastMessage ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0 pointer-events-none"}`}>
        <div className="bg-white/90 backdrop-blur border-l-4 border-rose-400 p-4 rounded-xl shadow-2xl flex items-center gap-4">
          <div className="bg-rose-100 text-rose-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">✓</div>
          <div className="font-bold text-slate-700">{toastMessage}</div>
        </div>
      </div>

      {/* ヘッダー戦績 */}
      <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] p-6 shadow-md border border-white flex flex-col md:flex-row items-center justify-between shrink-0 animate-fade-in-up">
        <div className="flex flex-col mb-4 md:mb-0 text-center md:text-left">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Season Results</h2>
          <div className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">(2026.4.1 - 6.30)</div>
        </div>
        <div className="flex items-baseline gap-6 text-xl font-bold bg-slate-50/50 px-6 py-2 rounded-xl border border-slate-100 shadow-inner">
          <div className="flex flex-col items-center"><span className="text-slate-700 text-4xl font-black">{stats.matches}</span><span className="text-xs tracking-widest uppercase text-slate-400">Matches</span></div>
          <div className="flex flex-col items-center"><span className="text-rose-500 text-4xl font-black">{stats.win}</span><span className="text-xs tracking-widest uppercase text-rose-400">Win</span></div>
          <div className="flex flex-col items-center"><span className="text-blue-500 text-4xl font-black">{stats.lose}</span><span className="text-xs tracking-widest uppercase text-blue-400">Lose</span></div>
          <div className="flex flex-col items-center"><span className="text-emerald-500 text-4xl font-black">{stats.draw}</span><span className="text-xs tracking-widest uppercase text-emerald-400">Draw</span></div>
        </div>
        <div className="flex flex-col items-end mt-4 md:mt-0">
          <div className="text-xs font-black text-slate-400 tracking-widest uppercase mb-1">Current Rate</div>
          <div className="text-4xl font-black font-mono tracking-tighter shadow-sm bg-white px-4 py-2 rounded-xl text-slate-800">
            <span className={stats.points > 0 ? "text-cyan-500" : stats.points < 0 ? "text-rose-500" : "text-slate-400"}>
              {stats.points > 0 ? "+" : ""}{stats.points.toFixed(2)}
            </span>
            <span className="text-base font-bold ml-1">pt</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0">

        {/* 左: 新規レコード VS 対面式UI (縮小版) */}
        <div className="xl:w-[60%] flex flex-col bg-white/85 backdrop-blur-2xl rounded-[1.5rem] shadow-xl border border-white/80 shrink-0 p-5 relative animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

          {/* 曲名・相手指定 */}
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
            <div className="flex-1 flex items-center justify-between bg-slate-50/80 rounded-lg shadow-sm border border-slate-100 pr-2 w-full">
              <input
                list="song-list" value={selectedSongName} onChange={e => setSelectedSongName(e.target.value)}
                placeholder="楽曲を選択..." className="w-full outline-none font-bold text-sm p-2 text-slate-800 placeholder:text-slate-400 bg-transparent"
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

            <div className="flex-1 bg-slate-50/80 rounded-lg shadow-sm border border-slate-100 w-full">
              <input
                type="text" value={rivalName} onChange={e => setRivalName(e.target.value)}
                placeholder="RIVAL NAME" className="outline-none bg-transparent font-black text-blue-600 uppercase tracking-widest w-full text-base p-3 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* 対面VSエリア */}
          <div className="flex flex-col flex-1 justify-center">

            {/* 天秤プログレス (失点差) */}
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
                {/* 失点が「少ない方」のゲージを長くする（勝っている側を長く表示する視覚的配慮） */}
                <div className="h-full bg-rose-400 transition-all duration-500" style={{ width: `${yPenalty === 0 && rPenalty === 0 ? 50 : 100 - youBarWidth}%` }}></div>
                <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${yPenalty === 0 && rPenalty === 0 ? 50 : 100 - rivalBarWidth}%` }}></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* YOU */}
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

              {/* RIVAL */}
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

                {/* ボタン格納用スペースの有効活用 */}
                <div className="absolute -bottom-[20px] left-0 w-full px-4 sm:static sm:bottom-auto sm:px-0 sm:mt-4 h-12 flex justify-end items-end">
                  <button onClick={handleAddRecord} className="bg-slate-800 text-white font-black text-sm px-6 py-3 rounded-xl shadow-xl hover:shadow-2xl hover:bg-cyan-600 transition-all tracking-widest mt-auto mb-[-16px] sm:mb-0 z-20">
                    SAVE RECORD
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 右（縦）: 履歴リスト */}
        <div className="xl:w-[40%] flex flex-col bg-white/60 backdrop-blur-xl rounded-[1.5rem] shadow-xl border border-white shrink-0 p-5 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-sm font-black text-slate-800 mb-3 px-2 border-b-2 border-slate-200 pb-1 uppercase tracking-widest">Record History</h3>
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {records.length === 0 && <p className="text-center text-slate-400 mt-10 font-bold text-sm">No Records</p>}
            {records.map(r => {
              // 古い履歴等のため、一応Penaltyロジックで計算しなおす
              const yPen = calcPenalty(r.you.great, r.you.good, r.you.bad, r.you.miss);
              const rPen = calcPenalty(r.rival.great, r.rival.good, r.rival.bad, r.rival.miss);
              const isWin = r.result === "WIN";
              const isLose = r.result === "LOSE";

              const badgeColor = r.you.clearType === "AP" ? "border-sky-400 text-sky-500 bg-sky-50" : r.you.clearType === "FC" ? "border-pink-400 text-pink-500 bg-pink-50" : "border-slate-300 text-slate-400 bg-slate-50";

              return (
                <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 relative group transition-all hover:shadow-md">
                  <button onClick={() => handleDelete(r.id)} className="absolute top-1 right-2 text-slate-300 hover:text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">✕</button>

                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-xl ${isWin ? "bg-rose-400" : isLose ? "bg-blue-400" : "bg-emerald-400"}`}></div>

                    <div className="pl-2 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded text-white ${isWin ? "bg-rose-500" : isLose ? "bg-blue-500" : "bg-emerald-500"}`}>{r.result}</span>
                        <div className="font-black text-slate-800 truncate leading-tight tracking-tight text-sm">{r.songName}</div>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          {r.you.clearType !== "CLEAR" && (
                            <span className={`px-1 rounded border leading-none font-black ${badgeColor}`}>{r.you.clearType}</span>
                          )}
                          <span className={yPen > 0 ? "text-rose-500 font-black font-mono text-sm" : "text-sm"}>{yPen > 0 ? `-${yPen}` : ""}</span>
                          <span className="mx-1 text-slate-400 text-[10px] italic">vs</span>
                          <span className="font-bold text-slate-600 truncate max-w-[150px] text-xs">{r.rivalName || "RIVAL"}</span>
                          <span className={rPen > 0 ? "text-blue-500 font-black font-mono ml-1 text-sm" : "ml-1 text-sm"}>{rPen > 0 ? `-${rPen}` : ""}</span>
                        </div>
                        <div className={`font-black font-mono text-xl leading-none ${r.pointChange > 0 ? "text-cyan-500" : "text-slate-500"}`}>
                          {r.pointChange > 0 ? "+" : ""}{r.pointChange.toFixed(2)}
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
