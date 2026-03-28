"use client";

import { useState, useEffect } from "react";
import { fetchUpdateLogs } from "@/lib/api";
import { UpdateLog } from "@/types";

export default function UpdateLogPage() {
  const [logs, setLogs] = useState<UpdateLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpdateLogs().then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col h-full p-8 absolute inset-0 overflow-y-auto w-full max-w-4xl mx-auto">
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white flex-1 mb-8">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter border-b-4 border-cyan-400 pb-4 inline-block mb-10">アップデートログ</h2>
        
        <div className="space-y-8">
          {loading && <div className="text-slate-400 font-bold animate-pulse">読み込み中...</div>}
          
          {!loading && logs.length === 0 && <div className="text-slate-400 font-bold">ログがありません。</div>}

          {logs.map((log, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex gap-6 hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-cyan-400 to-blue-500"></div>
              
              <div className="shrink-0 w-32 border-r border-slate-100 pr-6 mr-2 flex flex-col justify-center">
                <div className="text-xl font-black text-slate-800">{log.version}</div>
                <div className="text-sm font-bold text-slate-400">{log.date}</div>
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-700 mb-2">{log.title}</h3>
                <p className="text-slate-600 whitespace-pre-wrap">{log.content}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
           <h4 className="font-bold text-yellow-700 mb-2">開発者の方へ</h4>
           <div className="text-sm text-yellow-600">
             現在、ダミーデータが表示されている場合は、<code>src/lib/api.ts</code> の <code>LOG_SHEET_URL</code> に、スプレッドシートの「アップデートログ」シートをウェブ公開（CSV出力）した際のURL（<code>gid=...</code>が含まれるもの）をセットしてください。
           </div>
        </div>
      </div>
    </div>
  );
}
