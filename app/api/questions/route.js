import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req) {
  try {
    const { role, company, type = "behavioral", count = 5, jd = null } = await req.json()

    const typePrompts = {
      behavioral: `Mix of:
      - 2 behavioral questions (tell me about a time...)
      - 2 situational questions (how would you approach...)
      - 1 role-specific question about their experience`,
      technical: `Mix of:
      - 2 technical knowledge questions testing depth in core concepts for this role
      - 2 problem-solving questions (how would you debug / implement / optimize X)
      - 1 question about a past technical project or decision`,
      "system-design": `Mix of:
      - 2 open-ended system design questions (design a X that does Y)
      - 2 architecture/tradeoff questions (how would you scale / handle failure in X)
      - 1 question about past design decisions and their outcomes`,
      case: `Mix of:
      - 1 market sizing question
      - 2 business strategy or problem-solving case questions
      - 1 prioritization question (given limited resources, how would you...)
      - 1 role-specific question connecting business thinking to the ${role} function`,
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Generate exactly ${count} realistic ${type} interview questions for a candidate interviewing for a ${role} position at ${company}.

      ${typePrompts[type] ?? typePrompts.behavioral}

      ${jd ? `Use this job description to make the questions more specific and relevant:\n${jd}\n` : ""}
      Keep questions natural and conversational like a real interviewer would ask. Don't mention ${company} by name in every question — only where it genuinely makes sense. Don't be overly specific about internal tools, teams, or processes at ${company} since the candidate hasn't worked there.

      Return ONLY a JSON array of ${count} strings, no other text, no markdown, no explanation. Example format:
      ["Question 1", "Question 2", "Question 3"]`
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