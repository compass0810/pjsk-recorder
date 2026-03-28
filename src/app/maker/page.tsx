export default function MakerInfoPage() {
  return (
    <div className="flex flex-col h-full p-8 absolute inset-0 items-center justify-center">
      <div className="bg-white/60 backdrop-blur-md rounded-3xl p-16 shadow-xl border border-white text-center">
        <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-4">譜面メーカー情報</h2>
        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse">
          Coming Soon...
        </div>
        <p className="mt-6 text-slate-500 font-bold">
          この機能は今後のアップデートで追加される予定です。
        </p>
      </div>
    </div>
  );
}
