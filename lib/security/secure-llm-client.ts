import { GoogleGenAI } from "@google/genai";

export class SecureLLMClient {
  private static instance: SecureLLMClient;
  private ai: GoogleGenAI | null = null;
  private modelName = "gemini-3.8-flash";

  private constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim().length > 0) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
  }

  public static getInstance(): SecureLLMClient {
    if (!SecureLLMClient.instance) {
      SecureLLMClient.instance = new SecureLLMClient();
    }
    return SecureLLMClient.instance;
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
      throw new Error("GEMINI_API_UNAVAILABLE: GEMINI_API_KEY is not configured for live inference.");
    }

    const generatePromise = this.ai.models.generateContent({
      model: this.modelName,
      contents: sanitized,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2,
        ...(responseSchema ? { responseSchema } : {})
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("GEMINI_TIMEOUT: Request exceeded 4000ms")), 4000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const responseText = response.text ?? "{}";
    return this.inspectOutput(responseText);
  }
}
