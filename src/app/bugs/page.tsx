"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { Bug, BugComment } from "@/types";

export default function BugsPage() {
  const [activeTab, setActiveTab] = useState<"ongoing" | "resolved">("ongoing");
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<BugComment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 新規投稿用
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBug, setNewBug] = useState({ title: "", content: "", level: 1 as 1 | 2 | 3 });
  
  // コメント投稿用
  const [newComment, setNewComment] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
    setCurrentUserId(user?.id || null);

    if (user) {
      const profile = await db.profile.get();
      if (profile) {
        setIsAdmin(profile.is_admin);
        setCurrentUsername(profile.username || "名無しユーザー");
      }
    }

    const allBugs = await db.bugs.getAll();
    setBugs(allBugs);
    setIsLoading(false);
  };

  const filteredBugs = useMemo(() => {
    if (activeTab === "ongoing") {
      return bugs.filter(b => b.status !== 'resolved');
    } else {
      return bugs.filter(b => b.status === 'resolved');
    }
  }, [bugs, activeTab]);

  const handleBugClick = async (bug: Bug) => {
    setSelectedBug(bug);
    const bugComments = await db.bugComments.getByBugId(bug.id);
    setComments(bugComments);
  };

  const handleCreateBug = async () => {
    if (!newBug.title || !newBug.content || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await db.bugs.create({
        username: currentUsername,
        title: newBug.title,
        content: newBug.content,
        level: newBug.level,
        userId: "" // DB側で取得
      });
      setToastMessage("不具合を報告しました。");
      setIsCreateModalOpen(false);
      setNewBug({ title: "", content: "", level: 1 });
      loadData();
    } catch (e) {
      setToastMessage("エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleUpdateStatus = async (status: Bug['status']) => {
    if (!selectedBug || !isAdmin) return;
    await db.bugs.updateStatus(selectedBug.id, status);
    setSelectedBug({ ...selectedBug, status });
    loadData();
    setToastMessage(`ステータスを ${status} に変更しました。`);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleAddComment = async () => {
    if (!selectedBug || !newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await db.bugComments.add({
        bugId: selectedBug.id,
        username: currentUsername,
        content: newComment,
        isDev: isAdmin,
        userId: "" // DB側
      });
      setNewComment("");
      const updatedComments = await db.bugComments.getByBugId(selectedBug.id);
      setComments(updatedComments);
    } catch (e) {
      setToastMessage("エラーが発生しました。");
      setTimeout(() => setToastMessage(""), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBug = async () => {
    if (!selectedBug) return;
    if (!confirm("この不具合報告を完全に削除してもよろしいですか？")) return;

    try {
      await db.bugs.delete(selectedBug.id);
      setToastMessage("不具合を削除しました。");
      setSelectedBug(null);
      loadData();
    } catch (e) {
      setToastMessage("削除に失敗しました。");
    }
    setTimeout(() => setToastMessage(""), 3000);
  };

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 1: return { label: "低", color: "bg-slate-100 text-slate-500" };
      case 2: return { label: "中", color: "bg-orange-100 text-orange-500" };
      case 3: return { label: "高", color: "bg-rose-100 text-rose-500" };
      default: return { label: "低", color: "bg-slate-100 text-slate-500" };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return { label: "未解決", color: "bg-red-500" };
      case 'investigating': return { label: "調査中", color: "bg-amber-500" };
      case 'resolved': return { label: "解決済み", color: "bg-emerald-500" };
      default: return { label: "不明", color: "bg-slate-500" };
    }
  };

  return (
    <div className="flex h-full p-6 lg:p-10 gap-8 absolute inset-0 overflow-hidden bg-slate-50">
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] animate-fade-in-up">
          <div className="bg-white/90 backdrop-blur shadow-2xl border-l-4 border-cyan-500 p-4 rounded-xl flex items-center gap-3">
            <span className="text-cyan-500 font-black">✓</span>
            <span className="font-bold text-slate-700">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* メイン不具合リスト */}
      <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white overflow-hidden">
        
        {/* ヘッダー */}
        <div className="p-8 border-b border-white/50 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter">Bugs & Reports</h1>
              <p className="text-slate-400 font-bold text-sm">不具合の報告と解決状況の確認</p>
            </div>
            {isLoggedIn && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-slate-200 hover:scale-105 active:scale-95 transition-all text-sm"
              >
                REPORT NEW BUG
              </button>
            )}
          </div>

          {/* タブ */}
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab("ongoing")}
              className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === "ongoing" ? "bg-white text-slate-800 shadow-md ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"}`}
            >
              現在発生中
            </button>
            <button 
              onClick={() => setActiveTab("resolved")}
              className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === "resolved" ? "bg-white text-slate-800 shadow-md ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"}`}
            >
              解決済み
            </button>
          </div>
        </div>

        {/* リスト表示 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-800 rounded-full animate-spin"></div>
              <p className="text-slate-400 font-bold">読み込み中...</p>
            </div>
          ) : filteredBugs.length === 0 ? (
            <div className="text-center py-20 text-slate-300 font-bold">不具合報告はありません</div>
          ) : (
            filteredBugs.map((bug, idx) => {
              const lv = getLevelLabel(bug.level);
              const st = getStatusLabel(bug.status);
              return (
                <button 
                  key={bug.id}
                  onClick={() => handleBugClick(bug)}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                  className="w-full bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all text-left flex items-start gap-6 group animate-fade-in-up"
                >
                  <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-white font-black text-xl shadow-lg ${st.color}`}>
                    {bug.status === 'resolved' ? '✓' : bug.level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${lv.color}`}>LEVEL {bug.level}</span>
                      <span className="text-xs font-bold text-slate-400">{new Date(bug.createdAt).toLocaleString()}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 truncate group-hover:text-cyan-600 transition-colors uppercase">{bug.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">報告者: {bug.username}</span>
                    </div>
                  </div>
                  <div className="self-center">
                    <span className="text-slate-300 font-black text-2xl">→</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 右側: 詳細パネル */}
      <div className="w-1/3 min-w-[400px] flex flex-col bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white overflow-hidden relative">
        {!selectedBug ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl opacity-50">📋</div>
            <p className="text-slate-400 font-bold">左のリストから不具合を選択して<br/>詳細とスレッドを確認してください</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full animate-fade-in-up">
            {/* 詳細ヘッダー */}
            <div className="p-8 border-b bg-white relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black text-white ${getStatusLabel(selectedBug.status).color}`}>
                  {getStatusLabel(selectedBug.status).label}
                </span>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <select 
                      value={selectedBug.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as any)}
                      className="text-[10px] font-black border p-1 rounded-lg outline-none focus:ring-1 ring-slate-400"
                    >
                      <option value="open">未解決に変更</option>
                      <option value="investigating">調査中に変更</option>
                      <option value="resolved">解決済みに変更</option>
                    </select>
                  )}
                  {(isAdmin || (isLoggedIn && selectedBug.userId === currentUserId)) && (
                    <button 
                      onClick={handleDeleteBug}
                      className="bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white p-1 rounded-lg transition-all"
                      title="不具合を削除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter mb-4 leading-tight uppercase">{selectedBug.title}</h2>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-6">
                <p className="text-slate-600 font-bold text-sm leading-relaxed whitespace-pre-wrap">{selectedBug.content}</p>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-2">
                <span>投稿: {selectedBug.username}</span>
                <span>{new Date(selectedBug.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* スレッドスレッド */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b pb-2 mb-4">Replies / discussion</div>
              {comments.map((comment) => (
                <div key={comment.id} className={`flex flex-col ${comment.isDev ? 'items-start' : 'items-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl p-4 shadow-sm relative ${
                    comment.isDev 
                    ? 'bg-slate-800 text-white ring-4 ring-slate-800/10' 
                    : 'bg-white border border-slate-200 text-slate-700'
                  }`}>
                    {comment.isDev && (
                      <span className="absolute -top-2 -right-2 bg-cyan-400 text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">DEV REPLY</span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black ${comment.isDev ? 'text-cyan-400' : 'text-slate-400'}`}>
                        {comment.isDev ? '✨ 開発者: ' : ''}{comment.username}
                      </span>
                    </div>
                    <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                  </div>
                  <span className="text-[8px] font-bold text-slate-400 mt-1 px-2">{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* 返信入力 */}
            <div className="p-6 bg-white border-t border-slate-100 relative z-20">
              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="不具合に関する返信や追加情報..."
                    disabled={isSubmitting}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 ring-slate-200 transition-all resize-none h-20"
                  />
                  <button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className="bg-slate-800 text-white w-20 rounded-2xl font-black text-xs shadow-lg shadow-slate-200 hover:bg-slate-900 disabled:opacity-30 transition-all uppercase"
                  >
                    {isSubmitting ? "..." : "Send"}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs font-bold text-slate-400">
                  返信するにはログインが必要です
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 新規報告モーダル */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col border border-white">
             <div className="p-10">
               <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tighter">REPORT AN ISSUE</h2>
               <p className="text-slate-400 font-bold mb-8">不具合の内容を詳しく教えてください</p>

               <div className="space-y-6">
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Title</label>
                   <input 
                     type="text" 
                     value={newBug.title}
                     onChange={(e) => setNewBug({...newBug, title: e.target.value})}
                     placeholder="例: リザルトが保存されない"
                     className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 ring-slate-200"
                   />
                 </div>

                 <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Bug Level</label>
                    <div className="flex gap-4">
                      {[
                        {v: 1, l: "低", d: "軽微な不具合", c: "bg-slate-50 hover:bg-slate-100 border-slate-100", active: "bg-slate-800 text-white"},
                        {v: 2, l: "中", d: "進行に影響あり", c: "bg-orange-50 hover:bg-orange-100 border-orange-100", active: "bg-orange-500 text-white"},
                        {v: 3, l: "高", d: "致命的なエラー", c: "bg-rose-50 hover:bg-rose-100 border-rose-100", active: "bg-rose-500 text-white"}
                      ].map((lv) => (
                        <button 
                          key={lv.v}
                          onClick={() => setNewBug({...newBug, level: lv.v as any})}
                          className={`flex-1 p-3 rounded-2xl border flex flex-col items-center transition-all ${newBug.level === lv.v ? lv.active : lv.c}`}
                        >
                          <span className="font-black text-sm">LV{lv.v} ( {lv.l} )</span>
                          <span className={`text-[8px] font-bold opacity-70 ${newBug.level === lv.v ? 'text-white' : 'text-slate-400'}`}>{lv.d}</span>
                        </button>
                      ))}
                    </div>
                 </div>

                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Description</label>
                   <textarea 
                     value={newBug.content}
                     onChange={(e) => setNewBug({...newBug, content: e.target.value})}
                     placeholder="発生手順やエラー内容など..."
                     className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 ring-slate-200 resize-none h-40"
                   />
                 </div>
               </div>
             </div>

             <div className="p-8 bg-slate-50 border-t flex gap-4">
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-all"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleCreateBug}
                  disabled={isSubmitting}
                  className="flex-1 py-4 rounded-2xl font-black text-white bg-slate-800 hover:bg-black shadow-xl shadow-slate-200 transition-all uppercase"
                >
                  {isSubmitting ? "Submitting..." : "SUBMIT REPORT"}
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
