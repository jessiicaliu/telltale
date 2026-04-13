"use client"

import { useRef, useEffect, useState } from "react"
import { useMediaPipeDetection } from "../hooks/useMediaPipeDetection"
import { useAudioTranscription } from "../hooks/useAudioTranscription"
import { METRICS, StatCard } from "./ui/StatCard"
import { LiveBadge } from "./ui/LiveBadge"
import { ReportDisplay, Spinner } from "./ui/ReportDisplay"
import Question from "./Question"

function AnswerCard({ number, question, answer, stats, role, company }) {
  const [feedback, setFeedback] = useState("")
  const [loading, setLoading] = useState(false)

  async function getFeedback() {
    setLoading(true)
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, role, company })
    })
    const { feedback } = await res.json()
    setFeedback(feedback)
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
        <p className="text-white/50 text-sm leading-relaxed">{answer || "No answer recorded"}</p>
      </div>

      <div className="flex gap-4 text-xs text-white/30" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        <span>👀 {stats.lookingAway}s away</span>
        <span>🤚 {stats.faceTouches}s touching</span>
        <span>🗣️ {stats.fillers} fillers</span>
        <span>🪑 {stats.slouching}s slouching</span>
      </div>

      {!feedback && !loading && (
        <button onClick={getFeedback}
          className="text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors text-left cursor-pointer"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          → get feedback on this answer
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-white/20 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <Spinner /> evaluating...
        </div>
      )}

      {feedback && (
        <p className="text-sm text-white/50 leading-relaxed border-t border-white/5 pt-4">{feedback}</p>
      )}
    </div>
  )
}

