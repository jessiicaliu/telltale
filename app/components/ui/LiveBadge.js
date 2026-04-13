export function LiveBadge({ active, label }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
      active
        ? "bg-red-500/[0.1] text-red-400 border border-red-500/20"
        : "bg-white/[0.03] text-white/25 border border-white/[0.06]"
    }`}>
      <div
        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${active ? "bg-red-400 animate-pulse" : "bg-white/15"}`}
        style={active ? { boxShadow: '0 0 6px rgba(248,113,113,0.8)' } : {}}
      />
      {label}
    </div>
  )
}
