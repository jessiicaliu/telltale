"use client"

import { useRef, useEffect, useState } from "react"
import { FaceLandmarker, HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export default function Camera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const lookingAwayRef = useRef(0)
  const faceTouchRef = useRef(0)
  const fillerRef = useRef(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const [stats, setStats] = useState({ lookingAway: 0, faceTouches: 0, fillers: 0 })

  useEffect(() => {
    let faceLandmarker
    let handLandmarker
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

      detectLoop()
    }

    function detectLoop() {
      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      if (video.videoWidth === 0 || !faceLandmarker || !handLandmarker) {
        animationId = requestAnimationFrame(detectLoop)
        return
      }

      const now = performance.now()
      const faceResults = faceLandmarker.detectForVideo(video, now)
      const handResults = handLandmarker.detectForVideo(video, now)

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

      const nowMs = Date.now()
      if (nowMs - lastUpdate >= 1000) {
        if (isLookingAway) lookingAwayRef.current += 1
        if (isTouchingFace) faceTouchRef.current += 1
        setStats({
          lookingAway: lookingAwayRef.current,
          faceTouches: faceTouchRef.current,
          fillers: fillerRef.current
        })
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
  }, [])

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="rounded-xl w-[640px] h-[480px] object-cover"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-[640px] h-[480px]"
        />
      </div>

      <div className="flex gap-8 text-white text-xl">
        <div>Looked away: <span className="text-red-400 font-bold">{stats.lookingAway}s</span></div>
        <div>Face touches: <span className="text-yellow-400 font-bold">{stats.faceTouches}s</span></div>
        <div>Filler words: <span className="text-purple-400 font-bold">{stats.fillers}</span></div>
      </div>
    </div>
  )
}