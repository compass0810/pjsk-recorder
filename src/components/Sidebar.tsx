"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "リザルト記録", path: "/" },
    { label: "ランクマレコーダー", path: "/rankmatch" },
    { label: "譜面メーカー情報", path: "/maker" },
    { label: "アップデートログ", path: "/log" },
    { label: "注意事項", path: "/notice" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white/40 backdrop-blur-md border-r border-white/50 p-6 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.05)] relative z-10 transition-all">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-400 to-blue-500 shadow-md flex items-center justify-center text-white font-bold">
          {/* Menu Icon Placeholder */}
          ≡
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 tracking-tight">
          プロセカレコーダー
        </h1>
      </div>

      <nav className="flex-col pb-4 flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`block px-4 py-3 rounded-xl font-bold transition duration-200 text-sm tracking-wide ${
                isActive 
                  ? "bg-gradient-to-r from-cyan-400 to-blue-400 text-white shadow-md shadow-cyan-400/20 translate-x-1" 
                  : "text-slate-600 hover:bg-white/50 hover:text-cyan-600"
              }`}
            >
              {item.label}
              {isActive && <span className="float-right">▶</span>}
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto pt-6 border-t border-white/50 text-xs text-slate-500 font-bold">
        v0.5.0<br />
        (C) 2026.03.29 作成
      </div>
    </aside>
  );
}
