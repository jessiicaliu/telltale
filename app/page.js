"use client"

import Camera from "./components/Camera"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black">
      <h1 className="text-white text-4xl font-bold mb-8">Telltale</h1>
      <Camera />
    </main>
  )
}