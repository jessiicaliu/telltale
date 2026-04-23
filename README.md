# Telltale

Practice interviews on camera and get feedback on your answers, body language, and speech habits in real time.

## Features

- Generates questions for any role, company, and interview type (behavioral, technical, system design, case). Paste a job description to make them more specific.
- Tracks eye contact, posture, and face touches in real time using your camera
- Counts filler words as you speak with a per-word breakdown
- Choose how many questions per session (3, 5, or 7)
- AI follow-up questions based on your answer
- Scores each answer and checks for STAR structure on behavioral questions
- End-of-session report covering eye contact, posture, speech, and composure
- Optional interviewer video you can toggle on or off

## Stack

- Next.js (App Router) with Tailwind CSS
- MediaPipe Tasks Vision for real-time face and pose detection in the browser
- Groq for AI-powered question generation, answer evaluation, and follow-up questions
- Whisper via Groq for audio transcription
