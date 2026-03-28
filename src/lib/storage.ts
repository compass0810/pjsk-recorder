import { PlayResult, RankMatchRecord } from "../types";

const STORAGE_KEY_RESULTS = "pjsk_recorder_results";

// 辞書型（キー: songNo_difficulty）で一元管理する
export function loadResults(): Record<string, PlayResult> {
  if (typeof window === "undefined") return {};
  try {
    const data = window.localStorage.getItem(STORAGE_KEY_RESULTS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Failed to load results from localStorage", error);
    return {};
  }
}

export function saveResult(result: PlayResult) {
  if (typeof window === "undefined") return;
  try {
    const results = loadResults();
    const key = `${result.songNo}_${result.difficulty}`;
    results[key] = result;
    window.localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(results));
  } catch (error) {
    console.error("Failed to save result to localStorage", error);
  }
}

export function getResultKey(songNo: string, diff: string) {
  return `${songNo}_${diff}`;
}

// === ランクマ用 ===
const STORAGE_KEY_RANKMATCH = "pjsk_recorder_rankmatch";

export function loadRankMatchRecords(): RankMatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const data = window.localStorage.getItem(STORAGE_KEY_RANKMATCH);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load rank match records", error);
    return [];
  }
}

export function saveRankMatchRecord(record: RankMatchRecord) {
  if (typeof window === "undefined") return;
  try {
    const records = loadRankMatchRecords();
    records.unshift(record); // 最新を先頭に追加
    window.localStorage.setItem(STORAGE_KEY_RANKMATCH, JSON.stringify(records));
  } catch (error) {
    console.error("Failed to save rank match record", error);
  }
}

export function deleteRankMatchRecord(id: string) {
  if (typeof window === "undefined") return;
  try {
    const records = loadRankMatchRecords().filter(r => r.id !== id);
    window.localStorage.setItem(STORAGE_KEY_RANKMATCH, JSON.stringify(records));
  } catch (error) {
    console.error("Failed to delete rank match record", error);
  }
}
