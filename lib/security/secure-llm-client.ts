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
  private fallbackModel = "gemini-2.5-flash";

  private constructor() {
    this.primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
    this.initClient();
  }

  private initClient(): void {
    const rawKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
    const isPlaceholder = !rawKey || KNOWN_PLACEHOLDERS.has(rawKey) || rawKey.length < 10;

    if (!isPlaceholder) {
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
    // Re-check in case .env was modified at runtime
    if (!this.ai) {
      this.initClient();
    }

    if (this.ai) {
      return {
        configured: true,
        model: this.primaryModel,
        provider: "Google Gemini (@google/genai)",
        source: "gemini-live",
        message: `Live Gemini inference active (Primary: ${this.primaryModel})`
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
  public sanitizeInput(input: string, maxLength = 800): string {
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

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`GEMINI_TIMEOUT: Request to ${modelName} exceeded 15000ms`)), 15000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const responseText = response.text ?? "{}";
      return this.inspectOutput(responseText);
    };

    try {
      return await runCall(this.primaryModel);
    } catch (primaryErr) {
      // If primary model returns 404 or unsupported on the user's specific tier, attempt standard fallback model
      const errMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      if (errMsg.includes("404") || errMsg.includes("NOT_FOUND") || errMsg.includes("unsupported")) {
        console.warn(`[Gemini LLM] Primary model ${this.primaryModel} failed (${errMsg}). Retrying with fallback ${this.fallbackModel}...`);
        return await runCall(this.fallbackModel);
      }
      throw primaryErr;
    }
  }
}
