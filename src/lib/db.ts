import { supabase } from "./supabase";
import { RankMatchRecord, PlayResult, Bug, BugComment, ClearType, PjskDifficulty, YumesteDifficulty } from "../types";

// DB Access Layer (Supabase / Cloud Version)

// 💡 改善点1: getUser()はネットワーク通信を伴うため、セッションから高速に取得する関数も用意
const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

// localStorage utility for rank match
const LOCAL_STORAGE_KEY_RANKMATCH = "pjsk_rankmatch_records_local";
const getLocalRankMatchRecords = (): RankMatchRecord[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY_RANKMATCH);
  return stored ? JSON.parse(stored) : [];
};
const setLocalRankMatchRecords = (records: RankMatchRecord[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY_RANKMATCH, JSON.stringify(records));
};

const normalizeNumber = (v: unknown, fallback: number = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeString = (v: unknown, fallback: string = "") => {
  return typeof v === "string" ? v : fallback;
};

const normalizeClearType = (v: unknown): ClearType => {
  return (typeof v === "string" && (v === "CLEAR" || v === "FC" || v === "AP" || v === "FAILED")) ? v as ClearType : "CLEAR";
};

// 💡 共通のマップ関数を作ってコードを共通化
const mapRankMatchRow = (r: any): RankMatchRecord => ({
  id: r.id,
  timestamp: Number(r.timestamp),
  songName: r.song_name,
  difficulty: r.difficulty as PjskDifficulty,
  level: r.level_num,
  rivalName: r.rival_name,
  you: {
    perfect: r.you_perfect,
    great: r.you_great,
    good: r.you_good,
    bad: r.you_bad,
    miss: r.you_miss,
    clearType: r.you_clear_type as ClearType
  },
  rival: {
    perfect: r.rival_perfect || 0,
    great: r.rival_great,
    good: r.rival_good,
    bad: r.rival_bad,
    miss: r.rival_miss,
    clearType: r.rival_clear_type as ClearType
  },
  result: r.match_result as "WIN" | "LOSE" | "DRAW",
  pointChange: isNaN(parseFloat(r.point_change)) ? 0 : parseFloat(r.point_change),
  isCountPoints: r.is_count_points ?? true,
  isSynced: true
});

export const db = {
  profile: {
    get: async () => {
      const userId = await getUserId();
      if (!userId) return null;
      const { data, error } = await supabase.from("profiles").select("*, is_admin").eq("user_id", userId).single();
      if (error) console.error("[db.profile.get] Error:", error.message);
      return data;
    },
    updatePoints: async (points: number) => {
      const userId = await getUserId();
      if (!userId) return;
      await supabase.from("profiles").update({ base_points: points }).eq("user_id", userId);
    },
    updateStats: async (stats: { win: number, lose: number, draw: number, aps: number }) => {
      const userId = await getUserId();
      if (!userId) return;
      await supabase.from("profiles").update({ 
        base_win: stats.win, 
        base_lose: stats.lose, 
        base_draw: stats.draw, 
        base_aps: stats.aps 
      }).eq("user_id", userId);
    },
    updateSettings: async (settings: { hide_email: boolean }) => {
      const userId = await getUserId();
      if (!userId) return;
      await supabase.from("profiles").update({ hide_email: settings.hide_email }).eq("user_id", userId);
    }
  },

  playResults: {
    getAll: async (): Promise<Record<string, PlayResult>> => {
      const userId = await getUserId();
      if (!userId) return {};
      const { data, error } = await supabase.from("play_results").select("*").eq("user_id", userId);
      
      if (error) {
        console.error("[db.playResults.getAll] Error:", error.message);
        return {};
      }
      
      const results: Record<string, PlayResult> = {};
      data?.forEach(r => {
        results[`${r.song_no}-${r.difficulty}`] = {
          songNo: r.song_no,
          difficulty: r.difficulty as PjskDifficulty | YumesteDifficulty,
          perfectPlus: r.perfect_plus || 0,
          perfect: r.perfect,
          great: r.great,
          good: r.good,
          bad: r.bad,
          miss: r.miss,
          clearType: r.clear_type as ClearType,
          accuracy: r.accuracy.toString(),
          bestAccPts: r.best_acc_pts || 0,
          bestJudgePts: r.best_judge_pts || 0,
          bestLampPts: r.best_lamp_pts || 0,
          updatedAt: new Date(r.updated_at).getTime()
        };
      });
      return results;
    },
    upsert: async (r: PlayResult) => {
      const userId = await getUserId();
      if (!userId) throw new Error("Not authenticated");

      const accuracyNum = parseFloat(r.accuracy);

      const { error } = await supabase.from("play_results").upsert({
        user_id: userId,
        song_no: r.songNo,
        difficulty: r.difficulty,
        perfect_plus: r.perfectPlus ?? 0,
        perfect: r.perfect ?? 0,
        great: r.great ?? 0,
        good: r.good ?? 0,
        bad: r.bad ?? 0,
        miss: r.miss ?? 0,
        clear_type: r.clearType,
        accuracy: Number.isFinite(accuracyNum) ? accuracyNum : 0,
        best_acc_pts: r.bestAccPts || 0,
        best_judge_pts: r.bestJudgePts || 0,
        best_lamp_pts: r.bestLampPts || 0,
        updated_at: new Date(r.updatedAt).toISOString()
      }, { onConflict: 'user_id,song_no,difficulty' });

      if (error) {
        console.error("[db.playResults.upsert] Save Error:", error.message, error.details, { songNo: r.songNo, difficulty: r.difficulty });
        throw error;
      }
    },
    upsertMany: async (results: PlayResult[]) => {
      const userId = await getUserId();
      if (!userId || results.length === 0) return;

      const rows = results.map(r => {
        const accuracyNum = parseFloat(r.accuracy);
        return {
          user_id: userId,
          song_no: r.songNo,
          difficulty: r.difficulty,
          perfect_plus: r.perfectPlus ?? 0,
          perfect: r.perfect ?? 0,
          great: r.great ?? 0,
          good: r.good ?? 0,
          bad: r.bad ?? 0,
          miss: r.miss ?? 0,
          clear_type: r.clearType,
          accuracy: Number.isFinite(accuracyNum) ? accuracyNum : 0,
          best_acc_pts: r.bestAccPts || 0,
          best_judge_pts: r.bestJudgePts || 0,
          best_lamp_pts: r.bestLampPts || 0,
          updated_at: new Date(r.updatedAt || Date.now()).toISOString()
        };
      });

      const { error } = await supabase.from("play_results").upsert(rows, { onConflict: 'user_id,song_no,difficulty' });
      if (error) {
        console.error("[db.playResults.upsertMany] Batch Save Error:", error.message, error.details);
        throw error;
      }
    },
    delete: async (songNo: string, difficulty: string) => {
      const userId = await getUserId();
      if (!userId) return;
      await supabase.from("play_results").delete().eq("user_id", userId).eq("song_no", songNo).eq("difficulty", difficulty);
    }
  },

  rankMatch: {
    getAll: async (): Promise<RankMatchRecord[]> => {
      const userId = await getUserId();
      const localRecords = getLocalRankMatchRecords();
      
      if (!userId) return localRecords;

      const { data, error } = await supabase.from("rankmatch_records").select("*").eq("user_id", userId).order("timestamp", { ascending: false });
      
      if (error) {
        console.error("Cloud RankMatch Fetch Error:", error);
        return localRecords;
      }

      const cloudRecords: RankMatchRecord[] = (data || []).map(mapRankMatchRow);

      // Merge
      const merged = [...cloudRecords];
      localRecords.forEach(local => {
        if (!merged.find(m => m.id === local.id)) {
          merged.push({ ...local, isSynced: local.isSynced ?? false });
        }
      });
      
      const sortedMerged = merged.sort((a, b) => b.timestamp - a.timestamp);
      setLocalRankMatchRecords(sortedMerged);

      // 💡 改善点2: ループでsyncOneを回さず、一括同期（バッチ処理）をバックグラウンドで実行
      const unsynced = merged.filter(m => !m.isSynced);
      if (unsynced.length > 0) {
        db.rankMatch.syncMany(unsynced).catch(err => {
          console.warn("Auto-Sync Failed:", err);
        });
      }

      return sortedMerged;
    },

    // 💡 改善点3: 大量データも一発で同期できるバッチ関数を追加
    syncMany: async (records: RankMatchRecord[]) => {
      if (records.length === 0) return;
      const userId = await getUserId();
      if (!userId) throw new Error("Authentication Required for Cloud Sync");

      const rows = records.map(r => ({
        id: r.id,
        user_id: userId,
        song_name: normalizeString(r.songName, r.songName),
        difficulty: normalizeString(r.difficulty, String(r.difficulty)),
        level_num: normalizeString(r.level, String(r.level)),
        rival_name: normalizeString(r.rivalName, r.rivalName),
        you_perfect: normalizeNumber(r.you?.perfect, 0),
        you_great: normalizeNumber(r.you?.great, 0),
        you_good: normalizeNumber(r.you?.good, 0),
        you_bad: normalizeNumber(r.you?.bad, 0),
        you_miss: normalizeNumber(r.you?.miss, 0),
        you_clear_type: normalizeClearType(r.you?.clearType),
        rival_perfect: normalizeNumber(r.rival?.perfect, 0),
        rival_great: normalizeNumber(r.rival?.great, 0),
        rival_good: normalizeNumber(r.rival?.good, 0),
        rival_bad: normalizeNumber(r.rival?.bad, 0),
        rival_miss: normalizeNumber(r.rival?.miss, 0),
        rival_clear_type: normalizeClearType(r.rival?.clearType),
        match_result: r.result,
        point_change: normalizeNumber(r.pointChange, 0),
        is_count_points: r.isCountPoints !== false,
        timestamp: Math.floor(normalizeNumber(r.timestamp, Date.now()))
      }));

      const { error } = await supabase.from("rankmatch_records").upsert(rows, { onConflict: 'id' });

      if (error) {
        throw new Error(`syncMany failed: ${error.message}`);
      } else {
        // 同期完了フラグを一括でローカルに反映
        const syncedIds = new Set(records.map(r => r.id));
        const currentLocal = getLocalRankMatchRecords();
        setLocalRankMatchRecords(currentLocal.map(rec => syncedIds.has(rec.id) ? { ...rec, isSynced: true } : rec));
      }
    },

    syncOne: async (r: RankMatchRecord) => {
      // 既存の単発同期も内部的にsyncManyを再利用して安全に
      await db.rankMatch.syncMany([r]);
    },

    insert: async (r: RankMatchRecord) => {
      const userId = await getUserId();
      
      // 楽観的アップデート（最初は未同期フラグを明示）
      const currentLocal = getLocalRankMatchRecords();
      setLocalRankMatchRecords([{ ...r, isSynced: false }, ...currentLocal]);

      if (!userId) throw new Error("Authentication Required for Cloud Sync");

      // 💡 改善点4: insertではなくupsertを使うことで、重複エラーによるクラッシュを防止
      const { error } = await supabase.from("rankmatch_records").upsert({
        id: r.id,
        user_id: userId,
        song_name: normalizeString(r.songName, r.songName),
        difficulty: normalizeString(r.difficulty, String(r.difficulty)),
        level_num: normalizeString(r.level, String(r.level)),
        rival_name: normalizeString(r.rivalName, r.rivalName),
        you_perfect: normalizeNumber(r.you?.perfect, 0),
        you_great: normalizeNumber(r.you?.great, 0),
        you_good: normalizeNumber(r.you?.good, 0),
        you_bad: normalizeNumber(r.you?.bad, 0),
        you_miss: normalizeNumber(r.you?.miss, 0),
        you_clear_type: normalizeClearType(r.you?.clearType),
        rival_perfect: normalizeNumber(r.rival?.perfect, 0),
        rival_great: normalizeNumber(r.rival?.great, 0),
        rival_good: normalizeNumber(r.rival?.good, 0),
        rival_bad: normalizeNumber(r.rival?.bad, 0),
        rival_miss: normalizeNumber(r.rival?.miss, 0),
        rival_clear_type: normalizeClearType(r.rival?.clearType),
        match_result: r.result,
        point_change: normalizeNumber(r.pointChange, 0),
        is_count_points: r.isCountPoints !== false,
        timestamp: Math.floor(normalizeNumber(r.timestamp, Date.now()))
      }, { onConflict: 'id' });

      if (error) {
        console.error("Cloud RankMatch Insert Error:", error);
        throw new Error(`insert failed: ${error.message}`);
      } else {
        const currentLocalNow = getLocalRankMatchRecords();
        setLocalRankMatchRecords(currentLocalNow.map(rec => rec.id === r.id ? { ...rec, isSynced: true } : rec));
      }
    },
    update: async (id: string, r: Partial<RankMatchRecord>) => {
      const currentLocal = getLocalRankMatchRecords();
      setLocalRankMatchRecords(currentLocal.map(rec => rec.id === id ? { ...rec, ...r, isSynced: false } : rec));

      const userId = await getUserId();
      if (!userId) return;

      const updateData: any = {};
      if (r.songName !== undefined) updateData.song_name = r.songName;
      if (r.difficulty !== undefined) updateData.difficulty = r.difficulty;
      if (r.level !== undefined) updateData.level_num = r.level;
      if (r.rivalName !== undefined) updateData.rival_name = r.rivalName;
      if (r.result !== undefined) updateData.match_result = r.result;
      if (r.pointChange !== undefined) updateData.point_change = r.pointChange;
      if (r.isCountPoints !== undefined) updateData.is_count_points = r.isCountPoints;
      if (r.timestamp !== undefined) updateData.timestamp = r.timestamp;
      
      if (r.you) {
        if (r.you.perfect !== undefined) updateData.you_perfect = r.you.perfect;
        if (r.you.great !== undefined) updateData.you_great = r.you.great;
        if (r.you.good !== undefined) updateData.you_good = r.you.good;
        if (r.you.bad !== undefined) updateData.you_bad = r.you.bad;
        if (r.you.miss !== undefined) updateData.you_miss = r.you.miss;
        if (r.you.clearType !== undefined) updateData.you_clear_type = r.you.clearType;
      }
      
      if (r.rival) {
        if (r.rival.perfect !== undefined) updateData.rival_perfect = r.rival.perfect;
        if (r.rival.great !== undefined) updateData.rival_great = r.rival.great;
        if (r.rival.good !== undefined) updateData.rival_good = r.rival.good;
        if (r.rival.bad !== undefined) updateData.rival_bad = r.rival.bad;
        if (r.rival.miss !== undefined) updateData.rival_miss = r.rival.miss;
        if (r.rival.clearType !== undefined) updateData.rival_clear_type = r.rival.clearType;
      }

      const { error } = await supabase.from("rankmatch_records").update(updateData).eq("id", id).eq("user_id", userId);
      if (error) {
        console.error("Cloud RankMatch Update Error:", error);
      } else {
        const currentLocalNow = getLocalRankMatchRecords();
        setLocalRankMatchRecords(currentLocalNow.map(rec => rec.id === id ? { ...rec, isSynced: true } : rec));
      }
    },
    delete: async (id: string) => {
      const currentLocal = getLocalRankMatchRecords();
      setLocalRankMatchRecords(currentLocal.filter(r => r.id !== id));

      const userId = await getUserId();
      if (!userId) return;
      const { error } = await supabase.from("rankmatch_records").delete().eq("id", id).eq("user_id", userId);
      if (error) console.error("Cloud RankMatch Delete Error:", error);
    }
  },
  
  bugs: {
    getAll: async (): Promise<Bug[]> => {
      const { data, error } = await supabase.from("bugs").select("*").order("created_at", { ascending: false });
      if (error) console.error("[db.bugs.getAll] Error:", error.message);
      return (data || []).map(b => ({
        id: b.id,
        userId: b.user_id,
        username: b.username,
        title: b.title,
        content: b.content,
        level: b.level as 1 | 2 | 3,
        category: b.category as 'bug' | 'request',
        status: b.status as Bug['status'], // 💡 anyキャストを修正
        createdAt: new Date(b.created_at).getTime(),
        updatedAt: new Date(b.updated_at).getTime()
      }));
    },
    create: async (bug: Omit<Bug, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
      const userId = await getUserId();
      if (!userId) return null;
      const { data, error } = await supabase.from("bugs").insert({
        user_id: userId,
        username: bug.username,
        title: bug.title,
        content: bug.content,
        level: bug.level,
        category: bug.category || 'bug',
        status: 'open'
      }).select().single();
      if (error) throw error;
      return data;
    },
    updateStatus: async (id: string, status: Bug['status']) => {
      await supabase.from("bugs").update({ status }).eq("id", id);
    },
    delete: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("bugs").delete().eq("id", id);
    }
  },

  bugComments: {
    getByBugId: async (bugId: string): Promise<BugComment[]> => {
      const { data, error } = await supabase.from("bug_comments").select("*").eq("bug_id", bugId).order("created_at", { ascending: true });
      if (error) console.error("[db.bugComments.getByBugId] Error:", error.message);
      return (data || []).map(c => ({
        id: c.id,
        bugId: c.bug_id,
        userId: c.user_id,
        username: c.username,
        content: c.content,
        isDev: c.is_dev,
        createdAt: new Date(c.created_at).getTime()
      }));
    },
    add: async (comment: Omit<BugComment, 'id' | 'createdAt'>) => {
      const userId = await getUserId();
      if (!userId) return null;
      const { data, error } = await supabase.from("bug_comments").insert({
        bug_id: comment.bugId,
        user_id: userId,
        username: comment.username,
        content: comment.content,
        is_dev: comment.isDev
      }).select().single();
      if (error) throw error;
      return data;
    }
  },

  admin: {
    getStats: async () => {
      const [users, results, ranks, bugs] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("play_results").select("*", { count: "exact", head: true }),
        supabase.from("rankmatch_records").select("*", { count: "exact", head: true }),
        supabase.from("bugs").select("*", { count: "exact", head: true }),
      ]);
      return {
        userCount: users.count || 0,
        resultCount: results.count || 0,
        rankMatchCount: ranks.count || 0,
        bugCount: bugs.count || 0
      };
    },
    getProjectStats: async () => {
      const { data, error } = await supabase.rpc('get_project_stats');
      if (error) {
        console.error("Project Stats RPC Error:", error);
        return { db_size_bytes: 0, total_rows: 0 };
      }
      return data;
    },
    
    // 💡 改善点5: PostgreSQLのJOIN（リレーション結合）を使い、1回のクエリでまとめて取得
    getAllPlayResults: async () => {
      const { data, error } = await supabase
        .from("play_results")
        .select(`
          *,
          profiles:user_id (user_id, username, custom_id)
        `)
        .order("updated_at", { ascending: false })
        .limit(2000);

      if (error) { 
        console.error("getAllPlayResults Error:", error.message); 
        return []; 
      }
      return data || [];
    },
    
    // 💡 改善点5（続き）: こちらも二重クエリと手動マッピングを廃止
    getAllRankMatches: async () => {
      const { data, error } = await supabase
        .from("rankmatch_records")
        .select(`
          *,
          profiles:user_id (user_id, username, custom_id)
        `)
        .order("timestamp", { ascending: false })
        .limit(2000);

      if (error) { 
        console.error("getAllRankMatches Error:", error.message); 
        return []; 
      }
      return data || [];
    },
    
    getMaintenance: async () => {
      const { data } = await supabase.from("system_config").select("value").eq("key", "maintenance").single();
      return data?.value || { active: false, start: "", end: "", type: "regular", reason: "" };
    },
    setMaintenance: async (config: any) => {
      await supabase.from("system_config").update({ value: config }).eq("key", "maintenance");
    },
    getAppVersion: async () => {
      const { data } = await supabase.from("system_config").select("value").eq("key", "app_version").single();
      return typeof data?.value === "string" ? data.value : "v1.1.0.beta3(2026.04.06)";
    },
    setAppVersion: async (version: string) => {
      const { error } = await supabase.from("system_config").upsert({ key: "app_version", value: version }, { onConflict: "key" });
      if (error) {
        console.error("setAppVersion error:", error);
        throw error;
      }
    }
  }
};