"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface Profile {
  user_no: number;
  username: string;
  custom_id: string;
  hide_email: boolean;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [editUsername, setEditUsername] = useState("");
  const [editCustomId, setEditCustomId] = useState("");
  const [hideEmail, setHideEmail] = useState(false);

  useEffect(() => {
    // 認証状態の監視
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await fetchProfile(user.id);
      }
      setLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_no, username, custom_id, hide_email")
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      // プロフィールが存在しない場合は新規作成（初回ログイン時）
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert([{ user_id: userId, username: user?.user_metadata.full_name || "名無しユーザー" }])
        .select()
        .single();
      
      if (!insertError && newProfile) {
        setProfile(newProfile as Profile);
        setEditUsername(newProfile.username || "");
        setEditCustomId(newProfile.custom_id || "");
      }
    } else if (data) {
      setProfile(data as Profile);
      setEditUsername(data.username || "");
      setEditCustomId(data.custom_id || "");
      setHideEmail(!!data.hide_email);
    }
  };

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/account",
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({
        username: editUsername,
        custom_id: editCustomId,
        hide_email: hideEmail,
      })
      .eq("user_id", user.id);

    if (error) {
      showToast("保存に失敗しました。IDが重複している可能性があります。");
    } else {
      showToast("プロフィールを更新しました！");
      if (profile) {
        setProfile({ ...profile, username: editUsername, custom_id: editCustomId, hide_email: hideEmail });
      }
    }
    setSaving(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-transparent">
        <div className="text-xl font-black text-slate-400 animate-pulse">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] p-6 lg:p-8 gap-6 absolute inset-0 overflow-y-auto w-full animate-fade-in-up">
      
      {/* Toast */}
      <div className={`fixed top-6 right-6 z-50 transition-all duration-500 transform ${toast ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0 pointer-events-none"}`}>
        <div className="bg-white/90 backdrop-blur border-l-4 border-cyan-400 p-4 rounded-xl shadow-2xl flex items-center gap-4">
          <div className="bg-cyan-100 text-cyan-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">✓</div>
          <div className="font-bold text-slate-700">{toast}</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-8">
        <header className="text-center md:text-left space-y-2">
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">Account Settings</h1>
          <p className="text-slate-500 font-bold">プロセカレコーダーのアカウント管理</p>
        </header>

        {!user ? (
          /* 未ログイン状態 */
          <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-12 shadow-xl border border-white flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-[2rem] shadow-lg flex items-center justify-center text-white text-4xl">
              👤
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800">ログインが必要です</h2>
              <p className="text-slate-500 font-bold leading-relaxed">
                Googleアカウントでログインすると、<br />
                データの同期やプロフィールの設定が可能になります。
              </p>
            </div>
            <button
              onClick={handleSignIn}
              className="flex items-center gap-3 bg-white border border-slate-200 px-8 py-4 rounded-2xl font-black text-slate-700 shadow-md hover:shadow-lg hover:border-cyan-300 transition-all group active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" alt="Google" className="w-6 h-6" />
              Googleでログイン
            </button>
          </div>
        ) : (
          /* ログイン済み状態 */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* 左側: ユーザー概要カード */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl border border-white flex flex-col items-center text-center space-y-4">
                <div className="relative group">
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="User Avatar"
                    className="w-24 h-24 rounded-[2rem] shadow-md border-4 border-white transition-transform group-hover:scale-105"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md">
                    VERIFIED
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-800">{profile?.username || "---"}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {profile?.hide_email ? user.email?.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + "*".repeat(gp3.length)) : user.email}
                  </p>
                </div>

                <div className="w-full pt-4 border-t border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">User Number</span>
                  <div className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600 font-mono tracking-tighter">
                    #{profile?.user_no ? profile.user_no.toString().padStart(4, '0') : "0000"}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">※この番号は変更できません</p>
                </div>

                <button
                  onClick={handleSignOut}
                  className="w-full mt-4 py-3 rounded-xl font-black text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all text-sm"
                >
                  ログアウト
                </button>
              </div>
            </div>

            {/* 右側: プロフィール編集フォーム */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white/85 backdrop-blur-2xl rounded-[2rem] p-8 shadow-xl border border-white/80 space-y-8">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold">⚙</div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Edit Profile</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black tracking-widest text-slate-400 uppercase ml-1">Username (表示名)</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="アプリ内での名前を入力..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-cyan-100 transition-all placeholder:text-slate-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black tracking-widest text-slate-400 uppercase ml-1">User ID (カスタムID)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">@</span>
                      <input
                        type="text"
                        value={editCustomId}
                        onChange={(e) => setEditCustomId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                        placeholder="unique_id"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pl-10 font-bold font-mono text-slate-700 outline-none focus:ring-4 focus:ring-cyan-100 transition-all placeholder:text-slate-300"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold ml-1 italic">※ 英数字とアンダースコアのみ使用可能です</p>
                  </div>

                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-700">メールアドレスを非表示にする</h3>
                      <p className="text-[10px] text-slate-400 font-bold">プロフィール上の表示をマスク処理します</p>
                    </div>
                    <button
                      onClick={() => setHideEmail(!hideEmail)}
                      className={`w-12 h-6 rounded-full p-1 transition-all duration-300 relative ${hideEmail ? "bg-cyan-500" : "bg-slate-300"}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 transform ${hideEmail ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className={`w-full py-5 rounded-[1.5rem] font-black text-white shadow-lg transition-all transform active:scale-[0.98] ${
                      saving 
                        ? "bg-slate-300 cursor-not-allowed" 
                        : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-cyan-400/20 hover:scale-[1.01]"
                    }`}
                  >
                    {saving ? "保存中..." : "保存する"}
                  </button>
                </div>
              </div>

              {/* 注意事項 */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6">
                <div className="flex gap-3 text-amber-700">
                  <span className="font-bold flex-shrink-0">💡</span>
                  <div className="text-xs space-y-1 font-bold leading-relaxed">
                    <p>ユーザーID（カスタムID）を変更しても、あなたのデータ（戦績など）は失われません。</p>
                    <p>通し番号（User Number）によってすべての記録が紐付けられています。</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
