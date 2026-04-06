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

export interface YumesteSong {
  No: string;
  曲名: string;
  ユニット: string;
  STELLA難易度: string;
  OLIVIER難易度: string;
  STELLAノーツ: string;
  OLIVIERノーツ: string;
  時間: string;
}

export type PjskDifficulty = "EXP" | "MAS" | "APD";
export type YumesteDifficulty = "STELLA" | "OLIVIER";
export type Difficulty = PjskDifficulty | YumesteDifficulty;
export type ClearType = "CLEAR" | "FC" | "AP" | "FAILED";

export interface Top100Player {
  rank: number;
  name: string;
  score: string;
}

export interface PlayResult {
  songNo: string;
  difficulty: Difficulty;
  perfectPlus?: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
  perfect: number;
  clearType: ClearType;
  accuracy: string; // 達成率
  bestAccPts?: number; // 達成率の自己ベストポイント (ユメステ)
  bestJudgePts?: number; // 判定精度の自己ベストポイント (ユメステ)
  bestLampPts?: number; // ランプの自己ベストポイント (ユメステ)
  updatedAt: number;
}

export interface RankMatchRecord {
  id: string; // 一意のID (UUIDやタイムスタンプ)
  timestamp: number;
  songName: string;
  difficulty: Difficulty;
  level: string;
  rivalName: string;
  you: { perfect: number; great: number; good: number; bad: number; miss: number; clearType: ClearType };
  rival: { perfect: number; great: number; good: number; bad: number; miss: number; clearType: ClearType };
  result: "WIN" | "LOSE" | "DRAW";
  pointChange: number; // +1.0, -1.0, +1.2 など
  isCountPoints?: boolean; // ポイント計算に含めるかどうか
  isSynced?: boolean; // クラウドと同期済みかどうか
}

export interface Bug {
  id: string;
  userId: string;
  username: string;
  title: string;
  content: string;
  level: 1 | 2 | 3;
  category: 'bug' | 'request';
  status: 'open' | 'investigating' | 'resolved';
  createdAt: number;
  updatedAt: number;
}

export interface BugComment {
  id: string;
  bugId: string;
  userId: string;
  username: string;
  content: string;
  isDev: boolean;
  createdAt: number;
}

export interface UpdateLog {
  version: string;
  date: string;
  title: string;
  content: string;
}
