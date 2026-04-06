import { PlayResult } from "@/types";

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
