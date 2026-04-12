"use client"

import { useRef, useEffect } from "react"

export default function Home() {
  const videoRef = useRef(null)

  useEffect(() => {
    async function startCamera() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      videoRef.current.srcObject = stream
    }
    startCamera()
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black">
      <h1 className="text-white text-4xl font-bold mb-8">Telltale</h1>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="rounded-xl w-[640px] h-[480px] object-cover"
      />
    </main>
  )
}