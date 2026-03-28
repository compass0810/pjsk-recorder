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

-- 検索を高速化するためのインデックス (ユーザーごと、曲ごと)
CREATE INDEX idx_play_results_user_song ON public.play_results(user_id, song_no, difficulty);

-- RLS
ALTER TABLE public.play_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ユーザーは自分の通常リザルトのみ参照可能" ON public.play_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ユーザーは自分の通常リザルトのみ管理可能" ON public.play_results FOR ALL USING (auth.uid() = user_id);

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
  rival_great integer NOT NULL DEFAULT 0,
  rival_good integer NOT NULL DEFAULT 0,
  rival_bad integer NOT NULL DEFAULT 0,
  rival_miss integer NOT NULL DEFAULT 0,
  rival_clear_type text NOT NULL,

  -- 試合結果
  match_result text NOT NULL, -- 'WIN', 'LOSE', 'DRAW'
  point_change numeric(10,2) NOT NULL DEFAULT 0.0,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  timestamp bigint NOT NULL
);

-- RLS
ALTER TABLE public.rankmatch_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ユーザーは自分のランクマ戦績のみ参照可能" ON public.rankmatch_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ユーザーは自分のランクマ戦績のみ管理可能" ON public.rankmatch_records FOR ALL USING (auth.uid() = user_id);

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
