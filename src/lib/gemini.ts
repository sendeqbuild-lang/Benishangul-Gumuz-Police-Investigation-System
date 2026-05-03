import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // Priority order for API Keys:
    // 1. process.env.GEMINI_API_KEY (Set via platform Secrets)
    // 2. VITE_ prefixed keys (Standard for client-side)
    const apiKey = 
      (process.env as any).GEMINI_API_KEY || 
      (import.meta as any).env?.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey.length < 10) {
      console.error("Gemini API Key is missing.");
      throw new Error("MISSING_API_KEY");
    }
    
    aiInstance = new GoogleGenAI({ apiKey: apiKey });
  }
  return aiInstance;
}

export async function processImageToText(imageBase64: string, mimeType: string) {
  try {
    const ai = getAI() as any;
    
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
            The image provided is a document (handwritten or printed) related to a criminal investigation in Ethiopia.
            
            TASK:
            1. Extract all text from the image precisely.
            2. Output the result in formal, polished Amharic (አማርኛ) only. Use correct Ethiopic punctuation and characters (e.g., ፣ ፣ ።).
            3. Organize the text clearly (preserve paragraphs, bullet points, etc.).
            4. Preserve all names, dates, amounts, and locations exactly as they appear.
            5. Ensure the text flows naturally and is grammatically perfect in Amharic.
            
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
  } catch (error: any) {
    console.error("Gemini OCR Processing Error:", error);
    const errorString = error?.message || String(error);
    if (errorString === "MISSING_API_KEY") throw error;
    if (errorString.includes("API key not valid") || errorString.includes("API_KEY_INVALID")) {
      throw new Error("INVALID_API_KEY");
    }
    throw error;
  }
}

export async function transcribeAndTranslateAudio(audioBase64: string, mimeType: string, sourceLanguage: string) {
  try {
    const ai = getAI() as any;
    
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
            text: `You are a high-level official state transcriber for the Benishangul-Gumuz Regional Police Commission.
            The audio provided is a formal police statement or interview.
            
            SOURCE LANGUAGE: ${sourceLanguage}
            TARGET LANGUAGE: Amharic (አማርኛ)
            
            CRITICAL VERBATIM REQUIREMENTS (STRICT):
            1. 100% VERBATIM ACCURACY: You MUST transcribe every single word exactly as it is spoken in the audio. 
            2. ZERO SUMMARIZATION: Do NOT summarize, do NOT shorten, and do NOT paraphrase. Even if there are repetitions or stutters, transcribe it exactly to maintain legal integrity.
            3. ZERO ADDITIONS: Do NOT add any context, thoughts, or information that is not explicitly in the audio.
            4. FORMAL POLICE FORMAT: 
               - [መርማሪ]: For Investigator speech
               - [ቃል ሰጪ]: For Subject/Witness speech
            5. PUNCTUATION: Use correct Ge'ez punctuation markers (።, ፣) at appropriate grammatical breaks.
            
            If the audio is in ${sourceLanguage}, translate it to Amharic while maintaining 100% of the original content length and meaning.
            
            OUTPUT:
            Return ONLY the final Amharic transcription text. Do not include introductory notes, concluding remarks, or metadata.`,
          },
        ],
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return text.trim();
  } catch (error: any) {
    console.error("Gemini AI Processing Error:", error);
    const errorString = error?.message || String(error);
    if (errorString === "MISSING_API_KEY") throw error;
    if (errorString.includes("API key not valid") || errorString.includes("API_KEY_INVALID")) {
      throw new Error("INVALID_API_KEY");
    }
    throw error;
  }
}
