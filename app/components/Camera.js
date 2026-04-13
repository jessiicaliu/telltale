"use client"

import { useRef, useEffect, useState } from "react"
import { useMediaPipeDetection } from "../hooks/useMediaPipeDetection"
import { useAudioTranscription } from "../hooks/useAudioTranscription"
import { METRICS, StatCard } from "./ui/StatCard"
import { LiveBadge } from "./ui/LiveBadge"
import { ReportDisplay, Spinner } from "./ui/ReportDisplay"
import Question from "./Question"

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

function AnswerCard({ number, question, answer, stats, role, company, type, followUp, followUpAnswer }) {
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
        <p className="text-white/50 text-sm leading-relaxed">{answer || "No answer recorded"}</p>
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

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/30" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
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
        <div className="flex items-center gap-2 text-white/20 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <Spinner /> evaluating...
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
          {result.star && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-white/20 uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace' }}>STAR structure</span>
              <div className="flex gap-2 flex-wrap">
                <StarBadge label="Situation" hit={result.star.situation} />
                <StarBadge label="Task" hit={result.star.task} />
                <StarBadge label="Action" hit={result.star.action} />
                <StarBadge label="Result" hit={result.star.result} />
              </div>
            </div>
          )}
          <p className="text-sm text-white/50 leading-relaxed">{result.feedback}</p>
        </div>
      )}
    </div>
  )
}

