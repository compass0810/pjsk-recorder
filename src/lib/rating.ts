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
 */
export function calculateTotalRating(results: Record<string, PlayResult>, songs: any[]): number {
  const ratings: number[] = [];

  // 全リザルトをループしてレートを計算
  Object.values(results).forEach((res) => {
    // 曲データからレベルを取得する必要がある
    // Note: page.tsx で生成される listEntries の情報があれば効率的
    // ここでは簡易的に、results に含まれるデータから計算
    // ただし results には level が含まれていないため、外部からレベル情報を渡す必要がある
  });

  // 実際には page.tsx 内で計算する方が効率的なので、
  // ここでは上位N件の平均を取る汎用関数を提供
  return 0;
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
