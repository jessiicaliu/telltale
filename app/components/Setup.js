"use client"

import { useState } from "react"

const INTERVIEW_TYPES = [
  { id: "behavioral", label: "Behavioral" },
  { id: "technical", label: "Technical" },
  { id: "system-design", label: "System Design" },
  { id: "case", label: "Case" },
]

export default function Setup({ onStart, onLoading }) {
  const [role, setRole] = useState("")
  const [company, setCompany] = useState("")
  const [jd, setJd] = useState("")
  const [type, setType] = useState("behavioral")
  const [count, setCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleGenerate() {
    if (!role.trim() || !company.trim()) return
    setLoading(true)
    setError("")
    onLoading?.()
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, company, type, count, jd: jd.trim() || null })
      })
      const { questions, error } = await res.json()
      if (error) throw new Error(error)
      onStart({ role, company, type, questions })
    } catch (e) {
      setError("Something went wrong. Try again.")
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center gap-10 text-center max-w-xl w-full">
      <div className="flex flex-col gap-4">
        <div className="text-xs uppercase tracking-[0.3em] text-white/20" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          AI Interview Coach
        </div>
        <h1 className="text-6xl font-extrabold tracking-tight leading-none">
          Practice like<br />
          <span style={{ WebkitTextStroke: "1px rgba(255,255,255,0.3)", color: "transparent" }}>
            it's real.
          </span>
        </h1>
        <p className="text-white/35 text-base leading-relaxed max-w-sm mx-auto">
          Get tailored interview questions, answer on camera, and receive feedback on both your answers and body language.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <input
          value={role}
          onChange={e => setRole(e.target.value)}
          placeholder="Role — e.g. Software Engineer"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-emerald-500/50 transition-colors text-sm"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
          onKeyDown={e => e.key === "Enter" && handleGenerate()}
        />
        <input
          value={company}
          onChange={e => setCompany(e.target.value)}
          placeholder="Company — e.g. Google"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-emerald-500/50 transition-colors text-sm"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
          onKeyDown={e => e.key === "Enter" && handleGenerate()}
        />
        <textarea
          value={jd}
          onChange={e => setJd(e.target.value)}
          placeholder="Paste job description (optional)"
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-emerald-500/50 transition-colors text-sm resize-none"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        />
        <div className="grid grid-cols-4 gap-2">
          {INTERVIEW_TYPES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setType(id)}
              className={`py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                type === id
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                  : "bg-white/[0.03] border-white/[0.08] text-white/30 hover:text-white/50 hover:border-white/15"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/25 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Questions</span>
          <div className="flex gap-2 flex-1">
            {[3, 5, 7].map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                  count === n
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : "bg-white/[0.03] border-white/[0.08] text-white/30 hover:text-white/50 hover:border-white/15"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-400 text-xs text-left" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{error}</p>}
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !role.trim() || !company.trim()}
        className="relative group w-full disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <div className="absolute inset-0 rounded-xl bg-emerald-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
        <div className="relative bg-emerald-400 hover:bg-emerald-300 transition-colors text-black font-bold text-base px-12 py-4 rounded-xl w-full tracking-wide">
          {loading ? "Generating questions..." : "Generate Interview"}
        </div>
      </button>
    </div>
  )
}