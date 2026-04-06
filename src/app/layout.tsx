import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MaintenanceGuard from "@/components/MaintenanceGuard";

export const metadata: Metadata = {
  title: "音ゲーレコーダー",
  description: "プレイリザルトとランクマッチの戦績管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-[100dvh] flex text-slate-800 bg-transparent">
        <MaintenanceGuard>
          <Sidebar />
          <main className="flex-1 overflow-y-auto relative h-[100dvh]">
            {children}
          </main>
        </MaintenanceGuard>
      </body>
    </html>
  );
}
