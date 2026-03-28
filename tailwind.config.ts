import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "pjsk-bg": "#f0f2f5",
        "pjsk-main": "#00ffee", // ミクさんカラー
        "pjsk-pink": "#ff3388", // APPENDカラー
        "pjsk-purple": "#8844ff", // MASTERカラー
        "pjsk-red": "#ff4444",    // EXPERTカラー
        "pjsk-dark": "#1a1a2e",
      },
    },
  },
  plugins: [],
};
export default config;