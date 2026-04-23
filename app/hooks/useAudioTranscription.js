"use client"

import { useRef, useEffect, useState } from "react"

const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "literally"]

export function useAudioTranscription(active) {
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const transcriptRef = useRef("")
  const fillerCountRef = useRef(0)

  const [fillerCount, setFillerCount] = useState(0)
  const [micError, setMicError] = useState(false)

  useEffect(() => {
    if (!active) return

    transcriptRef.current = ""
    fillerCountRef.current = 0
    setMicError(false)

    let stopped = false

    async function startRecording() {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        setMicError(true)
        return
      }
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

          let count = 0
          for (const word of FILLER_WORDS) {
            const matches = text.toLowerCase().match(new RegExp(`\\b${word}\\b`, "g"))
            if (matches) count += matches.length
          }
          if (count > 0) {
            fillerCountRef.current += count
            setFillerCount(fillerCountRef.current)
          }
        } catch (e) {
          console.log("transcription error:", e)
        }

        if (stopped) return
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

    startRecording()

    return () => {
      stopped = true
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [active])

  return { fillerCount, transcriptRef, micError }
}
