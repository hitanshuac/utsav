import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { handlePlannerRequest } from "./app/api/planner/route";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "64kb" }));

  // Secure LLM Interceptor Endpoint (/api/planner)
  app.post("/api/planner", async (req, res) => {
    try {
      const { status, data } = await handlePlannerRequest(req.body);
      res.status(status).json(data);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to process planner request"
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Celebration & Event Planner server running on http://localhost:${PORT}`);
  });
}

startServer();
