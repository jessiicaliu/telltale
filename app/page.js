"use client"

import { useState } from "react"
import InterviewSession from "./components/InterviewSession"
import Setup from "./components/Setup"

export default function Home() {
  const [interview, setInterview] = useState(null)

  return (
    <main className="min-h-screen bg-[#080810] text-white">
      <nav className="border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white font-semibold tracking-tight text-lg">Telltale</span>
        </div>
        <span className="text-white/30 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {interview ? `${interview.role} @ ${interview.company}` : "AI Interview Coach"}
        </span>
      </nav>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-8 py-16">
        {!interview
          ? <Setup onStart={setInterview} />
          : <InterviewSession interview={interview} />
        }
      </div>
    </main>
  )
}
