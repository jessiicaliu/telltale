function scoreColor(s) {
  if (s >= 80) return { text: "text-emerald-400", bar: "bg-emerald-500" }
  if (s >= 60) return { text: "text-amber-400", bar: "bg-amber-500" }
  return { text: "text-red-400", bar: "bg-red-500" }
}

const BREAKDOWN_LABELS = {
  eyeContact: "Eye contact",
  posture: "Posture",
  speech: "Speech",
  composure: "Composure",
}

export function Spinner() {
  return <div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
}

export function ReportDisplay({ report }) {
  if (report.raw) {
    return <p className="text-white/55 text-sm leading-relaxed whitespace-pre-wrap">{report.raw}</p>
  }

  const { score, headline, breakdown, strengths, improvements, drill, contentNote } = report
  const { text: scoreText } = scoreColor(score)

  return (
    <div className="flex flex-col gap-3 w-full">

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex items-center gap-5">
        <span className={`text-5xl font-semibold tabular-nums leading-none ${scoreText}`}>{score}</span>
        <div className="flex flex-col gap-1">
          <span className="text-white/25 text-[10px] uppercase tracking-[0.15em] font-medium">Overall score</span>
          <span className="text-white/65 text-sm leading-snug">{headline}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Object.entries(breakdown).map(([key, { score: s, note }]) => {
          const { text, bar } = scoreColor(s)
          return (
            <div key={key} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-white/30 text-[10px] uppercase tracking-[0.13em] font-medium">{BREAKDOWN_LABELS[key]}</span>
                <span className={`text-sm font-semibold tabular-nums ${text}`}>{s}</span>
              </div>
              <div className="h-[3px] bg-white/[0.07] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${bar} opacity-60`} style={{ width: `${s}%` }} />
              </div>
              <p className="text-white/40 text-xs leading-relaxed">{note}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-500/[0.05] border border-emerald-500/[0.1] rounded-xl p-4 flex flex-col gap-2">
          <span className="text-emerald-400/60 text-[10px] uppercase tracking-[0.15em] font-medium">What went well</span>
          {strengths.map((s, i) => (
            <div key={i} className="flex gap-2 text-xs text-white/55 leading-relaxed">
              <span className="text-emerald-400/50 shrink-0">+</span>{s}
            </div>
          ))}
        </div>
        <div className="bg-amber-500/[0.04] border border-amber-500/[0.09] rounded-xl p-4 flex flex-col gap-2">
          <span className="text-amber-400/60 text-[10px] uppercase tracking-[0.15em] font-medium">To work on</span>
          {improvements.map((s, i) => (
            <div key={i} className="flex gap-2 text-xs text-white/55 leading-relaxed">
              <span className="text-amber-400/50 shrink-0">→</span>{s}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1.5">
        <span className="text-white/25 text-[10px] uppercase tracking-[0.15em] font-medium">Practice drill</span>
        <p className="text-white/55 text-sm leading-relaxed">{drill}</p>
      </div>

      {contentNote && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1.5">
          <span className="text-white/25 text-[10px] uppercase tracking-[0.15em] font-medium">What you said</span>
          <p className="text-white/50 text-sm leading-relaxed">{contentNote}</p>
        </div>
      )}
    </div>
  )
}
