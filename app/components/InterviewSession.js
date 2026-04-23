"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useMediaPipeDetection } from "../hooks/useMediaPipeDetection"
import { useAudioTranscription } from "../hooks/useAudioTranscription"
import { METRICS, StatCard } from "./ui/StatCard"
import { LiveBadge } from "./ui/LiveBadge"
import { ReportDisplay, Spinner } from "./ui/ReportDisplay"
import Question from "./Question"
import AnswerCard from "./AnswerCard"
import CountdownBar from "./CountdownBar"
import Camera from "./Camera"

const QUESTION_TIME = 120
const FOLLOWUP_TIME = 60
const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "literally", "actually", "so"]

function computeFillerBreakdown(text) {
  const breakdown = {}
  for (const word of FILLER_WORDS) {
    const matches = text.toLowerCase().match(new RegExp(`\\b${word}\\b`, "g"))
    if (matches) breakdown[word] = matches.length
  }
  return breakdown
}

export default function InterviewSession({ interview, onReset }) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [sessionState, setSessionState] = useState("idle")
  const [reportData, setReportData] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [timer, setTimer] = useState(0)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [followUpTimeLeft, setFollowUpTimeLeft] = useState(FOLLOWUP_TIME)
  const [showDots, setShowDots] = useState(true)
  const [showSimulator, setShowSimulator] = useState(true)
  const [followUpState, setFollowUpState] = useState(null) // null | { question: string|null, loading: boolean }

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const simulatorRef = useRef(null)
  const sessionStartRef = useRef(null)
  const showDotsRef = useRef(true)
  const questionStartStatsRef = useRef(null)
  const statsRef = useRef({ lookingAway: 0, faceTouches: 0, slouching: 0, fillers: 0 })
  const sessionBaselineStatsRef = useRef(null)
  const questionTimerRef = useRef(null)
  const followUpTimerRef = useRef(null)

  const active = sessionState === "active"
  const { visualStats, liveSignals } = useMediaPipeDetection(active, videoRef, canvasRef, showDotsRef)
  const { fillerCount, transcriptRef, micError } = useAudioTranscription(active)
  const stats = { ...visualStats, fillers: fillerCount }

  // Keep a ref in sync so handlers always read the latest stats without stale closure issues
  useEffect(() => { statsRef.current = stats })

  function toggleDots() {
    showDotsRef.current = !showDotsRef.current
    setShowDots(showDotsRef.current)
  }

  const handleNext = useCallback(() => {
    const current = statsRef.current
    const baseline = questionStartStatsRef.current ?? { lookingAway: 0, faceTouches: 0, fillers: 0, slouching: 0 }
    const delta = {
      lookingAway: current.lookingAway - baseline.lookingAway,
      faceTouches: current.faceTouches - baseline.faceTouches,
      fillers:     current.fillers     - baseline.fillers,
      slouching:   current.slouching   - baseline.slouching,
    }
    const answer = transcriptRef.current.trim()
    transcriptRef.current = ""
    const savedQuestion = interview.questions[currentQ]

    setAnswers(prev => [...prev, {
      question: savedQuestion,
      answer: answer || "No answer recorded",
      stats: { ...delta, fillerBreakdown: computeFillerBreakdown(answer) },
      followUp: null,
      followUpAnswer: null,
    }])
    questionStartStatsRef.current = { ...current }

    if (currentQ >= interview.questions.length - 1) {
      setSessionState("done")
      return
    }

    setFollowUpState({ question: null, loading: true })
    fetch("/api/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: savedQuestion, answer: answer || "No answer recorded", role: interview.role, company: interview.company, type: interview.type }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.followUp) {
          setFollowUpState({ question: data.followUp, loading: false })
        } else {
          setFollowUpState(null)
          setCurrentQ(prev => prev + 1)
        }
      })
      .catch(() => {
        setFollowUpState(null)
        setCurrentQ(prev => prev + 1)
      })
  }, [currentQ, interview, transcriptRef, questionStartStatsRef])

  function handleFollowUpDone() {
    const followUpAnswer = transcriptRef.current.trim()
    transcriptRef.current = ""
    setAnswers(prev => {
      const updated = [...prev]
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        followUp: followUpState.question,
        followUpAnswer: followUpAnswer || "No answer recorded",
      }
      return updated
    })
    setFollowUpState(null)
    setCurrentQ(prev => prev + 1)
  }

  const handleFollowUpSkip = useCallback(() => {
    transcriptRef.current = ""
    setFollowUpState(null)
    setCurrentQ(prev => prev + 1)
  }, [transcriptRef])

  // Session elapsed timer — resets once on active
  useEffect(() => {
    if (sessionState !== "active") return
    sessionStartRef.current = Date.now()
    sessionBaselineStatsRef.current = { ...statsRef.current }
    questionStartStatsRef.current = { lookingAway: 0, faceTouches: 0, fillers: 0, slouching: 0 }
    const id = setInterval(() => setTimer(Math.floor((Date.now() - sessionStartRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [sessionState])

  // Per-question countdown — auto-advances when time runs out
  useEffect(() => {
    if (sessionState !== "active") return
    questionTimerRef.current = Date.now()
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionTimerRef.current) / 1000)
      const remaining = QUESTION_TIME - elapsed
      if (remaining <= 0) {
        clearInterval(id)
        setTimeLeft(0)
        handleNext()
      } else {
        setTimeLeft(remaining)
      }
    }, 500)
    return () => clearInterval(id)
  }, [sessionState, currentQ, handleNext])

  // Follow-up countdown — auto-advances when time runs out
  useEffect(() => {
    if (!followUpState?.question) return
    followUpTimerRef.current = Date.now()
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - followUpTimerRef.current) / 1000)
      const remaining = FOLLOWUP_TIME - elapsed
      if (remaining <= 0) {
        clearInterval(id)
        setFollowUpTimeLeft(0)
        handleFollowUpSkip()
      } else {
        setFollowUpTimeLeft(remaining)
      }
    }, 500)
    return () => clearInterval(id)
  }, [followUpState, handleFollowUpSkip])

  async function getReport() {
    setReportLoading(true)
    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000)
    const fullTranscript = answers.map((a, i) => {
      let entry = `Q${i + 1}: ${a.question}\nA: ${a.answer}`
      if (a.followUp) entry += `\nFollow-up: ${a.followUp}\nA: ${a.followUpAnswer}`
      return entry
    }).join("\n\n")
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats: {
        lookingAway: statsRef.current.lookingAway - (sessionBaselineStatsRef.current?.lookingAway ?? 0),
        faceTouches: statsRef.current.faceTouches - (sessionBaselineStatsRef.current?.faceTouches ?? 0),
        slouching:   statsRef.current.slouching   - (sessionBaselineStatsRef.current?.slouching   ?? 0),
        fillers:     statsRef.current.fillers     - (sessionBaselineStatsRef.current?.fillers     ?? 0),
      }, duration, transcript: fullTranscript }),
    })
    const json = await res.json()
    try {
      setReportData(typeof json.report === "string" ? JSON.parse(json.report) : json.report)
    } catch {
      setReportData({ raw: json.report })
    }
    setReportLoading(false)
  }

  function formatTime(s) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col items-center justify-center px-8 py-12">

      {/* ── IDLE ── */}
      {sessionState === "idle" && (
        <div className="relative flex flex-col items-center gap-10 text-center max-w-lg">
          <div className="absolute inset-0 pointer-events-none -z-10"
            style={{ background: "radial-gradient(ellipse 70% 50% at 50% 70%, rgba(16,185,129,0.07) 0%, transparent 70%)", filter: "blur(20px)" }} />
          <div className="flex flex-col gap-4">
            <p className="text-white/25 text-xs tracking-[0.22em] uppercase font-medium">AI Interview Coach</p>
            <h1 className="text-5xl font-semibold tracking-tight leading-[1.1]">{"Practice like it's real."}</h1>
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

      {/* ── ACTIVE ── */}
      {sessionState === "active" && interview && (
        <div className={`flex flex-col items-center gap-5 w-full ${showSimulator ? "max-w-5xl" : "max-w-3xl"}`}>

          {/* Question or follow-up prompt */}
          {followUpState ? (
            <div className="w-full rounded-2xl p-6 flex flex-col gap-2"
              style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <span className="text-xs text-amber-400/50 uppercase tracking-widest"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}>→ follow-up</span>
              {followUpState.loading
                ? <div className="flex items-center gap-2 text-white/25 text-sm"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    <Spinner /> thinking of a follow-up...
                  </div>
                : <p className="text-white text-lg font-medium leading-snug">{followUpState.question}</p>
              }
            </div>
          ) : (
            <Question question={interview.questions[currentQ]} number={currentQ + 1} total={interview.questions.length} />
          )}

          {micError && (
            <div className="w-full rounded-xl px-4 py-2.5 text-xs text-amber-400/80 flex items-center gap-2"
              style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)", fontFamily: 'JetBrains Mono, monospace' }}>
              ⚠ Microphone access denied — answers won&apos;t be transcribed
            </div>
          )}

          {/* Timer bar */}
          {followUpState?.question
            ? <CountdownBar timeLeft={followUpTimeLeft} totalTime={FOLLOWUP_TIME} label="follow-up time" variant="followup" />
            : !followUpState && <CountdownBar timeLeft={timeLeft} totalTime={QUESTION_TIME} label="answer time" />
          }

          {/* Live badges + session controls */}
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2 flex-wrap">
              <LiveBadge active={liveSignals.lookingAway}  label="Looking away" />
              <LiveBadge active={liveSignals.touchingFace} label="Face touch" />
              <LiveBadge active={liveSignals.slouching}    label="Slouching" />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSimulator(v => !v)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
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

          {/* Camera feeds */}
          <Camera
            videoRef={videoRef}
            canvasRef={canvasRef}
            simulatorRef={simulatorRef}
            showSimulator={showSimulator}
            showDots={showDots}
            onToggleDots={toggleDots}
          />

          {/* Stat cards + action button */}
          <div className="flex gap-3 w-full items-stretch">
            {METRICS.map(({ key, label, unit, color, dot, glow }) => (
              <StatCard key={key} label={label} value={stats[key]} unit={unit} color={color} dot={dot} glow={glow} />
            ))}
            {followUpState ? (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleFollowUpDone}
                  disabled={followUpState.loading || !followUpState.question}
                  className="px-6 rounded-2xl text-sm font-medium text-white/30 hover:text-amber-400 border border-white/5 hover:border-amber-500/20 hover:bg-amber-500/5 transition-all whitespace-nowrap cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                  Done →
                </button>
                <button
                  onClick={handleFollowUpSkip}
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

      {/* ── DONE ── */}
      {sessionState === "done" && (
        <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-4xl font-semibold tracking-tight">Interview complete</h2>
            <p className="text-white/30 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {interview.role} @ {interview.company} · {interview.type} · {formatTime(timer)}
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
                micError={micError}
                role={interview.role}
                company={interview.company}
                type={interview.type}
                followUp={a.followUp}
                followUpAnswer={a.followUpAnswer}
              />
            ))}
          </div>

          {!reportData && !reportLoading && (
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

          {reportData && <ReportDisplay report={reportData} />}

          <button onClick={onReset}
            className="text-white/20 hover:text-white/45 transition-colors text-sm cursor-pointer">
            New session
          </button>
        </div>
      )}
    </div>
  )
}
