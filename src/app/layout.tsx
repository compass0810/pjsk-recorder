import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "プロセカレコーダー",
  description: "プレイリザルトとランクマッチの戦績管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen flex text-slate-800 bg-transparent">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
