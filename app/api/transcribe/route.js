import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req) {
  try {
    const formData = await req.formData()
    const audio = formData.get("audio")

    console.log("audio received:", audio?.name, audio?.size)

    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: "whisper-large-v3",
    })

    console.log("transcription:", transcription.text)
    return NextResponse.json({ text: transcription.text })
  } catch (e) {
    console.error("transcribe error:", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}