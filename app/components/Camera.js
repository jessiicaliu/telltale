"use client"

import { useRef, useEffect } from "react"
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export default function Camera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    let faceLandmarker
    let animationId

    async function setup() {
      // start camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      videoRef.current.srcObject = stream

      // load mediapipe
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      )
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1
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

      const results = faceLandmarker?.detectForVideo(video, performance.now())

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (results?.faceLandmarks?.[0]) {
        for (const landmark of results.faceLandmarks[0]) {
          ctx.beginPath()
          ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 1.5, 0, 2 * Math.PI)
          ctx.fillStyle = "#00ff88"
          ctx.fill()
        }
      }

      animationId = requestAnimationFrame(detectLoop)
    }

    setup()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
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
  )
}