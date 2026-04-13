import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req) {
  try {
    const { question, answer, role, company, type = "behavioral" } = await req.json()

    const isBehavioral = type === "behavioral"

    const starInstruction = isBehavioral ? `
Also evaluate whether the answer used the STAR method. Return a "star" object with boolean fields:
- situation: did they set up context / a specific scenario?
- task: did they explain their responsibility or goal?
- action: did they describe what *they* specifically did?
- result: did they share a concrete outcome or what they learned?` : ""

    const starShape = isBehavioral
      ? `"star": { "situation": true/false, "task": true/false, "action": true/false, "result": true/false }`
      : `"star": null`

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an expert interview coach. Return only valid JSON, no other text."
        },
        {
          role: "user",
          content: `Evaluate this candidate's answer for a ${role} position at ${company}.

Question: "${question}"
Answer: "${answer}"

Give direct, specific feedback in 3-4 sentences covering: whether the answer was strong or weak and why, what was missing or could be improved, and one concrete suggestion for next time. Be honest. No bullet points, just natural coaching language.
${starInstruction}

Return this exact JSON shape:
{
  "feedback": "<3-4 sentence coaching feedback>",
  ${starShape}
}`
        }
      ]
    })

    const result = JSON.parse(completion.choices[0].message.content)
    return NextResponse.json(result)
  } catch (e) {
    console.error("evaluate error:", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}