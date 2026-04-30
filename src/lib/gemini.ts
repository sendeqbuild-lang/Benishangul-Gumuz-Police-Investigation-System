import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function transcribeAndTranslateAudio(audioBase64: string, mimeType: string, sourceLanguage: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType,
            },
          },
          {
            text: `You are an expert transcriber and translator for the Benishangul-Gumuz Regional Police Commission in Ethiopia. 
            The provided audio is a statement from a ${sourceLanguage} speaker. 
            
            TASKS:
            1. Transcribe the audio accurately.
            2. Translate the statement into formal Amharic (አማርኛ).
            3. Ensure the tone is objective and suitable for a legal police report.
            4. If the speaker mentioned names, dates, or specific locations, preserve them exactly.
            
            Output ONLY the official Amharic transcription text. Do not add any conversational remarks or meta-text.`,
          },
        ],
      },
    });

    return response.text?.trim() || "Transcription failed. No text returned.";
  } catch (error) {
    console.error("Gemini AI Processing Error:", error);
    throw error;
  }
}
