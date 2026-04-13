import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req) {
  try {
    const { stats, duration } = await req.json()

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are an expert interview coach. Analyze this candidate's mock interview session and give specific, actionable feedback. Be encouraging but honest. Keep it concise.

Session duration: ${duration} seconds
Eye contact lost: ${stats.lookingAway} seconds
Face touches: ${stats.faceTouches} times
Filler words used: ${stats.fillers}
Slouching detected: ${stats.slouching} seconds

Write a short coaching report with:
1. Overall assessment (1-2 sentences)
2. Top 2 things they did well
3. Top 2 things to improve
4. One specific tip for next time`
        }
      ]
    })

    return NextResponse.json({ report: completion.choices[0].message.content })
  } catch (e) {
    console.error("report error:", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}