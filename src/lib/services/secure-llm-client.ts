import { GoogleGenAI } from "@google/genai";

const KNOWN_PLACEHOLDERS = new Set([
  "YOUR_GEMINI_API_KEY",
  "YOUR_GEMINI_API_KEY_HERE",
  "MY_GEMINI_API_KEY",
  "YOUR_API_KEY",
  "REPLACE_WITH_KEY",
  "YOUR_KEY_HERE"
]);

export interface LLMStatus {
  configured: boolean;
  model: string;
  provider: string;
  source: "gemini-live" | "deterministic-shield";
  message: string;
}

export class SecureLLMClient {
  private static instance: SecureLLMClient;
  private ai: GoogleGenAI | null = null;
  private primaryModel: string;
  private fallbackModel = "gemini-3.5-flash-lite";

  private constructor() {
    this.primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
    this.initClient();
  }

  public initClient(): void {
    // Explicitly prioritize GEMINI_API_KEY from .env / runtime
    let rawKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!rawKey || KNOWN_PLACEHOLDERS.has(rawKey) || rawKey.length < 10) {
      rawKey = (process.env.GOOGLE_API_KEY || "").trim();
    }
    const isPlaceholder = !rawKey || KNOWN_PLACEHOLDERS.has(rawKey) || rawKey.length < 10;

    if (!isPlaceholder) {
      // Synchronize environment keys so @google/genai SDK never collides with stale ambient system variables
      process.env.GEMINI_API_KEY = rawKey;
      process.env.GOOGLE_API_KEY = rawKey;

      this.ai = new GoogleGenAI({
        apiKey: rawKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    } else {
      this.ai = null;
    }
  }

  public static getInstance(): SecureLLMClient {
    if (!SecureLLMClient.instance) {
      SecureLLMClient.instance = new SecureLLMClient();
    }
    return SecureLLMClient.instance;
  }

  public getStatus(): LLMStatus {
    this.initClient();

    if (this.ai) {
      return {
        configured: true,
        model: this.primaryModel,
        provider: "Google Gemini (@google/genai)",
        source: "gemini-live",
        message: `Live Gemini 3.5 inference active (Primary: ${this.primaryModel})`
      };
    }

    return {
      configured: false,
      model: "none",
      provider: "Deterministic Shield Fallback",
      source: "deterministic-shield",
      message: "GEMINI_API_KEY placeholder detected. Operating in high-fidelity Deterministic Shield mode."
    };
  }

  // Pre-flight sanitization (OWASP LLM01: Prompt Injection Prevention)
  public sanitizeInput(input: string, maxLength = 3000): string {
    return input
      .slice(0, maxLength)
      .replace(/<[^>]*>?/gm, "") // Strip HTML tags
      .replace(/[{}[\]]/g, "") // Neutralize raw structural injection delimiters
      .trim();
  }

  // Post-flight inspection (OWASP LLM06: Sensitive Information Disclosure)
  public inspectOutput(text: string): string {
    const sensitivePatterns = [
      /AIza[0-9A-Za-z-_]{35}/g, // Google API Key pattern
      /sk-[a-zA-Z0-9]{32,}/g // Generic Secret key pattern
    ];
    for (const pattern of sensitivePatterns) {
      if (pattern.test(text)) {
        throw new Error("SECURITY_BREACH: Outbound response contained credentials.");
      }
    }
    return text;
  }

  public async executeStructuredPrompt(
    systemInstruction: string,
    sanitizedUserPrompt: string,
    responseSchema?: Record<string, unknown>
  ): Promise<string> {
    const sanitized = this.sanitizeInput(sanitizedUserPrompt);
    if (!this.ai) {
      this.initClient();
    }
    if (!this.ai) {
      throw new Error("GEMINI_API_UNAVAILABLE: GEMINI_API_KEY is not configured for live inference.");
    }

    const runCall = async (modelName: string): Promise<string> => {
      const generatePromise = this.ai!.models.generateContent({
        model: modelName,
        contents: sanitized,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.2,
          ...(responseSchema ? { responseSchema } : {})
        }
      });

      const abortController = new AbortController();
      let timeoutId: NodeJS.Timeout | undefined;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          abortController.abort();
          reject(new Error(`GEMINI_TIMEOUT: Request to ${modelName} exceeded 8000ms`));
        }, 8000);
      });

      try {
        const response = await Promise.race([generatePromise, timeoutPromise]);
        if (timeoutId) clearTimeout(timeoutId);
        const responseText = response.text ?? "{}";
        return this.inspectOutput(responseText);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    try {
      return await runCall(this.primaryModel);
    } catch (primaryErr) {
      const errMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      console.warn(`[Gemini LLM] Primary model ${this.primaryModel} failed (${errMsg}). Retrying with fallback ${this.fallbackModel}...`);
      try {
        return await runCall(this.fallbackModel);
      } catch (fallbackErr) {
        console.warn(`[Gemini LLM] Fallback model ${this.fallbackModel} failed:`, fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
        throw fallbackErr;
      }
    }
  }
}
