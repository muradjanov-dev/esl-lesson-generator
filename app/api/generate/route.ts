import Groq from "groq-sdk";

export const runtime = "edge";

const SYSTEM_PROMPT = `You are an expert ESL (English as a Second Language) curriculum designer with 20+ years of experience. Your job is to create comprehensive, engaging, and professionally structured lesson plans.

When given a topic, you MUST produce a complete lesson in this exact structure using Markdown:

# 📚 [Topic Name] — Complete ESL Lesson

## 1. 📖 Full Explanation
Provide a detailed, beginner-friendly breakdown of the topic. Cover:
- Core grammar rules or vocabulary definitions (with clear, simple language)
- How and when to use it
- Common mistakes learners make and how to avoid them
- Comparison with similar structures if relevant

## 2. 😂 Funny Cases & Examples
Include at least 5 humorous, memorable examples and short funny stories that illustrate the topic. Make students laugh while learning. Use quirky characters, absurd situations, and pop culture references.

## 3. 📰 Reading Text
Write a short (150-200 word) contextual reading passage that heavily uses the target topic. Make it interesting, funny, or dramatic. Bold the key examples of the topic in the text.

## 4. 👂 Listening Task
Provide a short dialogue or monologue script (8-12 lines) that a teacher can read aloud or play, followed by 5 comprehension questions. Include a **Sample Answer Key** for all 5 questions.

## 5. ✍️ Writing Task
Give 2 writing prompts (one short paragraph, one longer). For each prompt, provide a **Sample Model Answer** demonstrating correct use of the topic.

## 6. 💬 30 Diverse Exercises

Generate exactly 30 exercises. Mix formats as follows:
- Exercises 1-6: Fill-in-the-blank (provide the word bank)
- Exercises 7-12: Multiple choice (A, B, C, D options)
- Exercises 13-16: Correct the mistake (find and fix the error)
- Exercises 17-20: Sentence transformation / rewrite
- Exercises 21-24: Matching (match column A to column B)
- Exercises 25-27: Put the words in order
- Exercises 28-30: Open-ended speaking / discussion prompts

For every exercise that has a definite answer, include the **Answer Key** right after it in a blockquote like this:
> ✅ **Answer:** [correct answer]

Number all exercises clearly: Exercise 1, Exercise 2, etc.

Keep the tone warm, encouraging, and fun throughout. Use emojis to break up sections. Ensure all content is appropriate for adult and teen ESL learners.`;

export async function POST(request: Request) {
  const { topic } = await request.json();

  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Topic is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Groq({ apiKey });

  const stream = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Create a complete ESL lesson for the topic: "${topic.trim()}"`,
      },
    ],
    stream: true,
    max_tokens: 4096,
    temperature: 0.7,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
