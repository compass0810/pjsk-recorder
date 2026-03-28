export interface Song {
  No: string;
  楽曲名: string;
  X: string;
  M: string;
  A: string;
  "コンボ(EXP)": string;
  "コンボ(MAS)": string;
  "コンボ(APD)": string;
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
  updatedAt: number;
}
