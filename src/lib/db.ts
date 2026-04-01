import { supabase } from "./supabase";
import { RankMatchRecord, PlayResult, Bug, BugComment } from "../types";

// DB Access Layer (Supabase / Cloud Version)
// 全データはサーバー側でユーザーIDに紐づけて保存されます

let cachedUserId: string | null = null;

const getUserId = async () => {
  // null をキャッシュしないようにする（認証完了前に呼ばれた場合の対策）
  if (cachedUserId) return cachedUserId;
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) {
    cachedUserId = user.id;
  }
  return user?.id || null;
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

export const db = {
  profile: {
    get: async () => {
      const userId = await getUserId();
      if (!userId) return null;
      const { data } = await supabase.from("profiles").select("*, is_admin").eq("user_id", userId).single();
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
      const { data } = await supabase.from("play_results").select("*").eq("user_id", userId);
      
      const results: Record<string, PlayResult> = {};
      data?.forEach(r => {
        results[`${r.song_no}-${r.difficulty}`] = {
          songNo: r.song_no,
          difficulty: r.difficulty as any,
          perfect: r.perfect,
          great: r.great,
          good: r.good,
          bad: r.bad,
          miss: r.miss,
          clearType: r.clear_type as any,
          accuracy: r.accuracy.toString(),
          updatedAt: new Date(r.updated_at).getTime()
        };
      });
      return results;
    },
    upsert: async (r: PlayResult) => {
      const userId = await getUserId();
      if (!userId) throw new Error("Not authenticated");
      
      const { error } = await supabase.from("play_results").upsert({
        user_id: userId,
        song_no: r.songNo,
        difficulty: r.difficulty,
        perfect: r.perfect,
        great: r.great,
        good: r.good,
        bad: r.bad,
        miss: r.miss,
        clear_type: r.clearType,
        accuracy: parseFloat(r.accuracy),
        updated_at: new Date(r.updatedAt).toISOString()
      }, { onConflict: 'user_id,song_no,difficulty' });
      
      if (error) {
        console.error("Save Error:", error);
        throw error;
      }
    },
    upsertMany: async (results: PlayResult[]) => {
      const userId = await getUserId();
      if (!userId || results.length === 0) return;
      
      const rows = results.map(r => ({
        user_id: userId,
        song_no: r.songNo,
        difficulty: r.difficulty,
        perfect: r.perfect,
        great: r.great,
        good: r.good,
        bad: r.bad,
        miss: r.miss,
        clear_type: r.clearType,
        accuracy: parseFloat(r.accuracy),
        updated_at: new Date(r.updatedAt || Date.now()).toISOString()
      }));

      const { error } = await supabase.from("play_results").upsert(rows, { onConflict: 'user_id,song_no,difficulty' });
      if (error) {
        console.error("Batch Save Error:", error);
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
        return localRecords; // Fallback to local
      }

      const cloudRecords: RankMatchRecord[] = (data || []).map(r => ({
        id: r.id,
        timestamp: Number(r.timestamp),
        songName: r.song_name,
        difficulty: r.difficulty as any,
        level: r.level_num,
        rivalName: r.rival_name,
        you: {
          perfect: r.you_perfect,
          great: r.you_great,
          good: r.you_good,
          bad: r.you_bad,
          miss: r.you_miss,
          clearType: r.you_clear_type as any
        },
        rival: {
          perfect: r.rival_perfect || 0,
          great: r.rival_great,
          good: r.rival_good,
          bad: r.rival_bad,
          miss: r.rival_miss,
          clearType: r.rival_clear_type as any
        },
        result: r.match_result as any,
        pointChange: isNaN(parseFloat(r.point_change)) ? 0 : parseFloat(r.point_change),
        isCountPoints: r.is_count_points ?? true,
        isSynced: true
      }));

      // Merge: Keep all cloud records + add local records that are NOT in cloud yet
      const merged = [...cloudRecords];
      localRecords.forEach(local => {
        if (!merged.find(m => m.id === local.id)) {
          merged.push({ ...local, isSynced: false });
        }
      });
      
      const sortedMerged = merged.sort((a, b) => b.timestamp - a.timestamp);
      setLocalRankMatchRecords(sortedMerged);
      return sortedMerged;
    },
    insert: async (r: RankMatchRecord) => {
      const userId = await getUserId();
      
      // Always update local first (optimistic)
      const currentLocal = getLocalRankMatchRecords();
      setLocalRankMatchRecords([r, ...currentLocal]);

      if (!userId) throw new Error("Authentication Required for Cloud Sync");

      const { error } = await supabase.from("rankmatch_records").insert({
        id: r.id,
        user_id: userId,
        song_name: r.songName,
        difficulty: r.difficulty,
        level_num: r.level,
        rival_name: r.rivalName,
        you_perfect: r.you.perfect || 0,
        you_great: r.you.great,
        you_good: r.you.good,
        you_bad: r.you.bad,
        you_miss: r.you.miss,
        you_clear_type: r.you.clearType,
        rival_perfect: r.rival.perfect || 0,
        rival_great: r.rival.great,
        rival_good: r.rival.good,
        rival_bad: r.rival.bad,
        rival_miss: r.rival.miss,
        rival_clear_type: r.rival.clearType,
        match_result: r.result,
        point_change: r.pointChange || 0,
        is_count_points: r.isCountPoints !== false,
        timestamp: r.timestamp
      });

      if (error) {
        console.error("Cloud RankMatch Insert Error:", error);
        throw error; // Let the UI handle it (but it's already in local)
      } else {
        // Mark as synced in local storage
        const currentLocal = getLocalRankMatchRecords();
        setLocalRankMatchRecords(currentLocal.map(rec => rec.id === r.id ? { ...rec, isSynced: true } : rec));
      }
    },
    update: async (id: string, r: Partial<RankMatchRecord>) => {
      // Update local mirror
      const currentLocal = getLocalRankMatchRecords();
      const updatedLocal = currentLocal.map(rec => {
        if (rec.id === id) {
          return { ...rec, ...r };
        }
        return rec;
      });
      setLocalRankMatchRecords(updatedLocal);

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
      if (error) console.error("Cloud RankMatch Update Error:", error);
    },
    delete: async (id: string) => {
      // Update local mirror
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
      const { data } = await supabase.from("bugs").select("*").order("created_at", { ascending: false });
      return (data || []).map(b => ({
        id: b.id,
        userId: b.user_id,
        username: b.username,
        title: b.title,
        content: b.content,
        level: b.level as 1 | 2 | 3,
        category: b.category as 'bug' | 'request',
        status: b.status as any,
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
      const { data } = await supabase.from("bug_comments").select("*").eq("bug_id", bugId).order("created_at", { ascending: true });
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
    getAllPlayResults: async () => {
      // ステップ1: 全リザルトを取得
      const { data, error } = await supabase
        .from("play_results")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (error) { console.error("getAllPlayResults Error:", error.message, error); return []; }
      if (!data || data.length === 0) return [];

      // ステップ2: 登場するユーザーIDのプロファイルを取得
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, custom_id")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));

      return data.map((r: any) => ({ ...r, profiles: profileMap[r.user_id] || null }));
    },
    getAllRankMatches: async () => {
      // ステップ1: 全ランクマ記録を取得
      const { data, error } = await supabase
        .from("rankmatch_records")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(2000);
      if (error) { console.error("getAllRankMatches Error:", error.message, error); return []; }
      if (!data || data.length === 0) return [];

      // ステップ2: 登場するユーザーIDのプロファイルを取得
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, custom_id")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));

      return data.map((r: any) => ({ ...r, profiles: profileMap[r.user_id] || null }));
    },
    getMaintenance: async () => {
      const { data } = await supabase.from("system_config").select("value").eq("key", "maintenance").single();
      return data?.value || { active: false, start: "", end: "", type: "regular", reason: "" };
    },
    setMaintenance: async (config: any) => {
      await supabase.from("system_config").update({ value: config }).eq("key", "maintenance");
    }
  }
};
