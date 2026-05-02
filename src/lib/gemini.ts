import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // Note: In this environment, GEMINI_API_KEY is provided via the shared session or environment.
    // For local development or build, it uses VITE_ prefixed variables.
    const apiKey = 
      (process.env as any).GEMINI_API_KEY || 
      (process.env as any).VITE_GEMINI_API_KEY || 
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      (window as any).VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey.length < 10) {
      console.warn("GEMINI_API_KEY detected as missing or invalid. Please set it in Settings > Secrets.");
    }
    
    aiInstance = new GoogleGenAI({ apiKey: apiKey || "" });
  }
  return aiInstance;
}

export async function processImageToText(imageBase64: string, mimeType: string) {
  try {
    const ai = getAI();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType,
            },
          },
          {
            text: `You are an expert OCR and document analysis system for the Benishangul-Gumuz Regional Police Commission.
            The image provided is a document (handwritten or printed) related to a criminal investigation.
            
            TASK:
            1. Extract all text from the image precisely.
            2. Translate it into formal Amharic (አማርኛ) if it is in another language.
            3. Organize the text clearly (preserve paragraphs, bullet points, etc.).
            4. Preserve all names, dates, amounts, and locations.
            
            OUTPUT:
            Return ONLY the final Amharic text extracted and translated from the document.`,
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
    console.error("Gemini OCR Processing Error:", error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "OCR failed due to an unknown error.";
  }
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
