"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  const navItems = [
    { label: "リザルト記録", short: "R", path: "/" },
    { label: "ランクマレコーダー", short: "RM", path: "/rankmatch" },
    { label: "譜面メーカー情報", short: "MK", path: "/maker" },
    { label: "アップデートログ", short: "LG", path: "/log" },
    { label: "注意事項", short: "NT", path: "/notice" },
  ];

  return (
    <aside className={`${isOpen ? 'w-70' : 'w-20'} min-h-screen bg-white/40 backdrop-blur-md border-r border-white/50 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.05)] relative z-10 transition-all duration-300 pointer-events-auto`}>

      {/* 開閉ボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3.5 top-8 w-7 h-7 bg-white rounded-full border border-slate-200 shadow-md flex items-center justify-center text-slate-500 hover:text-cyan-500 hover:border-cyan-300 transition-colors z-20"
      >
        <span className={`text-[10px] font-black transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`}>◀</span>
      </button>

      <div className={`flex items-center gap-3 p-6 mb-4 transition-all ${isOpen ? 'justify-start' : 'justify-center px-0'}`}>
        <div className="w-10 h-10 rounded-xl shrink-0 bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg flex items-center justify-center text-white font-bold text-xl" title="Menu">
          ♪
        </div>
        <h1 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
          プロセカレコーダー
        </h1>
      </div>

      <nav className={`flex-col pb-4 flex-1 space-y-2 ${isOpen ? 'px-6' : 'px-2'}`}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              title={item.label}
              className={`block rounded-xl font-bold transition-all duration-200 text-sm tracking-wide overflow-hidden whitespace-nowrap
                ${isOpen ? 'px-4 py-3' : 'px-0 object-center h-12 flex items-center justify-center'}
                ${isActive
                  ? "bg-gradient-to-r from-cyan-400 to-blue-400 text-white shadow-md shadow-cyan-400/20 translate-x-1"
                  : "text-slate-600 hover:bg-white/50 hover:text-cyan-600"
                }`}
            >
              {isOpen ? (
                <>
                  {item.label}
                  {isActive && <span className="float-right">▶</span>}
                </>
              ) : (
                <span className="text-[10px] uppercase font-black tracking-widest leading-none">{item.short}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`mt-auto pt-6 pb-6 border-t border-white/50 text-xs text-slate-500 font-bold overflow-hidden whitespace-nowrap transition-all duration-300 ${isOpen ? 'px-6 opacity-100' : 'px-0 h-0 p-0 opacity-0 pointer-events-none border-0'}`}>
        v1.0(2026.03.28)<br />
        © 2026 PJSK Recorder
      </div>
    </aside>
  );
}
