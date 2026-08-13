import OpenAI, { toFile } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface GenerateAIOptions {
  systemPrompt: string;
  prompt: string;
  jsonMode?: boolean;
}

export interface AIResult {
  text: string;
  provider: string;
  model: string;
}

/**
 * Main AI Completion Utility for Rekah:
 * - Primary: OpenAI (GPT-4o / GPT-4o-mini)
 * - Fallback: Google Gemini (3 models cascade: gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash)
 */
export async function generateAICompletion({
  systemPrompt,
  prompt,
  jsonMode = false,
}: GenerateAIOptions): Promise<AIResult> {
  // 1. Primary Provider: OpenAI (GPT-4o-mini)
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: jsonMode ? { type: "json_object" } : undefined,
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return {
          text: content,
          provider: "OpenAI",
          model: "gpt-4o-mini",
        };
      }
    } catch (err) {
      console.warn("[AI Provider] OpenAI failed, switching to Gemini fallback...", err);
    }
  }

  // 2. Fallback Provider: Google Gemini with 3 Flash models
  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const geminiModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    for (const modelName of geminiModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined,
        });

        const combinedPrompt = `${systemPrompt}\n\nUSER PROMPT:\n${prompt}`;
        const result = await model.generateContent(combinedPrompt);
        const text = result.response.text();

        if (text) {
          return {
            text,
            provider: "Google Gemini",
            model: modelName,
          };
        }
      } catch (err) {
        console.warn(`[AI Provider] Gemini model ${modelName} failed, trying next...`, err);
      }
    }
  }

  throw new Error("Tidak ada AI provider yang tersedia (API Key kosong atau semua model error)");
}

/**
 * Transkrip pesan suara (VN) dari URL media Fonnte → teks (Bahasa Indonesia).
 * Pakai OpenAI Whisper. Lempar error jika API key kosong / unduh gagal.
 */
export async function transcribeAudioFromUrl(url: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY kosong — transkrip VN butuh OpenAI Whisper");
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal mengunduh audio VN: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const file = await toFile(buffer, "voice-note.ogg");
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "id",
  });
  return transcription.text ?? "";
}
