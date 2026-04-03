-- Supabase (PostgreSQL) 完全クラウド保存 & 分析用スキーマ

-- ==========================================
-- 1. profiles テーブル (ユーザープロファイル・通し番号管理)
-- ==========================================
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_no bigserial NOT NULL,
  username text,
  custom_id text UNIQUE,
  base_points numeric(10,2) NOT NULL DEFAULT 0.0,
  base_win integer NOT NULL DEFAULT 0,
  base_lose integer NOT NULL DEFAULT 0,
  base_draw integer NOT NULL DEFAULT 0,
  base_aps integer NOT NULL DEFAULT 0,
  is_admin boolean NOT NULL DEFAULT false,
  hide_email boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT profiles_user_no_key UNIQUE (user_no)
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ユーザーは自分のプロファイルのみ参照可能" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ユーザーは自分のプロファイルのみ更新可能" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ユーザーは自分のプロファイルを挿入可能" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 2. play_results テーブル (通常リザルト記録)
-- ==========================================
CREATE TABLE public.play_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_no text NOT NULL,
  difficulty text NOT NULL, -- 'EXP', 'MAS', 'APD'
  perfect integer NOT NULL DEFAULT 0,
  great integer NOT NULL DEFAULT 0,
  good integer NOT NULL DEFAULT 0,
  bad integer NOT NULL DEFAULT 0,
  miss integer NOT NULL DEFAULT 0,
  clear_type text NOT NULL, -- 'AP', 'FC', 'CLEAR', 'FAILED'
  accuracy numeric(10,4), -- 達成率 (例: 100.0000)
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 検索を高速化するためのインデックス
-- upsert を機能させるために UNIQUE 索引に変更
CREATE UNIQUE INDEX idx_play_results_user_song_diff ON public.play_results(user_id, song_no, difficulty);

-- RLS
ALTER TABLE public.play_results ENABLE ROW LEVEL SECURITY;

-- 操作別ポリシー
CREATE POLICY "play_results_select_own" ON public.play_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "play_results_insert_own" ON public.play_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "play_results_update_own" ON public.play_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "play_results_delete_own" ON public.play_results FOR DELETE USING (auth.uid() = user_id);

-- 管理者は全リザルトを参照可能
CREATE POLICY "play_results_select_admin" ON public.play_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- ==========================================
-- 3. rankmatch_records テーブル (ランクマッチ戦績)
-- ==========================================
CREATE TABLE public.rankmatch_records (
  id text NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_name text NOT NULL,
  difficulty text NOT NULL,
  level_num text NOT NULL,
  rival_name text NOT NULL,
  
  -- 自分側
  you_perfect integer NOT NULL DEFAULT 0,
  you_great integer NOT NULL DEFAULT 0,
  you_good integer NOT NULL DEFAULT 0,
  you_bad integer NOT NULL DEFAULT 0,
  you_miss integer NOT NULL DEFAULT 0,
  you_clear_type text NOT NULL,
  
  -- 相手側
  rival_perfect integer NOT NULL DEFAULT 0,
  rival_great integer NOT NULL DEFAULT 0,
  rival_good integer NOT NULL DEFAULT 0,
  rival_bad integer NOT NULL DEFAULT 0,
  rival_miss integer NOT NULL DEFAULT 0,
  rival_clear_type text NOT NULL,

  -- 試合結果
  match_result text NOT NULL, -- 'WIN', 'LOSE', 'DRAW'
  point_change numeric(10,2) NOT NULL DEFAULT 0.0,
  is_count_points boolean NOT NULL DEFAULT true,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  timestamp bigint NOT NULL
);

-- RLS
ALTER TABLE public.rankmatch_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ユーザーは自分のランクマ戦績のみ参照可能" ON public.rankmatch_records;
DROP POLICY IF EXISTS "ユーザーは自分のランクマ戦績のみ管理可能" ON public.rankmatch_records;

CREATE POLICY "ユーザーは自分のランクマ戦績のみ参照可能" ON public.rankmatch_records
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT/UPDATE 時は WITH CHECK が必要なので明示しておく
CREATE POLICY "ユーザーは自分のランクマ戦績のみ管理可能" ON public.rankmatch_records
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 4. 自動更新用トリガー
-- ==========================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_play_results_modtime BEFORE UPDATE ON public.play_results FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ==========================================
-- 5. bugs テーブル (不具合報告)
-- ==========================================
CREATE TABLE public.bugs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  level integer NOT NULL DEFAULT 1, -- 1: 低, 2: 中, 3: 高
  category text NOT NULL DEFAULT 'bug', -- 'bug', 'request'
  status text NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'resolved'
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "不具合は誰でも参照可能" ON public.bugs FOR SELECT USING (true);
CREATE POLICY "ログインユーザーは不具合を投稿可能" ON public.bugs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "管理人のみ不具合を更新可能" ON public.bugs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- ==========================================
-- 6. bug_comments テーブル (不具合への返信)
-- ==========================================
CREATE TABLE public.bug_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bug_id uuid NOT NULL REFERENCES public.bugs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  content text NOT NULL,
  is_dev boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.bug_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "コメントは誰でも参照可能" ON public.bug_comments FOR SELECT USING (true);
CREATE POLICY "ログインユーザーはコメントを投稿可能" ON public.bug_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_bugs_modtime BEFORE UPDATE ON public.bugs FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ==========================================
-- 7. system_config テーブル (システム設定・メンテナンス管理)
-- ==========================================
CREATE TABLE public.system_config (
  key text NOT NULL PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 初期データの挿入 (メンテナンスOFF)
INSERT INTO public.system_config (key, value)
VALUES ('maintenance', '{"active": false, "start": "", "end": "", "type": "regular", "reason": ""}')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "システム設定は誰でも参照可能" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "管理人のみシステム設定を更新可能" ON public.system_config FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE TRIGGER update_system_config_modtime BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ==========================================
-- 8. 統計用 RPC 関数
-- ==========================================

-- DATABASE STATS RPC
-- 管理ページで物理サイズと行数を取得するための関数
CREATE OR REPLACE FUNCTION get_project_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    db_size bigint;
    results_count bigint;
    ranks_count bigint;
    bugs_count bigint;
    users_count bigint;
BEGIN
    -- データベース全体の物理サイズを取得 (バイト)
    db_size := pg_database_size(current_database());
    
    -- 各テーブルのカウントを取得
    SELECT count(*) INTO results_count FROM play_results;
    SELECT count(*) INTO ranks_count FROM rankmatch_records;
    SELECT count(*) INTO users_count FROM profiles;
    SELECT count(*) INTO bugs_count FROM bugs;
    
    RETURN jsonb_build_object(
        'db_size_bytes', db_size,
        'total_rows', results_count + ranks_count + users_count + bugs_count
    );
END;
$$;

-- ==========================================
-- 9. 管理者向け RLS ポリシー追加
-- (既存の RLS に追加して実行してください)
-- ==========================================

-- play_results: 管理者は全レコードを参照可能
CREATE POLICY "管理人は全リザルトを参照可能" ON public.play_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- rankmatch_records: 管理者は全レコードを参照可能
CREATE POLICY "管理人は全ランクマを参照可能" ON public.rankmatch_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);
