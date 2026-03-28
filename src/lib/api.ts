import Papa from "papaparse";
import { Song, UpdateLog } from "../types";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrm3xeVZV5YSAjHFmRzmIOZwbDP14URG0LZFnnWp1bZNwgzKoQ0UwRPNXlNdESMb0jYMnHhmEsRHdG/pub?gid=536567596&single=true&output=csv";

// ※注意: シートが異なる場合、gidの数字が変わります。ダミー表示用に失敗した時のフォールバックを用意しています。
const LOG_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrm3xeVZV5YSAjHFmRzmIOZwbDP14URG0LZFnnWp1bZNwgzKoQ0UwRPNXlNdESMb0jYMnHhmEsRHdG/pub?gid=2110898929&single=true&output=csv";

export async function fetchSongs(onProgress?: (loaded: number, total: number) => void): Promise<Song[]> {
  try {
    const res = await fetch(SHEET_URL, { next: { revalidate: 3600 } }); // 1時間キャッシュ
    if (!res.ok) throw new Error("Failed to fetch CSV");

    const csvData = await res.text();
    const lines = csvData.split(/\r\n|\n/);
    const totalLines = Math.max(1, lines.length - 1); // 1行目はヘッダー
    
    return new Promise((resolve) => {
      let loadedCount = 0;
      const parsedSongs: Song[] = [];
      let lastReportTime = Date.now();

      Papa.parse<Song>(csvData, {
        header: true,
        worker: false,
        skipEmptyLines: true,
        step: (row) => {
          loadedCount++;
          // 楽曲名が存在する場合のみ追加
          if (row.data["楽曲名"] && row.data["楽曲名"].trim() !== "") {
            // '*' が含まれる場合はそれ以降（内部管理用コメント等）をカット
            if (row.data["楽曲名"].includes("*")) {
              row.data["楽曲名"] = row.data["楽曲名"].split("*")[0].trim();
            }
            parsedSongs.push(row.data);
          }
          
          const now = Date.now();
          if (now - lastReportTime > 20) { // UI更新頻度（毎秒約50回）
            if (onProgress) onProgress(loadedCount, totalLines);
            lastReportTime = now;
          }
        },
        complete: () => {
          if (onProgress) onProgress(totalLines, totalLines);
          resolve(parsedSongs);
        }
      });
    });
  } catch (error) {
    console.error("Error fetching songs:", error);
    return [];
  }
}

export async function fetchUpdateLogs(): Promise<UpdateLog[]> {
  try {
    // URLが書き換えられていない（ダミー設定のまま）場合はfetchせずにダミーを返す
    if (LOG_SHEET_URL.includes("__LOG_GID__")) {
      return [
        { version: "v1.0.0", date: "2026.04.01", title: "正式リリース", content: "プロセカレコーダーの正式運用を開始しました。" },
        { version: "v0.5.0", date: "2026.03.29", title: "ランクマレコーダー等実装", content: "UI改修と勝敗計算ロジック実装。ここはダミーデータです。\nあとで api.ts にある LOG_SHEET_URL に正しい「アップデートログ」シートのCSV URLをセットしてください。" }
      ];
    }

    const res = await fetch(LOG_SHEET_URL, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("Failed to fetch Log CSV");

    const csvData = await res.text();
    const results = Papa.parse<UpdateLog>(csvData, { header: true });

    return results.data.filter(l => l.version && l.version.trim() !== "");
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
}
