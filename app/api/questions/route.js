import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req) {
  try {
    const { role, company } = await req.json()

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Generate exactly 5 realistic interview questions for a ${role} position at ${company}. 
          
Mix of behavioral and technical questions appropriate for the role. Make them specific to ${company}'s culture and the ${role} role — not generic.

Return ONLY a JSON array of 5 strings, no other text, no markdown, no explanation. Example format:
["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]`
        }
      ]
    })

    const text = completion.choices[0].message.content.trim()
    const questions = JSON.parse(text)
    return NextResponse.json({ questions })
  } catch (e) {
    console.error("questions error:", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}