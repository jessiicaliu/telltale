import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req) {
  try {
    const { question, answer, role, company, type = "behavioral" } = await req.json()

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 120,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an experienced interviewer. Return only valid JSON."
        },
        {
          role: "user",
          content: `You just heard a candidate answer an interview question. Generate one sharp follow-up that probes deeper into something specific they said.

Role: ${role} at ${company}
Interview type: ${type}
Question asked: "${question}"
Candidate's answer: "${answer}"

Rules:
- Reference something specific from their answer (start with "You mentioned..." or "You said..." or "Earlier you...")
- Probe for depth, specifics, challenges they glossed over, or how they'd handle it differently
- One sentence only. Sound like a real interviewer, not a chatbot.

Return JSON: { "followUp": "<the follow-up question>" }`
        }
      ]
    })

    const result = JSON.parse(completion.choices[0].message.content)
    return NextResponse.json(result)
  } catch (e) {
    console.error("followup error:", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
