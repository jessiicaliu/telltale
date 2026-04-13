"use client"

import { useRef, useEffect, useState } from "react"
import { FaceLandmarker, HandLandmarker, PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export default function Camera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const lookingAwayRef = useRef(0)
  const faceTouchRef = useRef(0)
  const fillerRef = useRef(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const slouchRef = useRef(0)
  const [stats, setStats] = useState({ lookingAway: 0, faceTouches: 0, fillers: 0, slouching: 0 })
  const [sessionState, setSessionState] = useState("idle") // idle, active, done
  const [report, setReport] = useState("")
  const sessionStartRef = useRef(null)

  async function getReport() {
    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000)
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats, duration })
    })
    const { report } = await res.json()
    setReport(report)
  }

  useEffect(() => {
    let faceLandmarker
    let handLandmarker
    let poseLandmarker
    let animationId
    let lastUpdate = Date.now()

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
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          })
          const { text } = await res.json()
          console.log("transcript:", text)

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

        // restart recording
        mediaRecorder.start()
        setTimeout(() => mediaRecorder.stop(), 10000)
      }

      mediaRecorder.start()
      setTimeout(() => mediaRecorder.stop(), 10000)
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

      if (faceResults?.faceLandmarks?.[0]) {
        const landmarks = faceResults.faceLandmarks[0]

        for (const landmark of landmarks) {
          ctx.beginPath()
          ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 1.5, 0, 2 * Math.PI)
          ctx.fillStyle = "#00ff88"
          ctx.fill()
        }

        const matrix = faceResults.facialTransformationMatrixes?.[0]?.data
        if (matrix) {
          const lookLeftRight = Math.abs(matrix[8])
          const lookUpDown = Math.abs(matrix[9])
          isLookingAway = lookLeftRight > 0.3 || lookUpDown > 0.3
        }

        if (handResults?.landmarks?.length > 0) {
          for (const hand of handResults.landmarks) {
            for (const handPoint of hand) {
              for (const facePoint of landmarks) {
                const dx = handPoint.x - facePoint.x
                const dy = handPoint.y - facePoint.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < 0.08) {
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

      if (handResults?.landmarks?.length > 0) {
        for (const hand of handResults.landmarks) {
          for (const point of hand) {
            ctx.beginPath()
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, 2 * Math.PI)
            ctx.fillStyle = isTouchingFace ? "#ff4444" : "#4488ff"
            ctx.fill()
          }
        }
      }

      // posture detection using shoulder and ear positions
      let isSlouching = false
      if (poseResults?.landmarks?.[0]) {
        const pose = poseResults.landmarks[0]
        const leftShoulder = pose[11]
        const rightShoulder = pose[12]
        const leftEar = pose[7]
        const rightEar = pose[8]

        const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
        const earMidY = (leftEar.y + rightEar.y) / 2

        // if ears are too close to shoulders vertically, you're slouching
        const diff = shoulderMidY - earMidY
        isSlouching = diff < 0.25
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
        lastUpdate = nowMs
      }

      animationId = requestAnimationFrame(detectLoop)
    }

    if (sessionState === "active") {
      sessionStartRef.current = Date.now()
      startAudioRecording()
      setup()
    }
  async function getReport() {
    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000)
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats, duration })
    })
    const { report } = await res.json()
    setReport(report)
  }

    return () => {
      cancelAnimationFrame(animationId)
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop()
    }
  }, [sessionState])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6">
      {sessionState === "idle" && (
        <div className="flex flex-col items-center gap-6">
          <h1 className="text-white text-5xl font-bold">Telltale</h1>
          <p className="text-gray-400 text-xl">Your AI interview coach</p>
          <button
            onClick={() => setSessionState("active")}
            className="bg-green-500 hover:bg-green-600 text-white text-xl font-bold px-12 py-4 rounded-2xl"
          >
            Start Session
          </button>
        </div>
      )}

      {sessionState === "active" && (
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <video ref={videoRef} autoPlay playsInline className="rounded-xl w-[640px] h-[480px] object-cover" />
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-[640px] h-[480px]" />
          </div>
          <div className="flex gap-8 text-white text-xl">
            <div>👀 Looked away: <span className="text-red-400 font-bold">{stats.lookingAway}s</span></div>
            <div>🤚 Face touches: <span className="text-yellow-400 font-bold">{stats.faceTouches}s</span></div>
            <div>🗣️ Filler words: <span className="text-purple-400 font-bold">{stats.fillers}</span></div>
            <div>🪑 Slouching: <span className="text-blue-400 font-bold">{stats.slouching}s</span></div>
          </div>
          <button
            onClick={() => setSessionState("done")}
            className="bg-red-500 hover:bg-red-600 text-white text-xl font-bold px-12 py-4 rounded-2xl"
          >
            End Session
          </button>
        </div>
      )}

      {sessionState === "done" && (
        <div className="flex flex-col items-center gap-6 text-white max-w-2xl text-center">
          <h2 className="text-4xl font-bold">Session Complete</h2>
          <div className="flex flex-col gap-3 text-xl">
            <div>👀 Looked away: <span className="text-red-400 font-bold">{stats.lookingAway}s</span></div>
            <div>🤚 Face touches: <span className="text-yellow-400 font-bold">{stats.faceTouches}s</span></div>
            <div>🗣️ Filler words: <span className="text-purple-400 font-bold">{stats.fillers}</span></div>
            <div>🪑 Slouching: <span className="text-blue-400 font-bold">{stats.slouching}s</span></div>
          </div>

          {!report && (
            <button
              onClick={getReport}
              className="bg-purple-500 hover:bg-purple-600 text-white text-xl font-bold px-12 py-4 rounded-2xl"
            >
              Get AI Report
            </button>
          )}

          {report && (
            <div className="bg-gray-900 rounded-2xl p-6 text-left text-gray-200 whitespace-pre-wrap">
              {report}
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            className="bg-green-500 hover:bg-green-600 text-white text-xl font-bold px-12 py-4 rounded-2xl"
          >
            Start New Session
          </button>
        </div>
      )}
    </div>
  )
}