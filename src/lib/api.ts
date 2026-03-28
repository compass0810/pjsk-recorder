import Papa from "papaparse";
import { Song } from "../types";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrm3xeVZV5YSAjHFmRzmIOZwbDP14URG0LZFnnWp1bZNwgzKoQ0UwRPNXlNdESMb0jYMnHhmEsRHdG/pub?gid=536567596&single=true&output=csv";

export async function fetchSongs(): Promise<Song[]> {
  try {
    const res = await fetch(SHEET_URL, { next: { revalidate: 3600 } }); // 1時間キャッシュ
    if (!res.ok) throw new Error("Failed to fetch CSV");
    
    const csvData = await res.text();
    const results = Papa.parse<Song>(csvData, { header: true });
    
    // 空行や無効なデータを除外
    return results.data.filter(s => s["楽曲名"] && s["楽曲名"].trim() !== "");
  } catch (error) {
    console.error("Error fetching songs:", error);
    return [];
  }
}
