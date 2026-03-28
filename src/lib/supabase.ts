import { createClient } from "@supabase/supabase-js";

// 注意: 本番環境では .env.local 等の環境変数で管理することを推奨します
const supabaseUrl = "https://xwhmxjdnltngfaketbbi.supabase.co";
const supabaseKey = "sb_publishable_kkQg59sr0RaHChkdLN_ePA_tJXWQXyz";

export const supabase = createClient(supabaseUrl, supabaseKey);
