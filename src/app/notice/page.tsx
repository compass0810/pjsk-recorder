"use client";

export default function NoticePage() {
  return (
    <div className="flex flex-col min-h-screen p-6 lg:p-12 bg-slate-50 overflow-y-auto pb-20">
      <div className="max-w-4xl mx-auto w-full space-y-16 animate-fade-in-up">
        
        <header className="text-center space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-100 text-cyan-600 text-[10px] font-black tracking-widest uppercase mb-2">Guide & Notice</div>
          <h1 className="text-5xl font-black text-slate-800 tracking-tighter leading-tight">使い方・注意事項</h1>
          <p className="text-slate-500 font-bold max-w-lg mx-auto leading-relaxed">
            プロセカレコーダーを初めて使う方へ。便利に使いこなすための手順と、知っておくべき重要な約束事です。
          </p>
        </header>

        {/* 使い方ガイドセクション */}
        <section className="space-y-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-0.5 flex-1 bg-slate-200"></div>
            <h2 className="text-2xl font-black text-slate-400 uppercase tracking-widest px-4">How to Use</h2>
            <div className="h-0.5 flex-1 bg-slate-200"></div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {[
              { 
                step: "01", 
                title: "リザルトを記録する", 
                desc: "左メニューの「リザルト記録」から曲を選び、PerfectやGreatの数を入力します。AP（All Perfect）やFC（Full Combo）達成時は、専用ボタンを1タップするだけで簡単に記録可能です！\n※誤って保存した場合は、5秒間表示される「UNDO」ボタンで即座に取り消せます。また、「RESET」ボタンで譜面ごとの記録を全消去も可能です。",
                icon: "📊"
              },
              { 
                step: "02", 
                title: "ランクマッチを分析する", 
                desc: "「ランクマレコーダー」では、自分と相手の判定を入力して勝敗とポイント増減を記録。勝率や対戦数、自分の現在の正確なランクポイントが自動計算されます。",
                icon: "⚔️"
              },
              { 
                step: "03", 
                title: "アカウントを連携する", 
                desc: "Googleアカウントでログインすると、記録したデータがクラウドに自動保存されます。一度同期すれば、スマホで入力した記録をPCで確認するなど、どの端末からでもアクセス可能です。",
                icon: "☁️"
              },
              { 
                step: "04", 
                title: "不具合報告・要望の送信", 
                desc: "アプリの動作がおかしい時は「不具合報告」から教えてください。また、「要望」カテゴリを選択することで、新機能のリクエストも随時受け付けています！",
                icon: "🐞"
              }
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex gap-6 items-start hover:shadow-md transition-all">
                <div className="flex flex-col items-center shrink-0">
                  <div className="text-3xl mb-1">{item.icon}</div>
                  <div className="text-xs font-black text-cyan-500 font-mono tracking-tighter">STEP {item.step}</div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800">{item.title}</h3>
                  <p className="text-sm text-slate-500 font-bold leading-relaxed whitespace-pre-wrap">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 注意事項セクション */}
        <section className="space-y-10 pt-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-0.5 flex-1 bg-slate-200"></div>
            <h2 className="text-2xl font-black text-slate-400 uppercase tracking-widest px-4">Important Notice</h2>
            <div className="h-0.5 flex-1 bg-slate-200"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-xl border border-white space-y-6">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">データの取り扱い</h2>
              <ul className="space-y-4 text-slate-600 font-bold text-sm leading-relaxed">
                <li className="flex gap-3"><span className="text-cyan-500">✔</span> ログインしていない状態の記録は、ブラウザを閉じると消えてしまう可能性があります。</li>
                <li className="flex gap-3"><span className="text-cyan-500">✔</span> メアド非表示設定時でも、管理上は識別用の番号（User No）を使用します。</li>
              </ul>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-xl border border-white space-y-6">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">免責事項</h2>
              <div className="text-[10px] text-slate-400 font-bold leading-relaxed space-y-2 italic">
                <p>● 本ツールはファンメイドの非公式ツールであり、株式会社セガ、株式会社Colorful Palette等とは一切関係ありません。</p>
                <p>● ツールの利用によって生じたいかなる損害についても、開発者は責任を負いません。自己責任でのご利用をお願いいたします。</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="text-center pt-10">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">© 2026 PJSK Recorder Project Team</p>
        </footer>

      </div>
    </div>
  );
}
