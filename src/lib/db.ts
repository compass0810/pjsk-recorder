import { supabase } from "./supabase";
import { RankMatchRecord, PlayResult } from "../types";

// DB Access Layer (Supabase / Cloud Version)
// 全データはサーバー側でユーザーIDに紐づけて保存されます

export const db = {
  profile: {
    get: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    updatePoints: async (points: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").update({ base_points: points }).eq("user_id", user.id);
    },
    updateStats: async (stats: { win: number, lose: number, draw: number, aps: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").update({ 
        base_win: stats.win, 
        base_lose: stats.lose, 
        base_draw: stats.draw, 
        base_aps: stats.aps 
      }).eq("user_id", user.id);
    }
  },

  playResults: {
    getAll: async (): Promise<Record<string, PlayResult>> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};
      const { data } = await supabase.from("play_results").select("*").eq("user_id", user.id);
      
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase.from("play_results").upsert({
        user_id: user.id,
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
      
      if (error) console.error("Save Error:", error);
    },
    upsertMany: async (results: PlayResult[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || results.length === 0) return;
      
      const rows = results.map(r => ({
        user_id: user.id,
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
      if (error) console.error("Batch Save Error:", error);
    }
  },

  rankMatch: {
    getAll: async (): Promise<RankMatchRecord[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("rankmatch_records").select("*").eq("user_id", user.id).order("timestamp", { ascending: false });
      
      return (data || []).map(r => ({
        id: r.id,
        timestamp: r.timestamp,
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
          great: r.rival_great,
          good: r.rival_good,
          bad: r.rival_bad,
          miss: r.rival_miss,
          clearType: r.rival_clear_type as any
        },
        result: r.match_result as any,
        pointChange: parseFloat(r.point_change)
      }));
    },
    insert: async (r: RankMatchRecord) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("rankmatch_records").insert({
        id: r.id,
        user_id: user.id,
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
        rival_great: r.rival.great,
        rival_good: r.rival.good,
        rival_bad: r.rival.bad,
        rival_miss: r.rival.miss,
        rival_clear_type: r.rival.clearType,
        match_result: r.result,
        point_change: r.pointChange,
        timestamp: r.timestamp
      });
    },
    delete: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("rankmatch_records").delete().eq("id", id).eq("user_id", user.id);
    }
  }
};
