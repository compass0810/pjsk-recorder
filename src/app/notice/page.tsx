"use client";

export default function NoticePage() {
  return (
    <div className="flex flex-col min-h-screen p-6 lg:p-12 bg-slate-50 overflow-y-auto pb-20">
      <div className="max-w-4xl mx-auto w-full space-y-12 animate-fade-in-up">
        
        <header className="text-center space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-black tracking-widest uppercase mb-2">Important Notes</div>
          <h1 className="text-5xl font-black text-slate-800 tracking-tighter leading-tight">注意事項</h1>
          <p className="text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
            プロセカレコーダーを快適にご利用いただくための、データ管理と利用規約に関する重要な情報です。
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* データ管理について */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-xl border border-white space-y-6">
            <div className="w-14 h-14 bg-cyan-100 text-cyan-600 rounded-2xl flex items-center justify-center text-2xl font-bold italic shadow-inner">☁️</div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">データの保存・同期</h2>
            <div className="space-y-4 text-slate-600 font-bold leading-relaxed text-sm">
              <p>
                本ツールは <span className="text-cyan-600 decoration-cyan-200 decoration-2 underline-offset-4 underline">Supabase クラウドストレージ</span> を使用しています。
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs">
                <li>ログイン時は、リザルトやランクマッチの戦績が自動的にクラウドに同期されます。</li>
                <li>異なるデバイス（PC、スマホ等）からでも、同一アカウントでログインすればデータを共有可能です。</li>
                <li>ログアウト状態でのプレイは記録がサーバーに保存されませんのでご注意ください。</li>
              </ul>
            </div>
          </div>

          {/* セキュリティとアカウント */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-xl border border-white space-y-6">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold italic shadow-inner">👤</div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">アカウント・個人情報</h2>
            <div className="space-y-4 text-slate-600 font-bold leading-relaxed text-sm">
              <p>
                認証には <span className="text-blue-600">Google OAuth 2.0</span> を採用しており、安全なログインが可能です。
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs">
                <li>取得する情報は「メールアドレス」「ユーザー名」「プロフィール画像」のみです。</li>
                <li>入力されたリザルトデータは、統計情報の匿名での分析（ユーザー総数など）に使用される場合がありますが、個人を特定できる形での公開は行いません。</li>
              </ul>
            </div>
          </div>

          {/* 不具合とフィードバック */}
          <div className="bg-white/10 backdrop-blur-3xl rounded-[2.5rem] p-10 shadow-2xl border border-slate-200/50 space-y-6 md:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full" />
             <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center text-2xl font-bold italic shadow-inner relative z-10">🐞</div>
             <h2 className="text-2xl font-black tracking-tight relative z-10">不具合の報告・改善依頼</h2>
             <div className="text-slate-300 font-bold leading-relaxed text-sm relative z-10 max-w-2xl">
               <p className="mb-4">
                 アプリ内で発生したエラーや、データが正しく反映されない等の不具合は、左パネルの <span className="text-cyan-400">「不具合報告」</span> ページから報告いただけます。
               </p>
               <p>
                 開発チームは定期的に報告内容を確認し、順次「調査・修正中」「解決済」の対応を行っています。重要度に応じて優先的に対応いたしますので、お気軽にご投稿ください。
               </p>
             </div>
          </div>

          {/* 免責事項 */}
          <div className="border-t-2 border-slate-200 pt-8 mt-4 md:col-span-2">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Disclaimer</h3>
             <p className="text-[10px] text-slate-400 font-bold leading-relaxed px-2 italic">
               本ツールを利用して発生したいかなる損害・事故等についても、開発者は一切の責任を負いかねます。
               本ツールは個人の活動として運営されており、プロジェクトセカイ公式とは一切関係ありません。
               データの完全な保存を保証するものではないため、重要な記録についてはご自身での管理を推奨いたします。
             </p>
          </div>

        </div>

        <footer className="text-center pt-20">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">© 2026 PJSK Recorder Project Team</p>
        </footer>

      </div>
    </div>
  );
}
