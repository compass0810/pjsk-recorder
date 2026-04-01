"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { db } from "@/lib/db";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const profile = await db.profile.get();
      setIsAdmin(!!profile?.is_admin);
    };
    checkAdmin();
  }, []);

  const navItems = [
    { label: "リザルト記録", short: "R", path: "/" },
    { label: "ランクマレコーダー", short: "RM", path: "/rankmatch" },
    { label: "譜面メーカー情報", short: "MK", path: "/maker" },
    { label: "アップデートログ", short: "LG", path: "/log" },
    { label: "使い方・注意事項", short: "NOTE", path: "/notice" },
    { label: "不具合報告・要望", short: "BG", path: "/bugs" },
    { label: "アカウント", short: "AC", path: "/account" },
  ];

  if (isAdmin) {
    navItems.push({ label: "管理ページ", short: "AD", path: "/admin" });
  }

  return (
    <aside className={`${isOpen ? 'w-70' : 'w-20'} min-h-[100dvh] bg-white/40 backdrop-blur-md border-r border-white/50 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.05)] relative z-10 transition-all duration-300 pointer-events-auto`}>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3.5 top-8 w-7 h-7 bg-white rounded-full border border-slate-200 shadow-lg flex items-center justify-center text-slate-400 hover:text-cyan-500 hover:border-cyan-300 transition-all z-20 active:scale-90"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-3 h-3 transition-transform duration-500 ${isOpen ? '' : 'rotate-180'}`}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
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
        v1.0.3(2026.04.01)<br />
        © 2026 PJSK Recorder
      </div>
    </aside>
  );
}
