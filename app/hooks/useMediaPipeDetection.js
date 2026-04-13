"use client"

import { useRef, useEffect, useState } from "react"
import { FaceLandmarker, HandLandmarker, PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export function useMediaPipeDetection(active, videoRef, canvasRef, showDotsRef) {
  const lookingAwayRef = useRef(0)
  const faceTouchRef = useRef(0)
  const slouchRef = useRef(0)

  const [visualStats, setVisualStats] = useState({ lookingAway: 0, faceTouches: 0, slouching: 0 })
  const [liveSignals, setLiveSignals] = useState({ lookingAway: false, touchingFace: false, slouching: false })

  useEffect(() => {
    if (!active) return

    lookingAwayRef.current = 0
    faceTouchRef.current = 0
    slouchRef.current = 0

    let faceLandmarker
    let handLandmarker
    let poseLandmarker
    let animationId
    let lastUpdate = Date.now()

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
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      })

      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      })

      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
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
          outer: for (const hand of handResults.landmarks) {
            for (const handPoint of hand) {
              for (const facePoint of landmarks) {
                const dx = handPoint.x - facePoint.x
                const dy = handPoint.y - facePoint.y
                if (Math.sqrt(dx * dx + dy * dy) < 0.08) {
                  isTouchingFace = true
                  break outer
                }
              }
            }
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
        isSlouching = shoulderMidY - earMidY < 0.25
      }

      const nowMs = Date.now()
      if (nowMs - lastUpdate >= 1000) {
        if (isLookingAway) lookingAwayRef.current += 1
        if (isTouchingFace) faceTouchRef.current += 1
        if (isSlouching) slouchRef.current += 1
        setVisualStats({
          lookingAway: lookingAwayRef.current,
          faceTouches: faceTouchRef.current,
          slouching: slouchRef.current,
        })
        setLiveSignals({ lookingAway: isLookingAway, touchingFace: isTouchingFace, slouching: isSlouching })
        lastUpdate = nowMs
      }

      animationId = requestAnimationFrame(detectLoop)
    }

    setup()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [active])

  return { visualStats, liveSignals }
}
