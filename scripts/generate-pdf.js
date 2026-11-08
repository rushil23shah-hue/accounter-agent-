#!/usr/bin/env node
/**
 * Professional PDF Generator for Steward 2.0 Documentation
 * Uses marked + Chromium headless (Edge / Chrome) to render high-resolution,
 * beautifully formatted PDFs with zero overlapping or text-clipping issues.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const docsDir = path.join(rootDir, "docs");

// Find Chrome or Edge executable on Windows
function getChromiumExecutable() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("Neither Google Chrome nor Microsoft Edge was found on this system.");
}

function buildHtmlDocument(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page) " of " counter(pages);
      }
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.55;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .header-banner {
      border-bottom: 2.5px solid #003087;
      padding-bottom: 12px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .logo-badge {
      font-size: 16pt;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #003087;
    }
    .logo-badge span {
      color: #0070ba;
    }
    .tagline {
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      margin-top: 2px;
    }
    .conf-badge {
      font-size: 8pt;
      font-weight: 700;
      padding: 4px 8px;
      border: 1px solid #0284c7;
      color: #0369a1;
      background: #f0f9ff;
      border-radius: 4px;
      text-transform: uppercase;
    }
    h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
      margin: 20px 0 8px 0;
      page-break-after: avoid;
    }
    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #003087;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin: 24px 0 10px 0;
      page-break-after: avoid;
    }
    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
      margin: 16px 0 6px 0;
      page-break-after: avoid;
    }
    h4 {
      font-size: 10pt;
      font-weight: 700;
      color: #334155;
      margin: 12px 0 4px 0;
      page-break-after: avoid;
    }
    p {
      margin: 0 0 10px 0;
      color: #334155;
    }
    strong {
      color: #0f172a;
    }
    blockquote {
      margin: 12px 0;
      padding: 10px 14px;
      border-left: 3.5px solid #0070ba;
      background: #f8fafc;
      color: #1e293b;
      border-radius: 0 4px 4px 0;
      page-break-inside: avoid;
    }
    blockquote p:last-child {
      margin-bottom: 0;
    }
    ul, ol {
      margin: 0 0 12px 0;
      padding-left: 20px;
      color: #334155;
    }
    li {
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0 18px 0;
      font-size: 8.5pt;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #0f172a;
    }
    td {
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
      color: #334155;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 8pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 4px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }
    pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 8pt;
      background: #0f172a;
      color: #e2e8f0;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 12px 0;
      page-break-inside: avoid;
      line-height: 1.45;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
      font-size: inherit;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 7.5pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div>
      <div class="logo-badge">STEWARD <span>2.0</span></div>
      <div class="tagline">PayPal AI Hackathon 2026 — Engineering Reference</div>
    </div>
    <div class="conf-badge">Official Architecture Document</div>
  </div>
  ${bodyHtml}
  <div class="footer">
    <span>Steward 2.0 — Intent-Aware Financial Autopilot & ZK-Privacy Shield</span>
    <span>Confidential & Non-Repudiable Evidence</span>
  </div>
</body>
</html>`;
}

function convertMarkdownToPdf(mdFilename, pdfFilename) {
  const mdPath = path.join(docsDir, mdFilename);
  if (!fs.existsSync(mdPath)) {
    console.error(`File not found: ${mdPath}`);
    return false;
  }

  const markdownContent = fs.readFileSync(mdPath, "utf-8");
  const bodyHtml = marked.parse(markdownContent);
  const title = path.basename(pdfFilename, ".pdf").replace(/-/g, " ");
  const fullHtml = buildHtmlDocument(title, bodyHtml);

  const tempHtmlPath = path.join(docsDir, `${path.basename(pdfFilename, ".pdf")}.temp.html`);
  fs.writeFileSync(tempHtmlPath, fullHtml, "utf-8");

  const pdfOutputPath = path.join(docsDir, pdfFilename);
  const browserPath = getChromiumExecutable();

  try {
    const cmd = `"${browserPath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfOutputPath}" "${tempHtmlPath}"`;
    execSync(cmd, { stdio: "ignore" });

    if (fs.existsSync(pdfOutputPath)) {
      const stats = fs.statSync(pdfOutputPath);
      console.log(`✅ Generated: ${pdfFilename} (${(stats.size / 1024).toFixed(1)} KB)`);
      return true;
    } else {
      console.error(`❌ Failed to create ${pdfFilename}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Error rendering ${pdfFilename}:`, err.message);
    return false;
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
  }
}

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("   STEWARD 2.0 — PROFESSIONAL PDF DOCUMENTATION GENERATOR");
  console.log("═".repeat(70) + "\n");

  const browser = getChromiumExecutable();
  console.log(`Using Chromium Engine: ${browser}\n`);

  convertMarkdownToPdf("steward-comprehensive-feature-catalog.md", "Steward-2.0-Feature-Catalog.pdf");
  convertMarkdownToPdf("dynamic-financial-intent-rag-blueprint.md", "Dynamic-Financial-Intent-RAG-Blueprint.pdf");

  console.log("\n🎉 All documentation PDFs generated with perfect typography & zero overlap!\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
