import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req) {
  try {
    const { stats, duration, transcript } = await req.json()

    const minutes = duration / 60
    const lookingAwayPct = duration > 0 ? Math.round((stats.lookingAway / duration) * 100) : 0
    const slouchingPct = duration > 0 ? Math.round((stats.slouching / duration) * 100) : 0
    const fillersPerMin = minutes > 0 ? (stats.fillers / minutes).toFixed(1) : 0

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an expert interview coach. Return only valid JSON, no other text. No em dashes anywhere in your response."
        },
        {
          role: "user",
          content: `Analyze this mock interview session and return a JSON coaching report.

Session length: ${duration}s
Eye contact lost: ${stats.lookingAway}s (${lookingAwayPct}% of session)
Slouching: ${stats.slouching}s (${slouchingPct}% of session)
Face touches: ${stats.faceTouches}
Filler words: ${stats.fillers} total (${fillersPerMin}/min)
Transcript: ${transcript ? `"${transcript}"` : "not available"}

Score each category 0-100 based on these benchmarks for a ${Math.round(minutes)}-minute session:
- Eye contact: 100 = <5% looking away, 0 = >40% looking away
- Posture: 100 = <5% slouching, 0 = >50% slouching
- Speech: 100 = <1 filler/min, 0 = >8 fillers/min
- Composure: 100 = 0 face touches, 0 = >10 face touches

Return this exact JSON shape:
{
  "score": <weighted average 0-100>,
  "headline": "<one punchy sentence summarizing performance>",
  "breakdown": {
    "eyeContact": { "score": <0-100>, "note": "<one specific sentence>" },
    "posture": { "score": <0-100>, "note": "<one specific sentence>" },
    "speech": { "score": <0-100>, "note": "<one specific sentence>" },
    "composure": { "score": <0-100>, "note": "<one specific sentence>" }
  },
  "strengths": ["<specific strength>", "<specific strength>"],
  "improvements": ["<specific actionable improvement>", "<specific actionable improvement>"],
  "drill": "<one concrete exercise to practice before next session>",
  "contentNote": "<if transcript available: 1-2 sentences on clarity, structure, or content quality. If not: null>"
}`
        }
      ]
    })

    const raw = completion.choices[0].message.content
    const report = JSON.parse(raw)
    return NextResponse.json({ report })
  } catch (e) {
    console.error("report error:", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
