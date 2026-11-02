/**
 * UtsavAI Server Middleware — OWASP ASVS Hardening, Rate Limiting & Zero-PII Sanitization
 */
import { Request, Response, NextFunction } from "express";

// In-memory sliding window rate limiter (15 requests/minute per IP)
const requestRateMap = new Map<string, number[]>();

/**
 * Sliding window in-memory rate limiter enforcing maximum 15 requests/min per IP.
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim()
      : Array.isArray(forwarded)
      ? forwarded[0]
      : null) ||
    req.ip ||
    req.socket?.remoteAddress ||
    "127.0.0.1";
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 15;

  const timestamps = (requestRateMap.get(ip) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    res.status(429).json({
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many rebalance/audit requests. Please wait 1 minute before retrying."
    });
    return;
  }
  timestamps.push(now);
  requestRateMap.set(ip, timestamps);
  next();
}

/**
 * Redacts personal identifiers (emails, phone numbers, UPI IDs, account numbers) in memory.
 */
export function scrubPii(text: string): string {
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]")
    .replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]")
    .replace(/\b[\w.-]+@(?:oksbi|okaxis|okhdfcbank|okicici|paytm|ybl|upi)\b/gi, "[REDACTED_UPI]")
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{0,4}\b/g, "[REDACTED_ACCOUNT]");
}

/**
 * Recursive Prototype Pollution Sanitizer (OWASP Top 10) with zero 'any' types.
 */
export function sanitizeObjectKeys<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectKeys) as unknown as T;
  }
  const clean: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    clean[key] = sanitizeObjectKeys(record[key]);
  }
  for (const key of Object.getOwnPropertyNames(record)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      delete clean[key];
    }
  }
  return clean as T;
}

/**
 * Hardened HTTP Security Headers conforming to OWASP ASVS v4.0.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  const isDev = process.env.NODE_ENV !== "production";
  const csp = isDev
    ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://generativelanguage.googleapis.com ws: wss: http: https:;"
    : "default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; script-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com;";
  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  if (req.path.startsWith("/assets/")) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }
  next();
}

/**
 * 415 Unsupported Media Type validation on POST /api/* endpoints.
 */
export function validateJsonContentType(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "POST" && !req.is("application/json")) {
    res.status(415).json({
      error: "UnsupportedMediaType",
      message: "Expected application/json payload"
    });
    return;
  }
  next();
}
