/**
 * UtsavAI Server — Express Application Entry Point & Vite SSR Bridge
 */
if (!process.env.VERCEL) {
  try {
    const { config } = await import("dotenv");
    config();
  } catch (err: unknown) {
    // .env is optional; Vercel injects environment variables natively
  }
}
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { SecureLLMClient } from "./src/lib/services/secure-llm-client";
import {
  sanitizeObjectKeys,
  securityHeaders,
  validateJsonContentType
} from "./src/server/middleware";
import { registerRoutes } from "./src/server/routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export { sanitizeObjectKeys };

/**
 * Creates and configures the Express application with security middleware and routes.
 */
export function createApp(): express.Express {
  const app = express();
  const port = Number(process.env.APP_PORT || process.env.PORT) || 3000;

  // Strict Request Body Limit (OWASP ASVS)
  app.use(express.json({ limit: "16kb" }));

  // Recursive Prototype Pollution Sanitizer
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObjectKeys(req.body);
    }
    next();
  });

  // Hardened HTTP Security Headers & Media Guard
  app.use(securityHeaders);
  app.use("/api", validateJsonContentType);

  // Register Core REST Endpoints
  registerRoutes(app, port);

  return app;
}

const app = createApp();
const PORT = Number(process.env.APP_PORT || process.env.PORT) || 3000;

/**
 * Starts the HTTP server and mounts Vite dev middleware in local development.
 */
export async function startServer() {
  if (process.env.VERCEL === "1") {
    return app;
  }
  const distPath = path.join(__dirname, "dist");
  const distAssetsPath = path.join(distPath, "assets");
  if (process.env.NODE_ENV === "production" && fs.existsSync(distAssetsPath)) {
    app.use("/assets", express.static(distAssetsPath, { maxAge: "1d" }));
  }

  if (process.env.NODE_ENV !== "production") {
    const vitePkg = "vite";
    const { createServer: createViteServer } = await import(/* @vite-ignore */ vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: unknown) {
        if (e instanceof Error) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  process.on("uncaughtException", (err: Error) => {
    console.error("[Server Process Guard] Caught uncaughtException:", err.message);
  });
  process.on("unhandledRejection", (reason: unknown) => {
    console.error("[Server Process Guard] Caught unhandledRejection:", reason);
  });

  return app.listen(PORT, "0.0.0.0", () => {
    const status = SecureLLMClient.getInstance().getStatus();
    console.log("=======================================================");
    console.log(` UtsavAI Celebration & Event Planner Server running on http://localhost:${PORT}`);
    console.log(` Health & Diagnostics: http://localhost:${PORT}/api/health`);
    console.log(` Rebalance Endpoint: POST http://localhost:${PORT}/api/rebalance`);
    console.log(` Vendor Auditor Endpoint: POST http://localhost:${PORT}/api/audit-vendor`);
    console.log(` Gemini AI Status: ${status.message}`);
    console.log("=======================================================");
  });
}

const isDirectRun = Boolean(
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
   process.argv[1].endsWith("server.ts"))
);

if (process.env.VERCEL !== "1" && process.env.NODE_ENV !== "test" && isDirectRun) {
  startServer();
}

export { app };
export default app;
