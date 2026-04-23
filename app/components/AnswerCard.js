"use client"

import { useState } from "react"
import { Spinner } from "./ui/ReportDisplay"

function StarBadge({ label, hit }) {
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
      hit
        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
        : "bg-white/[0.03] border-white/[0.07] text-white/20"
    }`}>
      <span className={hit ? "text-emerald-400" : "text-white/15"}>{hit ? "✓" : "✗"}</span>
      {label}
    </span>
  )
}

export default function AnswerCard({ number, question, answer, stats, micError, role, company, type, followUp, followUpAnswer }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function getFeedback() {
    setLoading(true)
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, role, company, type })
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="w-full rounded-2xl p-6 flex flex-col gap-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-white/25 uppercase tracking-widest"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}>Q{number}</span>
        <p className="text-white font-medium">{question}</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-white/25 uppercase tracking-widest"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}>Your answer</span>
        <p className="text-white/50 text-sm leading-relaxed">
          {answer || (micError ? "No answer recorded — microphone was not accessible" : "No answer recorded")}
        </p>
      </div>

      {followUp && (
        <div className="flex flex-col gap-1.5 rounded-xl p-3"
          style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}>
          <span className="text-xs text-amber-400/50 uppercase tracking-widest"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}>→ follow-up asked</span>
          <p className="text-white/60 text-sm font-medium">{followUp}</p>
          <p className="text-white/35 text-sm leading-relaxed">{followUpAnswer}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/30"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        <span>👀 {stats.lookingAway}s away</span>
        <span>🤚 {stats.faceTouches}s touching</span>
        <span>🪑 {stats.slouching}s slouching</span>
        {stats.fillerBreakdown && Object.keys(stats.fillerBreakdown).length > 0 ? (
          <span className="flex gap-2 flex-wrap">
            {Object.entries(stats.fillerBreakdown).map(([word, count]) => (
              <span key={word}>
                <span className="text-amber-400/60">{word}</span>
                <span className="text-white/20"> ×{count}</span>
              </span>
            ))}
          </span>
        ) : (
          <span>🗣️ no fillers</span>
        )}
      </div>

      {!result && !loading && (
        <button onClick={getFeedback}
          className="text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors text-left cursor-pointer"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          → get feedback on this answer
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-white/20 text-xs"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <Spinner /> evaluating...
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
          {result.star && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-white/20 uppercase tracking-widest"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}>STAR structure</span>
              <div className="flex gap-2 flex-wrap">
                <StarBadge label="Situation" hit={result.star.situation} />
                <StarBadge label="Task"      hit={result.star.task} />
                <StarBadge label="Action"    hit={result.star.action} />
                <StarBadge label="Result"    hit={result.star.result} />
              </div>
            </div>
          )}
          <p className="text-sm text-white/50 leading-relaxed">{result.feedback}</p>
        </div>
      )}
    </div>
  )
}
