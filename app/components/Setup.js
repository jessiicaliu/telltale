"use client"

import { useState } from "react"

export default function Setup({ onStart }) {
  const [role, setRole] = useState("")
  const [company, setCompany] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleGenerate() {
    if (!role.trim() || !company.trim()) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, company })
      })
      const { questions, error } = await res.json()
      if (error) throw new Error(error)
      onStart({ role, company, questions })
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
        />
        <input
          value={company}
          onChange={e => setCompany(e.target.value)}
          placeholder="Company — e.g. Google"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-emerald-500/50 transition-colors text-sm"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
          onKeyDown={e => e.key === "Enter" && handleGenerate()}
        />
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