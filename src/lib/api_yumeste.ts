import Papa from "papaparse";

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

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRtk9zz0W49lgQGID9nOFGFvm7OfGCN07q5kYT2VikOJ8CDZJb4C4-7FEv-uKT9Vl1aLHdfYvKoqAiz/pub?gid=0&single=true&output=csv";

export async function fetchYumesteSongs(onProgress?: (loaded: number, total: number) => void): Promise<YumesteSong[]> {
  try {
    const res = await fetch(SHEET_URL, { next: { revalidate: 3600 } }); 
    if (!res.ok) throw new Error("Failed to fetch Yumeste CSV");

    const csvData = await res.text();
    const parsedSongs: YumesteSong[] = [];
    
    return new Promise((resolve) => {
      let loadedCount = 0;
      let lastReportTime = Date.now();
      let rowIndex = 0;

      Papa.parse<any>(csvData, {
        header: false,
        worker: false,
        skipEmptyLines: true,
        step: (row) => {
          rowIndex++;
          // 3行目(インデックス2)からデータ行
          if (rowIndex >= 3) {
            const data = row.data as string[];
            loadedCount++;
            
            // A(0):No, C(2):曲名, D(3):ユニット, H(7):STELLA, I(8):OLIVIER, J(9):STELLAノーツ, K(10):OLIVIERノーツ, L(11):時間
            const no = data[0];
            const name = data[2];
            const unit = data[3];
            const stella = data[7];
            const olivier = data[8];
            const stellaNotes = data[9];
            const olivierNotes = data[10];
            const time = data[11];

            if (name && name.trim() !== "") {
              parsedSongs.push({
                No: no,
                曲名: name,
                ユニット: unit,
                STELLA難易度: stella,
                OLIVIER難易度: olivier,
                STELLAノーツ: stellaNotes,
                OLIVIERノーツ: olivierNotes,
                時間: time
              });
            }
          }
          
          const now = Date.now();
          if (now - lastReportTime > 20) {
            if (onProgress) onProgress(loadedCount, 300); // ユメステ曲数の概算
            lastReportTime = now;
          }
        },
        complete: () => {
          if (onProgress) onProgress(parsedSongs.length, parsedSongs.length);
          resolve(parsedSongs);
        }
      });
    });
  } catch (error) {
    console.error("Error fetching yumeste songs:", error);
    return [];
  }
}