export default function Camera({ interview }) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [sessionState, setSessionState] = useState("idle")
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [timer, setTimer] = useState(0)
  const [showDots, setShowDots] = useState(true)
  const [showSimulator, setShowSimulator] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const simulatorRef = useRef(null)
  const sessionStartRef = useRef(null)
  const showDotsRef = useRef(true)
  const questionStartStatsRef = useRef(null)

  const active = sessionState === "active"

  const { visualStats, liveSignals } = useMediaPipeDetection(active, videoRef, canvasRef, showDotsRef)
  const { fillerCount, transcriptRef } = useAudioTranscription(active)

  const stats = { ...visualStats, fillers: fillerCount }

  useEffect(() => {
    if (sessionState !== "active") return
    sessionStartRef.current = Date.now()
    questionStartStatsRef.current = { lookingAway: 0, faceTouches: 0, fillers: 0, slouching: 0 }
    const interval = setInterval(() => {
      setTimer(Math.floor((Date.now() - sessionStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionState])

  function toggleDots() {
    showDotsRef.current = !showDotsRef.current
    setShowDots(showDotsRef.current)
  }

  function handleNext() {
    // capture per-question stats as delta from question start
    const questionStats = {
      lookingAway: stats.lookingAway - (questionStartStatsRef.current?.lookingAway ?? 0),
      faceTouches: stats.faceTouches - (questionStartStatsRef.current?.faceTouches ?? 0),
      fillers: stats.fillers - (questionStartStatsRef.current?.fillers ?? 0),
      slouching: stats.slouching - (questionStartStatsRef.current?.slouching ?? 0),
    }

    const answer = transcriptRef.current.trim()
    transcriptRef.current = ""

    const newAnswers = [...answers, {
      question: interview.questions[currentQ],
      answer: answer || "No answer recorded",
      stats: questionStats
    }]
    setAnswers(newAnswers)

    // save current stats as baseline for next question
    questionStartStatsRef.current = { ...stats }

    if (currentQ < interview.questions.length - 1) {
      setCurrentQ(prev => prev + 1)
    } else {
      setSessionState("done")
    }
  }

  async function getReport() {
    setReportLoading(true)
    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000)
    const fullTranscript = answers.map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`).join("\n\n")
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats, duration, transcript: fullTranscript })
    })
    const { report } = await res.json()
    try {
      setReport(typeof report === "string" ? JSON.parse(report) : report)
    } catch {
      setReport({ raw: report })
    }
    setReportLoading(false)
  }

  function formatTime(s) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-8 py-12">

      {/* IDLE */}
      {sessionState === "idle" && (
        <div className="relative flex flex-col items-center gap-10 text-center max-w-lg">
          <div className="absolute inset-0 pointer-events-none -z-10"
            style={{ background: "radial-gradient(ellipse 70% 50% at 50% 70%, rgba(16,185,129,0.07) 0%, transparent 70%)", filter: "blur(20px)" }} />
          <div className="flex flex-col gap-4">
            <p className="text-white/25 text-xs tracking-[0.22em] uppercase font-medium">AI Interview Coach</p>
            <h1 className="text-5xl font-semibold tracking-tight leading-[1.1]">Practice like it's real.</h1>
            <p className="text-white/40 text-base leading-relaxed max-w-sm mx-auto">
              See your eye contact, posture, filler words, and nervous habits as they happen.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {METRICS.map(({ label, dot, glow }) => (
              <span key={label} className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-3.5 py-1.5 text-sm text-white/50">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} style={{ boxShadow: `0 0 5px ${glow}` }} />
                {label}
              </span>
            ))}
          </div>
          <button
            onClick={() => setSessionState("active")}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-base px-9 py-3 rounded-xl transition-colors cursor-pointer"
            style={{ boxShadow: "0 0 40px rgba(16,185,129,0.3)" }}
          >
            Start session
          </button>
        </div>
      )}

      {/* ACTIVE */}
      {sessionState === "active" && interview && (
        <div className="flex flex-col items-center gap-5 w-full max-w-3xl">
          <Question
            question={interview.questions[currentQ]}
            number={currentQ + 1}
            total={interview.questions.length}
          />

          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2 flex-wrap">
              <LiveBadge active={liveSignals.lookingAway} label="Looking away" />
              <LiveBadge active={liveSignals.touchingFace} label="Face touch" />
              <LiveBadge active={liveSignals.slouching} label="Slouching" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"
                style={{ boxShadow: "0 0 6px rgba(248,113,113,0.8)" }} />
              <span className="font-mono text-white/35 text-sm tabular-nums">{formatTime(timer)}</span>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]"
            style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.02), 0 24px 64px rgba(0,0,0,0.6)" }}>
            <video ref={videoRef} autoPlay playsInline className="w-[640px] h-[480px] object-cover block" />
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-[640px] h-[480px]" />
            <button onClick={toggleDots}
              className="absolute bottom-3 right-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
              Dots
              <div className={`relative w-7 h-4 rounded-full transition-colors duration-200 ${showDots ? "bg-emerald-500" : "bg-white/15"}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${showDots ? "left-[14px]" : "left-0.5"}`} />
              </div>
            </button>
          </div>

          <div className="flex gap-3 w-full items-stretch">
            {METRICS.map(({ key, label, unit, color, dot, glow }) => (
              <StatCard key={key} label={label} value={stats[key]} unit={unit} color={color} dot={dot} glow={glow} />
            ))}
            <button onClick={handleNext}
              className="flex-shrink-0 px-6 rounded-2xl text-sm font-medium text-white/30 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all whitespace-nowrap cursor-pointer">
              {currentQ < interview.questions.length - 1 ? "Next →" : "Finish"}
            </button>
          </div>
        </div>
      )}

      {/* DONE */}
      {sessionState === "done" && (
        <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-4xl font-semibold tracking-tight">Interview complete</h2>
            <p className="text-white/30 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {interview.role} @ {interview.company} · {formatTime(timer)}
            </p>
          </div>

          <div className="flex flex-col gap-4 w-full">
            {answers.map((a, i) => (
              <AnswerCard
                key={i}
                number={i + 1}
                question={a.question}
                answer={a.answer}
                stats={a.stats}
                role={interview.role}
                company={interview.company}
              />
            ))}
          </div>

          {!report && !reportLoading && (
            <button onClick={getReport}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-base px-8 py-3 rounded-xl transition-colors w-full cursor-pointer"
              style={{ boxShadow: "0 0 40px rgba(16,185,129,0.2)" }}>
              Get overall coaching report
            </button>
          )}

          {reportLoading && (
            <div className="flex items-center gap-3 text-white/30 text-sm py-2">
              <Spinner /> Analyzing your session...
            </div>
          )}

          {report && <ReportDisplay report={report} />}

          <button onClick={() => window.location.reload()}
            className="text-white/20 hover:text-white/45 transition-colors text-sm cursor-pointer">
            New session
          </button>
        </div>
      )}
    </div>
  )
}