"use client"

import { useRef, useEffect, useState } from "react"
import { FaceLandmarker, HandLandmarker, PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

const METRICS = [
  { key: "lookingAway",  label: "Looked away",   unit: "s",  color: "text-red-400",    dot: "bg-red-400",    glow: "rgba(248,113,113,0.5)"  },
  { key: "faceTouches",  label: "Face touches",  unit: "s",  color: "text-amber-400",  dot: "bg-amber-400",  glow: "rgba(251,191,36,0.5)"   },
  { key: "fillers",      label: "Filler words",  unit: "",   color: "text-violet-400", dot: "bg-violet-400", glow: "rgba(167,139,250,0.5)"  },
  { key: "slouching",    label: "Slouching",     unit: "s",  color: "text-sky-400",    dot: "bg-sky-400",    glow: "rgba(56,189,248,0.5)"   },
]

function StatCard({ label, value, unit, color, dot, glow }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-[110px]">
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} style={{ boxShadow: `0 0 5px ${glow}` }} />
        <span className="text-white/30 text-[10px] uppercase tracking-[0.16em] font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-semibold tabular-nums leading-none ${color}`}>{value}</span>
        {unit && <span className="text-white/20 text-xs">{unit}</span>}
      </div>
    </div>
  )
}

function LiveBadge({ active, label }) {
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

function Spinner() {
  return (
    <div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
  )
}

function scoreColor(s) {
  if (s >= 80) return { text: "text-emerald-400", bar: "bg-emerald-500" }
  if (s >= 60) return { text: "text-amber-400", bar: "bg-amber-500" }
  return { text: "text-red-400", bar: "bg-red-500" }
}

const BREAKDOWN_LABELS = { eyeContact: "Eye contact", posture: "Posture", speech: "Speech", composure: "Composure" }

function ReportDisplay({ report }) {
  if (report.raw) {
    return <p className="text-white/55 text-sm leading-relaxed whitespace-pre-wrap">{report.raw}</p>
  }

  const { score, headline, breakdown, strengths, improvements, drill, contentNote } = report
  const { text: scoreText } = scoreColor(score)

  return (
    <div className="flex flex-col gap-3 w-full">

      {/* Overall */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex items-center gap-5">
        <span className={`text-5xl font-semibold tabular-nums leading-none ${scoreText}`}>{score}</span>
        <div className="flex flex-col gap-1">
          <span className="text-white/25 text-[10px] uppercase tracking-[0.15em] font-medium">Overall score</span>
          <span className="text-white/65 text-sm leading-snug">{headline}</span>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(breakdown).map(([key, { score: s, note }]) => {
          const { text, bar } = scoreColor(s)
          return (
            <div key={key} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-white/30 text-[10px] uppercase tracking-[0.13em] font-medium">{BREAKDOWN_LABELS[key]}</span>
                <span className={`text-sm font-semibold tabular-nums ${text}`}>{s}</span>
              </div>
              <div className="h-[3px] bg-white/[0.07] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${bar} opacity-60`} style={{ width: `${s}%` }} />
              </div>
              <p className="text-white/40 text-xs leading-relaxed">{note}</p>
            </div>
          )
        })}
      </div>

      {/* Strengths + improvements */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-500/[0.05] border border-emerald-500/[0.1] rounded-xl p-4 flex flex-col gap-2">
          <span className="text-emerald-400/60 text-[10px] uppercase tracking-[0.15em] font-medium">What went well</span>
          {strengths.map((s, i) => (
            <div key={i} className="flex gap-2 text-xs text-white/55 leading-relaxed">
              <span className="text-emerald-400/50 shrink-0">+</span>{s}
            </div>
          ))}
        </div>
        <div className="bg-amber-500/[0.04] border border-amber-500/[0.09] rounded-xl p-4 flex flex-col gap-2">
          <span className="text-amber-400/60 text-[10px] uppercase tracking-[0.15em] font-medium">To work on</span>
          {improvements.map((s, i) => (
            <div key={i} className="flex gap-2 text-xs text-white/55 leading-relaxed">
              <span className="text-amber-400/50 shrink-0">→</span>{s}
            </div>
          ))}
        </div>
      </div>

      {/* Drill */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1.5">
        <span className="text-white/25 text-[10px] uppercase tracking-[0.15em] font-medium">Practice drill</span>
        <p className="text-white/55 text-sm leading-relaxed">{drill}</p>
      </div>

      {/* Content feedback */}
      {contentNote && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1.5">
          <span className="text-white/25 text-[10px] uppercase tracking-[0.15em] font-medium">What you said</span>
          <p className="text-white/50 text-sm leading-relaxed">{contentNote}</p>
        </div>
      )}
    </div>
  )
}

export default function Camera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const lookingAwayRef = useRef(0)
  const faceTouchRef = useRef(0)
  const fillerRef = useRef(0)
  const slouchRef = useRef(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const sessionStartRef = useRef(null)
  const transcriptRef = useRef("")

  const [stats, setStats] = useState({ lookingAway: 0, faceTouches: 0, fillers: 0, slouching: 0 })
  const [liveSignals, setLiveSignals] = useState({ lookingAway: false, touchingFace: false, slouching: false })
  const [sessionState, setSessionState] = useState("idle")
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [timer, setTimer] = useState(0)
  const [showDots, setShowDots] = useState(true)
  const showDotsRef = useRef(true)

  function toggleDots() {
    showDotsRef.current = !showDotsRef.current
    setShowDots(showDotsRef.current)
  }

  useEffect(() => {
    if (sessionState !== "active") return
    const interval = setInterval(() => {
      setTimer(Math.floor((Date.now() - sessionStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionState])

  useEffect(() => {
    if (sessionState !== "active") return

    let faceLandmarker
    let handLandmarker
    let poseLandmarker
    let animationId
    let lastUpdate = Date.now()

    sessionStartRef.current = Date.now()

    async function startAudioRecording() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        audioChunksRef.current = []
        const formData = new FormData()
        formData.append("audio", blob, "audio.webm")
        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: formData })
          const { text } = await res.json()
          transcriptRef.current = (transcriptRef.current + " " + text).trim()
          const fillerWords = ["um", "uh", "like", "you know", "basically", "literally"]
          let count = 0
          for (const word of fillerWords) {
            const matches = text.toLowerCase().match(new RegExp(`\\b${word}\\b`, "g"))
            if (matches) count += matches.length
          }
          if (count > 0) {
            fillerRef.current += count
            setStats(prev => ({ ...prev, fillers: fillerRef.current }))
          }
        } catch (e) {
          console.log("transcription error:", e)
        }
        if (mediaRecorderRef.current?.state !== "inactive") return
        mediaRecorder.start()
        setTimeout(() => {
          if (mediaRecorder.state === "recording") mediaRecorder.stop()
        }, 5000)
      }

      mediaRecorder.start()
      setTimeout(() => {
        if (mediaRecorder.state === "recording") mediaRecorder.stop()
      }, 5000)
    }

    async function setup() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      videoRef.current.srcObject = stream

      await new Promise((resolve) => {
        videoRef.current.onloadedmetadata = () => resolve()
      })

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      )

      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      })

      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      })

      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
      })

      detectLoop()
    }

    function detectLoop() {
      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      if (video.videoWidth === 0 || !faceLandmarker || !handLandmarker || !poseLandmarker) {
        animationId = requestAnimationFrame(detectLoop)
        return
      }

      const now = performance.now()
      const faceResults = faceLandmarker.detectForVideo(video, now)
      const handResults = handLandmarker.detectForVideo(video, now)
      const poseResults = poseLandmarker.detectForVideo(video, now)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let isLookingAway = false
      let isTouchingFace = false
      let isSlouching = false

      if (faceResults?.faceLandmarks?.[0]) {
        const landmarks = faceResults.faceLandmarks[0]

        if (showDotsRef.current) {
          for (const landmark of landmarks) {
            ctx.beginPath()
            ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 1.5, 0, 2 * Math.PI)
            ctx.fillStyle = "rgba(52, 211, 153, 0.6)"
            ctx.fill()
          }
        }

        const matrix = faceResults.facialTransformationMatrixes?.[0]?.data
        if (matrix) {
          isLookingAway = Math.abs(matrix[8]) > 0.3 || Math.abs(matrix[9]) > 0.3
        }

        if (handResults?.landmarks?.length > 0) {
          for (const hand of handResults.landmarks) {
            for (const handPoint of hand) {
              for (const facePoint of landmarks) {
                const dx = handPoint.x - facePoint.x
                const dy = handPoint.y - facePoint.y
                if (Math.sqrt(dx * dx + dy * dy) < 0.08) {
                  isTouchingFace = true
                  break
                }
              }
              if (isTouchingFace) break
            }
            if (isTouchingFace) break
          }
        }
      }

      if (showDotsRef.current && handResults?.landmarks?.length > 0) {
        for (const hand of handResults.landmarks) {
          for (const point of hand) {
            ctx.beginPath()
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, 2 * Math.PI)
            ctx.fillStyle = isTouchingFace ? "rgba(248, 113, 113, 0.8)" : "rgba(96, 165, 250, 0.6)"
            ctx.fill()
          }
        }
      }

      if (poseResults?.landmarks?.[0]) {
        const pose = poseResults.landmarks[0]
        const shoulderMidY = (pose[11].y + pose[12].y) / 2
        const earMidY = (pose[7].y + pose[8].y) / 2
        isSlouching = (shoulderMidY - earMidY) < 0.25
      }

      const nowMs = Date.now()
      if (nowMs - lastUpdate >= 1000) {
        if (isLookingAway) lookingAwayRef.current += 1
        if (isTouchingFace) faceTouchRef.current += 1
        if (isSlouching) slouchRef.current += 1
        setStats({
          lookingAway: lookingAwayRef.current,
          faceTouches: faceTouchRef.current,
          fillers: fillerRef.current,
          slouching: slouchRef.current
        })
        setLiveSignals({ lookingAway: isLookingAway, touchingFace: isTouchingFace, slouching: isSlouching })
        lastUpdate = nowMs
      }

      animationId = requestAnimationFrame(detectLoop)
    }

    startAudioRecording()
    setup()

    return () => {
      cancelAnimationFrame(animationId)
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop()
    }
  }, [sessionState])

  async function getReport() {
    setReportLoading(true)
    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000)
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats, duration, transcript: transcriptRef.current })
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
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-8 py-12">

      {/* IDLE */}
      {sessionState === "idle" && (
        <div className="relative flex flex-col items-center gap-10 text-center max-w-lg">
          {/* ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none -z-10"
            style={{
              background: 'radial-gradient(ellipse 70% 50% at 50% 70%, rgba(16,185,129,0.07) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />

          <div className="flex flex-col gap-4">
            <p className="text-white/25 text-xs tracking-[0.22em] uppercase font-medium">AI Interview Coach</p>
            <h1 className="text-5xl font-semibold tracking-tight leading-[1.1]">
              Practice like it's real.
            </h1>
            <p className="text-white/40 text-base leading-relaxed max-w-sm mx-auto">
              See your eye contact, posture, filler words, and nervous habits as they happen.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            {METRICS.map(({ label, dot, glow }) => (
              <span
                key={label}
                className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-3.5 py-1.5 text-sm text-white/50"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} style={{ boxShadow: `0 0 5px ${glow}` }} />
                {label}
              </span>
            ))}
          </div>

          <button
            onClick={() => setSessionState("active")}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-base px-9 py-3 rounded-xl transition-colors cursor-pointer"
            style={{ boxShadow: '0 0 40px rgba(16,185,129,0.3)' }}
          >
            Start session
          </button>
        </div>
      )}

      {/* ACTIVE */}
      {sessionState === "active" && (
        <div className="flex flex-col items-center gap-5 w-full max-w-3xl">

          {/* status bar */}
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2 flex-wrap">
              <LiveBadge active={liveSignals.lookingAway} label="Looking away" />
              <LiveBadge active={liveSignals.touchingFace} label="Face touch" />
              <LiveBadge active={liveSignals.slouching} label="Slouching" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(248,113,113,0.8)' }} />
              <span className="font-mono text-white/35 text-sm tabular-nums">{formatTime(timer)}</span>
            </div>
          </div>

          {/* camera feed */}
          <div
            className="relative rounded-2xl overflow-hidden border border-white/[0.08]"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.02), 0 24px 64px rgba(0,0,0,0.6)' }}
          >
            <video ref={videoRef} autoPlay playsInline className="w-[640px] h-[480px] object-cover block" />
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-[640px] h-[480px]" />
            <button
              onClick={toggleDots}
              className="absolute bottom-3 right-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
            >
              Dots
              <div className={`relative w-7 h-4 rounded-full transition-colors duration-200 ${showDots ? 'bg-emerald-500' : 'bg-white/15'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${showDots ? 'left-[14px]' : 'left-0.5'}`} />
              </div>
            </button>
          </div>

          {/* stats + end */}
          <div className="flex gap-3 w-full items-stretch">
            {METRICS.map(({ key, label, unit, color, dot, glow }) => (
              <StatCard key={key} label={label} value={stats[key]} unit={unit} color={color} dot={dot} glow={glow} />
            ))}
            <button
              onClick={() => setSessionState("done")}
              className="flex-shrink-0 bg-white/[0.03] hover:bg-red-500/[0.08] border border-white/[0.07] hover:border-red-500/20 text-white/35 hover:text-red-400 transition-all font-medium px-5 rounded-xl text-sm cursor-pointer"
            >
              End
            </button>
          </div>
        </div>
      )}

      {/* DONE */}
      {sessionState === "done" && (
        <div className="flex flex-col items-center gap-8 w-full max-w-xl">

          <div className="text-center flex flex-col gap-2">
            <h2 className="text-4xl font-semibold tracking-tight">Session complete</h2>
            <span className="font-mono text-white/25 text-sm tabular-nums">{formatTime(timer)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            {METRICS.map(({ key, label, unit, color, dot, glow }) => (
              <StatCard key={key} label={label} value={stats[key]} unit={unit} color={color} dot={dot} glow={glow} />
            ))}
          </div>

          {!report && !reportLoading && (
            <button
              onClick={getReport}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-base px-8 py-3 rounded-xl transition-colors w-full cursor-pointer"
              style={{ boxShadow: '0 0 40px rgba(16,185,129,0.2)' }}
            >
              Get coaching report
            </button>
          )}

          {reportLoading && (
            <div className="flex items-center gap-3 text-white/30 text-sm py-2">
              <Spinner />
              Analyzing your session...
            </div>
          )}

          {report && <ReportDisplay report={report} />}

          <button
            onClick={() => window.location.reload()}
            className="text-white/20 hover:text-white/45 transition-colors text-sm cursor-pointer"
          >
            New session
          </button>
        </div>
      )}
    </div>
  )
}
