"use client"

import { useRef, useEffect, useState } from "react"
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export default function Camera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const lookingAwayRef = useRef(0)
  const [stats, setStats] = useState({ lookingAway: 0 })

  useEffect(() => {
    let faceLandmarker
    let animationId
    let lastUpdate = Date.now()

    async function setup() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
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

      detectLoop()
    }

    function detectLoop() {
      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      if (video.videoWidth === 0 || !faceLandmarker) {
        animationId = requestAnimationFrame(detectLoop)
        return
      }

      const results = faceLandmarker?.detectForVideo(video, performance.now())
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (results?.faceLandmarks?.[0]) {
        const landmarks = results.faceLandmarks[0]

        for (const landmark of landmarks) {
          ctx.beginPath()
          ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 1.5, 0, 2 * Math.PI)
          ctx.fillStyle = "#00ff88"
          ctx.fill()
        }


        // use facial transformation matrix for real gaze direction
        const matrix = results.facialTransformationMatrixes?.[0]?.data

        if (matrix) {
          // matrix[8] is the X rotation (left/right head turn)
          // matrix[9] is the Y rotation (up/down head tilt)
          const lookLeftRight = Math.abs(matrix[8])
          const lookUpDown = Math.abs(matrix[9])

          const isLookingAway = lookLeftRight > 0.3 || lookUpDown > 0.3

          const now = Date.now()
          if (now - lastUpdate >= 1000) {
            if (isLookingAway) {
              lookingAwayRef.current += 1
              setStats({ lookingAway: lookingAwayRef.current })
            }
            lastUpdate = now
          }
        }
      }

      animationId = requestAnimationFrame(detectLoop)
    }

    setup()
    return () => cancelAnimationFrame(animationId)
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

      <div className="text-white text-xl">
        Looked away: <span className="text-red-400 font-bold">{stats.lookingAway}s</span>
      </div>
    </div>
  )
}