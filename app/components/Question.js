export default function Question({ question, number, total }) {
  return (
    <div className="w-full rounded-2xl p-6 flex flex-col gap-2"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <span className="text-xs text-white/25 uppercase tracking-widest"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        Question {number} of {total}
      </span>
      <p className="text-white text-lg font-medium leading-snug">{question}</p>
    </div>
  )
}