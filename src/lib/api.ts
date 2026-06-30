import Papa from "papaparse";
import { Song, UpdateLog } from "../types";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrm3xeVZV5YSAjHFmRzmIOZwbDP14URG0LZFnnWp1bZNwgzKoQ0UwRPNXlNdESMb0jYMnHhmEsRHdG/pub?gid=536567596&single=true&output=csv";

// 💡 改善点4: プレースホルダーの判定を実用的に変更（デフォルトは空文字等に対応できるように）
const LOG_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrm3xeVZV5YSAjHFmRzmIOZwbDP14URG0LZFnnWp1bZNwgzKoQ0UwRPNXlNdESMb0jYMnHhmEsRHdG/pub?gid=2110898929&single=true&output=csv";

export async function fetchSongs(onProgress?: (loaded: number, total: number) => void): Promise<Song[]> {
  try {
    // 💡 改善点5: Next.js環境とブラウザ環境の両方でキャッシュが効くように設定
    const res = await fetch(SHEET_URL, { 
      next: { revalidate: 3600 }, // Server-side (Next.js)
      cache: "default"            // Client-side (Browser)
    }); 
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.statusText}`);

    const csvData = await res.text();
    
    // 💡 改善点1 & 2: stepによる毎行処理を廃止し、高速な一括パースに変更
    const parsed = Papa.parse<Record<string, any>>(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, // 💡 改善点3: 数字（レベルやBPM）を自動で string から number に変換
    });

    const totalLines = parsed.data.length;
    if (onProgress) onProgress(0, totalLines); // 開始通知

    const parsedSongs: Song[] = [];

    for (let i = 0; i < totalLines; i++) {
      const row = parsed.data[i];
      const rawSongName = row["楽曲名"];

      // 💡 改善点2: オプショナルチェイニングで未定義によるクラッシュを完全に防止
      if (typeof rawSongName === "string" && rawSongName.trim() !== "") {
        let cleanSongName = rawSongName.trim();
        
        // '*' が含まれる場合はそれ以降をカット
        if (cleanSongName.includes("*")) {
          cleanSongName = cleanSongName.split("*")[0].trim();
        }

        // データをクレンジングして配列に格納
        parsedSongs.push({
          ...row,
          "楽曲名": cleanSongName
        } as unknown as Song);
      }

      // 進捗通知（一括パースなのでループの最後、または一定件数ごとに間引きして叩く）
      if (onProgress && (i % 50 === 0 || i === totalLines - 1)) {
        onProgress(i + 1, totalLines);
      }
    }

    return parsedSongs;
  } catch (error) {
    console.error("Error fetching songs:", error);
    throw error;
  }
}

export async function fetchUpdateLogs(): Promise<UpdateLog[]> {
  try {
    // URLがデフォルトの未設定状態（プレースホルダー）の時はダミーを返す
    if (!LOG_SHEET_URL?.length || LOG_SHEET_URL.includes("__LOG_GID__")) {
      return [
        { version: "v1.0.0", date: "2026.04.01", title: "正式リリース", content: "プロセカレコーダーの正式運用を開始しました。" },
        { version: "v0.5.0", date: "2026.03.29", title: "ランクマレコーダー等実装", content: "UI改修と勝敗計算ロジック実装。ここはダミーデータです。\nあとで api.ts にある LOG_SHEET_URL に正しい「アップデートログ」シートのCSV URLをセットしてください。" }
      ];
    }

    const res = await fetch(LOG_SHEET_URL, { 
      next: { revalidate: 3600 },
      cache: "default"
    });
    if (!res.ok) throw new Error(`Failed to fetch Log CSV: ${res.statusText}`);

    const csvData = await res.text();
    const results = Papa.parse<UpdateLog>(csvData, { 
      header: true,
      skipEmptyLines: true 
    });

    return results.data.filter(l => l && l.version && l.version.trim() !== "");
  } catch (error) {
    console.error("Error fetching logs:", error);
    throw error;
  }
}