export default function Camera({ interview }) {
  const QUESTION_TIME = 120

  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [sessionState, setSessionState] = useState("idle")
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [timer, setTimer] = useState(0)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [showDots, setShowDots] = useState(true)
  const [showSimulator, setShowSimulator] = useState(true)
  const [followUpState, setFollowUpState] = useState(null) // null | { question: string|null, loading: boolean }
  const [followUpTimeLeft, setFollowUpTimeLeft] = useState(60)

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

  useEffect(() => {
    if (sessionState !== "active") return
    setTimeLeft(QUESTION_TIME)
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionState, currentQ])

  useEffect(() => {
    if (!followUpState?.question) return
    setFollowUpTimeLeft(60)
    const interval = setInterval(() => {
      setFollowUpTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [followUpState?.question])

  function toggleDots() {
    showDotsRef.current = !showDotsRef.current
    setShowDots(showDotsRef.current)
  }

  function handleNext() {
    const questionStats = {
      lookingAway: stats.lookingAway - (questionStartStatsRef.current?.lookingAway ?? 0),
      faceTouches: stats.faceTouches - (questionStartStatsRef.current?.faceTouches ?? 0),
      fillers: stats.fillers - (questionStartStatsRef.current?.fillers ?? 0),
      slouching: stats.slouching - (questionStartStatsRef.current?.slouching ?? 0),
    }

    const answer = transcriptRef.current.trim()

    const fillerWords = ["um", "uh", "like", "you know", "basically", "literally", "actually", "so"]
    const fillerBreakdown = {}
    for (const word of fillerWords) {
      const matches = answer.toLowerCase().match(new RegExp(`\\b${word}\\b`, "g"))
      if (matches) fillerBreakdown[word] = matches.length
    }

    transcriptRef.current = ""

    const savedQuestion = interview.questions[currentQ]
    setAnswers(prev => [...prev, {
      question: savedQuestion,
      answer: answer || "No answer recorded",
      stats: { ...questionStats, fillerBreakdown },
      followUp: null,
      followUpAnswer: null
    }])

    questionStartStatsRef.current = { ...stats }

    if (currentQ < interview.questions.length - 1) {
      setFollowUpState({ question: null, loading: true })
      fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: savedQuestion, answer: answer || "No answer recorded", role: interview.role, company: interview.company, type: interview.type })
      }).then(r => r.json()).then(data => {
        setFollowUpState({ question: data.followUp, loading: false })
      }).catch(() => {
        setFollowUpState(null)
        setCurrentQ(prev => prev + 1)
      })
    } else {
      setSessionState("done")
    }
  }

  function handleFollowUpDone() {
    const followUpAnswer = transcriptRef.current.trim()
    transcriptRef.current = ""
    setAnswers(prev => {
      const updated = [...prev]
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        followUp: followUpState.question,
        followUpAnswer: followUpAnswer || "No answer recorded"
      }
      return updated
    })
    setFollowUpState(null)
    setCurrentQ(prev => prev + 1)
  }

  function handleFollowUpSkip() {
    transcriptRef.current = ""
    setFollowUpState(null)
    setCurrentQ(prev => prev + 1)
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
        <div className={`flex flex-col items-center gap-5 w-full ${showSimulator ? "max-w-5xl" : "max-w-3xl"}`}>
          {followUpState ? (
            <div className="w-full rounded-2xl p-6 flex flex-col gap-2"
              style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <span className="text-xs text-amber-400/50 uppercase tracking-widest"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}>→ follow-up</span>
              {followUpState.loading
                ? <div className="flex items-center gap-2 text-white/25 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    <Spinner /> thinking of a follow-up...
                  </div>
                : <p className="text-white text-lg font-medium leading-snug">{followUpState.question}</p>
              }
            </div>
          ) : (
            <Question
              question={interview.questions[currentQ]}
              number={currentQ + 1}
              total={interview.questions.length}
            />
          )}

          {/* Countdown bar */}
          {followUpState?.question ? (() => {
            const pct = (followUpTimeLeft / 60) * 100
            const barColor = followUpTimeLeft > 30 ? "bg-amber-400" : followUpTimeLeft > 15 ? "bg-amber-500" : "bg-red-500"
            const textColor = followUpTimeLeft > 30 ? "text-amber-400/60" : followUpTimeLeft > 15 ? "text-amber-500/70" : "text-red-400"
            const pulse = followUpTimeLeft <= 15 && followUpTimeLeft > 0 ? "animate-pulse" : ""
            return (
              <div className="w-full flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/20" style={{ fontFamily: 'JetBrains Mono, monospace' }}>follow-up time</span>
                  <span className={`text-xs font-mono tabular-nums ${textColor} ${pulse}`}>
                    {followUpTimeLeft === 0 ? "time's up" : formatTime(followUpTimeLeft)}
                  </span>
                </div>
                <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })() : !followUpState && (() => {
            const pct = (timeLeft / QUESTION_TIME) * 100
            const barColor = timeLeft > 60 ? "bg-emerald-500" : timeLeft > 30 ? "bg-amber-400" : "bg-red-500"
            const textColor = timeLeft > 60 ? "text-white/30" : timeLeft > 30 ? "text-amber-400/70" : "text-red-400"
            const pulse = timeLeft <= 30 && timeLeft > 0 ? "animate-pulse" : ""
            return (
              <div className="w-full flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/20" style={{ fontFamily: 'JetBrains Mono, monospace' }}>answer time</span>
                  <span className={`text-xs font-mono tabular-nums ${textColor} ${pulse}`}>
                    {timeLeft === 0 ? "time's up" : formatTime(timeLeft)}
                  </span>
                </div>
                <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })()}

          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2 flex-wrap">
              <LiveBadge active={liveSignals.lookingAway} label="Looking away" />
              <LiveBadge active={liveSignals.touchingFace} label="Face touch" />
              <LiveBadge active={liveSignals.slouching} label="Slouching" />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSimulator(v => !v)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
              >
                Interviewer
                <div className={`relative w-7 h-4 rounded-full transition-colors duration-200 ${showSimulator ? "bg-emerald-500" : "bg-white/15"}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${showSimulator ? "left-[14px]" : "left-0.5"}`} />
                </div>
              </button>
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"
                style={{ boxShadow: "0 0 6px rgba(248,113,113,0.8)" }} />
              <span className="font-mono text-white/35 text-sm tabular-nums">{formatTime(timer)}</span>
            </div>
          </div>

          <div className={`flex gap-4 w-full ${showSimulator ? "flex-row" : "flex-col items-center"}`}>
            {showSimulator && (
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] flex-1"
                style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.02), 0 24px 64px rgba(0,0,0,0.6)" }}>
                <video
                  ref={simulatorRef}
                  src="/interview-simulator.mp4"
                  autoPlay loop playsInline
                  className="w-full h-[360px] object-cover block"
                />
                <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-xs text-white/30"
                  style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  Interviewer
                </div>
              </div>
            )}

            <div className={`relative rounded-2xl overflow-hidden border border-white/[0.08] ${showSimulator ? "flex-1" : ""}`}
              style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.02), 0 24px 64px rgba(0,0,0,0.6)" }}>
              <video ref={videoRef} autoPlay playsInline
                className={`object-cover block ${showSimulator ? "w-full h-[360px]" : "w-[640px] h-[480px]"}`} />
              <canvas ref={canvasRef}
                className={`absolute top-0 left-0 ${showSimulator ? "w-full h-[360px]" : "w-[640px] h-[480px]"}`} />
              <button onClick={toggleDots}
                className="absolute bottom-3 right-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                Dots
                <div className={`relative w-7 h-4 rounded-full transition-colors duration-200 ${showDots ? "bg-emerald-500" : "bg-white/15"}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${showDots ? "left-[14px]" : "left-0.5"}`} />
                </div>
              </button>
            </div>
          </div>

          <div className="flex gap-3 w-full items-stretch">
            {METRICS.map(({ key, label, unit, color, dot, glow }) => (
              <StatCard key={key} label={label} value={stats[key]} unit={unit} color={color} dot={dot} glow={glow} />
            ))}
            {followUpState ? (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={handleFollowUpDone}
                  disabled={followUpState.loading || !followUpState.question}
                  className="px-6 rounded-2xl text-sm font-medium text-white/30 hover:text-amber-400 border border-white/5 hover:border-amber-500/20 hover:bg-amber-500/5 transition-all whitespace-nowrap cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                  Done →
                </button>
                <button onClick={handleFollowUpSkip}
                  disabled={followUpState.loading}
                  className="px-4 rounded-2xl text-sm font-medium text-white/15 hover:text-white/30 border border-white/5 transition-all whitespace-nowrap cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                  Skip
                </button>
              </div>
            ) : (
              <button onClick={handleNext}
                className="flex-shrink-0 px-6 rounded-2xl text-sm font-medium text-white/30 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all whitespace-nowrap cursor-pointer">
                {currentQ < interview.questions.length - 1 ? "Next →" : "Finish"}
              </button>
            )}
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
                type={interview.type}
                followUp={a.followUp}
                followUpAnswer={a.followUpAnswer}
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