export interface Song {
  No: string;
  楽曲名: string;
  X: string;
  M: string;
  A: string;
  "コンボ\n(EXP)": string;
  "コンボ\n(MAS)": string;
  "コンボ\n(APD)": string;
}

export type Difficulty = "EXP" | "MAS" | "APD";

export interface PlayResult {
  songNo: string;
  difficulty: Difficulty;
  great: number;
  good: number;
  bad: number;
  miss: number;
  perfect: number;
  clearType: "CLEAR" | "FC" | "AP" | "FAILED";
  accuracy: string; // 達成率
  updatedAt: number;
}

export interface RankMatchRecord {
  id: string; // 一意のID (UUIDやタイムスタンプ)
  timestamp: number;
  songName: string;
  difficulty: Difficulty;
  level: string;
  rivalName: string;
  you: { great: number; good: number; bad: number; miss: number; clearType: "CLEAR" | "FC" | "AP" | "FAILED" };
  rival: { great: number; good: number; bad: number; miss: number; clearType: "CLEAR" | "FC" | "AP" | "FAILED" };
  result: "WIN" | "LOSE" | "DRAW";
  pointChange: number; // +1.0, -1.0, +1.2 など
}

export interface UpdateLog {
  version: string;
  date: string;
  title: string;
  content: string;
}
