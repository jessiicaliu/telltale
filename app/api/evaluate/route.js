import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req) {
  try {
    const { question, answer, role, company } = await req.json()

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are an expert interview coach evaluating a candidate's answer for a ${role} position at ${company}.

Question asked: "${question}"

Candidate's answer: "${answer}"

Give direct, specific feedback in 3-4 sentences. Cover:
- Was the answer strong or weak and why
- What was missing or could be improved
- One specific suggestion for next time

Be honest and direct. No bullet points, just natural coaching language.`
        }
      ]
    })

    return NextResponse.json({ feedback: completion.choices[0].message.content })
  } catch (e) {
    console.error("evaluate error:", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}