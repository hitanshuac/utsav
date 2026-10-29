# Hackathon Judges: Quick Environment Recreation & Evaluation Guide

This guide ensures judges and evaluators can reproduce, run, and verify the entire **Utsav Celebration & Wedding Coordination Command Center** environment locally in under 60 seconds.

---

## 1. Prerequisites
- **Node.js**: v18.x or v20.x+ (Recommended: Node 20 LTS)
- **Package Manager**: `npm` (v9+)
- **Git**
- *(Optional for Live AI Inference)*: A free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey). The application also includes an OWASP-compliant **Deterministic Shield Fallback** that guarantees 100% functionality even without an API key.

---

## 2. One-Minute Local Setup

```bash
# 1. Clone the repository (public repo, no auth tokens required)
git clone https://github.com/hitanshuac/utsav.git
cd utsav

# 2. Install dependencies
npm install

# 3. Setup environment file
cp .env.example .env

# 4. (Optional) Insert your Gemini API Key in .env:
# GEMINI_API_KEY="AIzaSy..."

# 5. Start the development server
npm run dev
```

The application will be live at: **`http://localhost:3000`**

---

## 3. Environment Variables Reference

| Variable | Required? | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | Optional | `""` | Gemini API key for live LLM quote auditing, trade-offs, and task parsing. |
| `GOOGLE_API_KEY` | Optional | `""` | Alternative alias for `GEMINI_API_KEY` (auto-detected). |
| `GEMINI_MODEL` | Optional | `gemini-3.8-flash` | Gemini model name. If unavailable on your key, auto-falls back to `gemini-2.5-flash`. |
| `APP_URL` | Optional | `http://localhost:3000` | Host base URL. |
| `PORT` | Optional | `3000` | Local HTTP port. |

---

## 4. Verification & Diagnostics Endpoint

To inspect your environment setup and LLM connectivity at any time:

```bash
# Verify system health and Gemini status
curl http://localhost:3000/api/health
```

Sample JSON response:
```json
{
  "status": "ok",
  "nodeVersion": "v20.x.x",
  "timestamp": "2026-10-28T...",
  "llm": {
    "configured": true,
    "model": "gemini-3.8-flash",
    "provider": "Google Gemini (@google/genai)",
    "source": "gemini-live",
    "message": "Live Gemini inference active (Primary: gemini-3.8-flash)"
  },
  "env": {
    "geminiKeyConfigured": true,
    "appUrl": "http://localhost:3000"
  }
}
```

---

## 5. Automated Test Suite (25 Tests)

To verify the deterministic math engine, topological dependency graph, RFC 5545 calendar generator, cascade delay engine, event logger, and communication services:

```bash
npm run test
```

Expected output:
```text
✓ tests/budget-math.test.ts (3 tests)
✓ tests/guest-buffer.test.ts (3 tests)
✓ tests/delay-cascade.test.ts (3 tests)
✓ tests/dependency-graph.test.ts (5 tests)
✓ tests/communication.test.ts (4 tests)
✓ tests/tminus-alert-service.test.ts (3 tests)
✓ tests/event-logger.test.ts (4 tests)

Test Files  7 passed (7)
Tests       25 passed (25)
```

---

## 6. How to Test the AI LLM Features

1. **Vendor Quote Auditor**:
   - Navigate to the **Vendor Auditor** tab.
   - Enter a rough quotation note (e.g., `Sharma Caterers: ₹650 per plate, 18% GST extra, cleaning fee Rs 5,000`).
   - Click **Audit Vendor Quote**.
   - Notice the badge: `Gemini Live` (when API key is provided) or `Deterministic Shield` (when testing offline).
   - Hidden cost clauses (unbundled 18% GST, cleaning surcharge) and negotiation questions are extracted.
2. **Strategic Budget Trade-Offs**:
   - Navigate to the **Trade-Offs** tab.
   - Click **Generate Strategic Trade-Offs** to evaluate algorithmic reallocation and AI reasoning.
3. **Task Natural Language Parser**:
   - In the **Pending Tasks Strip** or **Milestones**, type rough natural language notes (e.g., `Urgent Mandap floral setup 3 days before event`) to see instant structured extraction into category and deadline.
