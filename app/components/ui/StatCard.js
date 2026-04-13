export const METRICS = [
  { key: "lookingAway", label: "Looked away",  unit: "s",  color: "text-red-400",    dot: "bg-red-400",    glow: "rgba(248,113,113,0.5)"  },
  { key: "faceTouches", label: "Face touches", unit: "s",  color: "text-amber-400",  dot: "bg-amber-400",  glow: "rgba(251,191,36,0.5)"   },
  { key: "fillers",     label: "Filler words", unit: "",   color: "text-violet-400", dot: "bg-violet-400", glow: "rgba(167,139,250,0.5)"  },
  { key: "slouching",   label: "Slouching",    unit: "s",  color: "text-sky-400",    dot: "bg-sky-400",    glow: "rgba(56,189,248,0.5)"   },
]

export function StatCard({ label, value, unit, color, dot, glow }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-[110px]">
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} style={{ boxShadow: `0 0 5px ${glow}` }} />
        <span className="text-white/30 text-[10px] uppercase tracking-[0.16em] font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-semibold tabular-nums leading-none ${color}`}>{value}</span>
        {unit && <span className="text-white/20 text-xs">{unit}</span>}
      </div>
    </div>
  )
}
