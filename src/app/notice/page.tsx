export default function NoticePage() {
  return (
    <div className="flex flex-col h-full p-8 absolute inset-0 overflow-y-auto w-full mx-auto">
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-10 shadow-xl border border-white flex-1 mb-8">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter border-b-4 border-rose-400 pb-4 inline-block mb-8">注意事項</h2>
        
        <div className="space-y-6 text-slate-700 leading-relaxed font-bold">
          <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex gap-4">
            <div className="text-3xl">⚠️</div>
            <div>
              <h3 className="text-lg font-black text-rose-600 mb-2">データの保存について</h3>
              <p className="text-rose-800">
                本ツールの記録データ（リザルトやランクマッチの戦績など）は、お使いのブラウザの「LocalStorage」に保存されています。<br/>
                そのため、<strong>ブラウザのキャッシュクリアやサイトデータの削除を行うと、これまでの記録データが全て消去されてしまいます</strong>のでご注意ください。
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-2">免責事項</h3>
            <p className="text-slate-600">
              本ツールを利用して発生したいかなる損害・データの消失等についても、開発者は責任を負いかねます。<br/>
              ブラウザを変更したり、スマートフォン等別の端末からアクセスした場合は、別のデータとして扱われます。
            </p>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-2">CSVデータ連携について</h3>
            <p className="text-slate-600">
              楽曲リストやアップデートログのデータは、GoogleスプレッドシートのWeb公開機能を用いて取得しています。データの反映には少し時間がかかる場合があります。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
