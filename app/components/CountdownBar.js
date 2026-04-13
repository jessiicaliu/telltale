// variant="main"    — green → amber → red, pulses at ≤30s
// variant="followup" — starts amber → red, pulses at ≤15s
export default function CountdownBar({ timeLeft, totalTime, label, variant = "main" }) {
  const pct = (timeLeft / totalTime) * 100

  const isFollowUp = variant === "followup"
  const barColor = isFollowUp
    ? timeLeft > 30 ? "bg-amber-400" : timeLeft > 15 ? "bg-amber-500" : "bg-red-500"
    : timeLeft > 60 ? "bg-emerald-500" : timeLeft > 30 ? "bg-amber-400" : "bg-red-500"
  const textColor = isFollowUp
    ? timeLeft > 30 ? "text-amber-400/60" : timeLeft > 15 ? "text-amber-500/70" : "text-red-400"
    : timeLeft > 60 ? "text-white/30"    : timeLeft > 30 ? "text-amber-400/70"  : "text-red-400"
  const pulseAt = isFollowUp ? 15 : 30
  const pulse = timeLeft <= pulseAt && timeLeft > 0 ? "animate-pulse" : ""

  const display = timeLeft === 0
    ? "time's up"
    : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/20" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {label}
        </span>
        <span className={`text-xs font-mono tabular-nums ${textColor} ${pulse}`}>{display}</span>
      </div>
      <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
