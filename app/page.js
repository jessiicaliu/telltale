"use client"

import Camera from "./components/Camera"

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: '#06060a' }}>
      <nav className="border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full bg-emerald-400"
            style={{ boxShadow: '0 0 8px rgba(52, 211, 153, 0.7)' }}
          />
          <span className="text-white font-semibold tracking-tight">telltale</span>
        </div>
        <span className="text-white/20 text-xs tracking-[0.18em] uppercase font-medium">Interview Coach</span>
      </nav>
      <Camera />
    </main>
  )
}
