export function calculateSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  const maxLen = Math.max(s1.length, s2.length);
  return (maxLen - costs[s2.length]) / maxLen;
}

export function parseLevel(levelStr: string | number): number {
  if (!levelStr) return 0;
  if (typeof levelStr === "number") return levelStr;
  const s = String(levelStr).toUpperCase().trim();
  const romanMap: Record<string, number> = {
    "Ⅰ": 1, "I": 1,
    "Ⅱ": 2, "II": 2,
    "Ⅲ": 3, "III": 3,
    "Ⅳ": 4, "IV": 4,
    "Ⅴ": 5, "V": 5,
    "Ⅵ": 6, "VI": 6,
    "Ⅶ": 7, "VII": 7,
    "Ⅷ": 8, "VIII": 8,
    "Ⅸ": 9, "IX": 9,
    "Ⅹ": 10, "X": 10,
    "Ⅺ": 11, "XI": 11,
    "Ⅻ": 12, "XII": 12
  };
  if (romanMap[s]) {
    return romanMap[s];
  }
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

export function calculateAverageOfTopN(values: number[], n: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => b - a);
  const topN = sorted.slice(0, n);
  const sum = topN.reduce((acc, val) => acc + val, 0);
  return sum / n;
}

// 簡単なクラス結合ユーティリティ (Tailwind用)
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
