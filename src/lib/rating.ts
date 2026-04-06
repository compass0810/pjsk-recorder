import { PlayResult, ClearType } from "@/types";

/**
 * 達成率（accuracy）から補正値を計算します。
 * スコア = accuracy * 10000 と計算します（例: 100.0000% -> 1,000,000）
 */
export function calculateAdjustment(accuracy: number): number {
  const score = Math.round(accuracy * 10000);

  if (score >= 1000000) {
    return 4.2;
  } else if (score >= 999000) {
    return 2.0 + (score - 999000) / 50000;
  } else if (score >= 995000) {
    return 1.5 + (score - 995000) / 4000;
  } else if (score >= 990000) {
    return 1.0 + (score - 990000) / 5000;
  } else if (score >= 970000) {
    return (score - 970000) / 10000;
  }

  return 0; // 970000未満は補正なし
}

/**
 * 単曲レートを計算します。
 * 単曲レート = 曲レベル + 補正値
 */
export function calculateSingleRating(level: string | number, accuracy: number): number {
  const levelNum = typeof level === "string" ? parseFloat(level) : level;
  if (isNaN(levelNum)) return 0;
  
  const adjustment = calculateAdjustment(accuracy);
  return levelNum + adjustment;
}

/**
 * 全体レートを計算します。
 * 上位30曲の単曲レートの合計を30で割ったもの。
 * results: ユーザーの全記録
 * songs: 楽曲マスターデータ
 */
export function calculateTotalRating(results: Record<string, PlayResult>, songs: any[]): number {
  const allRatings: number[] = [];

  // 楽曲マスターから全譜面を走査
  songs.forEach(song => {
    // PJSK形式 (X, M, A)
    const pjskDiffs = {
      "EXP": song.X,
      "MAS": song.M,
      "APD": song.A
    };

    Object.entries(pjskDiffs).forEach(([diff, level]) => {
      if (level && level !== "-" && level.trim() !== "") {
        const res = results[`${song.No}-${diff}`];
        if (res) {
          allRatings.push(calculateSingleRating(level, parseFloat(res.accuracy)));
        }
      }
    });

    // Yumeste形式 (STELLA難易度, OLIVIER難易度)
    const yumesteDiffs = {
      "STELLA": song.STELLA難易度,
      "OLIVIER": song.OLIVIER難易度
    };

    Object.entries(yumesteDiffs).forEach(([diff, level]) => {
      if (level && level !== "-" && level.trim() !== "") {
        // Yumesteのキー形式は YM_No-DIFF
        const res = results[`YM_${song.No}-${diff}`];
        if (res) {
          allRatings.push(calculateSingleRating(level, parseFloat(res.accuracy)));
        }
      }
    });
  });

  return calculateAverageOfTopN(allRatings, 30);
}

/**
 * 数値配列から上位N件の平均を計算します
 */
export function calculateAverageOfTopN(values: number[], n: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => b - a);
  const topN = sorted.slice(0, n);
  const sum = topN.reduce((acc, val) => acc + val, 0);
  return sum / n;
}

/**
 * 星章ポイント (Seisho/Star Badge) の詳細計算。
 * ユメステ OLIVIER 難易度専用。
 */
export interface SeishoDetailed {
  total: number;
  accuracyPoints: number;
  judgmentPoints: number;
  lampPoints: number;
  nextAccuracyThreshold: number | null;
  nextJudgmentThreshold: number | null;
  nextLampGoal: string | null;
}

const SEISHO_ACC_TABLE: Record<number, number[]> = {
  // lv1-9
  100.95: [60, 70, 80, 90, 100, 110, 120, 130, 140],
  100.90: [59, 69, 79, 89, 99, 109, 118, 128, 138],
  100.85: [58, 68, 78, 88, 98, 108, 116, 126, 136],
  100.80: [57, 67, 77, 87, 97, 106, 114, 124, 134],
  100.75: [56, 66, 76, 86, 96, 104, 112, 122, 132],
  100.70: [55, 65, 75, 85, 94, 102, 110, 120, 130],
  100.60: [54, 64, 74, 84, 92, 100, 108, 118, 128],
  100.50: [53, 63, 73, 82, 90, 98, 106, 116, 126],
  100.40: [52, 62, 72, 80, 88, 96, 104, 114, 124],
  100.30: [51, 61, 70, 78, 86, 94, 102, 112, 121],
  100.20: [50, 60, 68, 76, 84, 92, 100, 110, 118],
  100.10: [49, 58, 66, 74, 82, 90, 98, 107, 115],
  100.00: [48, 56, 64, 72, 80, 88, 96, 104, 112],
  99.00: [43, 50, 57, 64, 71, 78, 85, 92, 99],
  98.00: [38, 48, 55, 64, 68, 75, 82, 89, 96], // 64 (推定)
  97.00: [36, 42, 48, 54, 59, 65, 71, 77, 83],
  96.00: [34, 40, 46, 52, 56, 62, 68, 74, 80], // 40 (推定)
  95.00: [32, 38, 44, 50, 53, 59, 65, 71, 77], // 32, 44 (推定)
};

export function calculateSeishoDetailed(
  level: number, 
  accuracy: number, 
  perfectBelow: number, 
  clearType: ClearType
): SeishoDetailed {
  const lvIndex = Math.max(1, Math.min(9, level)) - 1; // 1-9 -> 0-8
  
  // A: 達成率ポイント
  let accPoints = 0;
  let nextAcc: number | null = null;
  const thresholds = Object.keys(SEISHO_ACC_TABLE)
    .map(Number)
    .sort((a, b) => b - a);

  for (let i = 0; i < thresholds.length; i++) {
    const t = thresholds[i];
    if (accuracy >= t) {
      accPoints = SEISHO_ACC_TABLE[t][lvIndex];
      nextAcc = i > 0 ? thresholds[i - 1] : null;
      break;
    }
  }
  // 95%未満の場合
  if (accuracy < 95.00) {
    accPoints = 0;
    nextAcc = 95.00;
  }

  // B: PERFECT以下数
  let judgePoints = 0;
  let nextJudge: number | null = null;
  if (perfectBelow <= 10) { judgePoints = 5; nextJudge = null; }
  else if (perfectBelow <= 30) { judgePoints = 4; nextJudge = 10; }
  else if (perfectBelow <= 50) { judgePoints = 3; nextJudge = 30; }
  else if (perfectBelow <= 75) { judgePoints = 2; nextJudge = 50; }
  else if (perfectBelow <= 100) { judgePoints = 1; nextJudge = 75; }
  else { judgePoints = 0; nextJudge = 100; }

  // C: クリアランプ
  let lampPoints = 0;
  let nextLamp: string | null = null;
  if (clearType === 'AP') { lampPoints = 5; nextLamp = null; }
  else if (clearType === 'FC') { lampPoints = 2; nextLamp = 'AP'; }
  else { lampPoints = 0; nextLamp = 'FC'; }

  return {
    total: accPoints + judgePoints + lampPoints,
    accuracyPoints: accPoints,
    judgmentPoints: judgePoints,
    lampPoints: lampPoints,
    nextAccuracyThreshold: nextAcc,
    nextJudgmentThreshold: nextJudge,
    nextLampGoal: nextLamp,
  };
}
