import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // Vite defines process.env.GEMINI_API_KEY as a literal string replacement.
    // If it wasn't replaced, we fall back to an empty string.
    let apiKey = "";
    try {
      apiKey = process.env.GEMINI_API_KEY || "";
    } catch (e) {
      console.warn("process.env.GEMINI_API_KEY access failed, checking global variants.");
    }

    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Gemini features will not work.");
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey || "" });
  }
  return aiInstance;
}

export async function transcribeAndTranslateAudio(audioBase64: string, mimeType: string, sourceLanguage: string) {
  try {
    const ai = getAI();
    
    // Clean mimeType: Gemini expects basic types like "audio/webm", not "audio/webm;codecs=opus"
    const cleanedMimeType = mimeType.split(';')[0];
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: cleanedMimeType,
            },
          },
          {
            text: `You are an expert transcriber and translator for the Benishangul-Gumuz Regional Police Commission in Ethiopia. 
            The audio provided is an official police statement.
            
            SOURCE LANGUAGE: ${sourceLanguage}
            TARGET LANGUAGE: Amharic (አማርኛ)
            
            TASKS:
            1. Transcribe the audio precisely as spoken.
            2. If the source language is NOT Amharic, translate it into formal, accurate Amharic. If it IS Amharic, provide the polished transcription.
            3. Ensure the tone is objective and formal, suitable for a regional police node report.
            4. Preserve all names, dates, amounts, and locations exactly.
            5. If there are multiple speakers, label them (e.g., [መርማሪ], [ቃል ሰጪ]).
            
            OUTPUT:
            Return ONLY the final Amharic text. Do not include any introductory or concluding remarks.`,
          },
        ],
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return text.trim();
  } catch (error) {
    console.error("Gemini AI Processing Error:", error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "Transcription failed due to an unknown error.";
  }
}
