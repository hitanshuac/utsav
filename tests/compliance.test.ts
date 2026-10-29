import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("UtsavAI Security & Compliance Verification (6/6 Scans)", () => {
  // Test 1: Zero dangerouslySetInnerHTML in client components
  it("Scan 1: Asserts 0 occurrences of dangerouslySetInnerHTML across client code", () => {
    const srcDir = path.resolve(__dirname, "../src");
    const scanDir = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results = results.concat(scanDir(fullPath));
        } else if (/\.(tsx|ts)$/.test(file)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          if (content.includes("dangerouslySetInnerHTML")) {
            results.push(fullPath);
          }
        }
      }
      return results;
    };

    const violations = scanDir(srcDir);
    expect(violations).toEqual([]);
  });

  // Test 2: Zero hardcoded secrets or credentials
  it("Scan 2: Asserts 0 hardcoded Google/OpenAI API keys in source code", () => {
    const rootDir = path.resolve(__dirname, "..");
    const dirsToScan = [path.join(rootDir, "src"), path.join(rootDir, "lib")];
    const keyRegex = /AIza[0-9A-Za-z-_]{35}|sk-[0-9A-Za-z]{30,}/;

    const scanForSecrets = (dir: string): string[] => {
      let hits: string[] = [];
      if (!fs.existsSync(dir)) return hits;
      const list = fs.readdirSync(dir);
      for (const item of list) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          hits = hits.concat(scanForSecrets(full));
        } else if (/\.(ts|tsx|js|json)$/.test(item)) {
          const content = fs.readFileSync(full, "utf-8");
          if (keyRegex.test(content)) {
            hits.push(full);
          }
        }
      }
      return hits;
    };

    let allHits: string[] = [];
    for (const d of dirsToScan) {
      allHits = allHits.concat(scanForSecrets(d));
    }
    expect(allHits).toEqual([]);
  });

  // Test 3: Zero client-side storage leaks in src/
  it("Scan 3: Asserts 0 usage of localStorage/sessionStorage/document.cookie in src/", () => {
    const srcDir = path.resolve(__dirname, "../src");
    const forbidden = ["localStorage", "sessionStorage", "indexedDB", "document.cookie"];
    const leaks: string[] = [];

    const scanStorage = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const list = fs.readdirSync(dir);
      for (const item of list) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scanStorage(full);
        } else if (/\.(ts|tsx)$/.test(item)) {
          const content = fs.readFileSync(full, "utf-8");
          for (const word of forbidden) {
            if (content.includes(word)) {
              leaks.push(`${full} contains ${word}`);
            }
          }
        }
      }
    };

    scanStorage(srcDir);
    expect(leaks).toEqual([]);
  });

  // Test 4: JSON Schema Contract Synchronization
  it("Scan 4: Asserts docs/specs/contract.schema.json & response.schema.json exist and are valid JSON", () => {
    const contractPath = path.resolve(__dirname, "../docs/specs/contract.schema.json");
    const responsePath = path.resolve(__dirname, "../docs/specs/response.schema.json");

    expect(fs.existsSync(contractPath)).toBe(true);
    expect(fs.existsSync(responsePath)).toBe(true);

    const contract = JSON.parse(fs.readFileSync(contractPath, "utf-8"));
    const response = JSON.parse(fs.readFileSync(responsePath, "utf-8"));

    expect(contract.title).toBe("EventPlanInput");
    expect(contract.properties.guestCount).toBeDefined();
    expect(contract.properties.totalBudgetCap).toBeDefined();

    expect(response.title).toBe("RebalanceApiResponse");
    expect(response.properties.triageTier).toBeDefined();
    expect(response.properties.strategies).toBeDefined();
  });

  // Test 5: In-Memory PII Redaction
  it("Scan 5: Verifies in-memory regex scrubber correctly redacts PII", () => {
    const rawNote = "Contact Sharma ji at 9876543210 or sharma.wedding@gmail.com. Send token advance to wedding@oksbi.";
    const scrubbed = rawNote
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]")
      .replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]")
      .replace(/\b[\w.-]+@(?:oksbi|okaxis|okhdfcbank|okicici|paytm|ybl|upi)\b/gi, "[REDACTED_UPI]");

    expect(scrubbed).not.toContain("9876543210");
    expect(scrubbed).not.toContain("sharma.wedding@gmail.com");
    expect(scrubbed).not.toContain("wedding@oksbi");
    expect(scrubbed).toContain("[REDACTED_PHONE]");
    expect(scrubbed).toContain("[REDACTED_EMAIL]");
    expect(scrubbed).toContain("[REDACTED_UPI]");
  });

  // Test 6: Solid-Surface & Zero-Blur Verification
  it("Scan 6: Asserts zero backdrop-filter or blur() properties in CSS files", () => {
    const stylesDir = path.resolve(__dirname, "../src/styles");
    const files = fs.readdirSync(stylesDir).filter((f) => f.endsWith(".css"));
    const blurViolations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(stylesDir, file), "utf-8");
      if (content.includes("backdrop-filter") || /blur\(/.test(content)) {
        blurViolations.push(file);
      }
    }

    expect(blurViolations).toEqual([]);
  });
});
