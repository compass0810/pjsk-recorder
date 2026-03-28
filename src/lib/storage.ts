import { PlayResult } from "../types";

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
