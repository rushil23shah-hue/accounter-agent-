# AgenticPay

### The Intent-Aware Agentic Financial Autopilot for Small Businesses
*Zero-Knowledge Financial Privacy • Google Gemini 3.8 Flash Failover Pool • 5-Day Autonomous Swarm • Pre-Flight Security Shield • Zero-Touch Doorstep Commerce on PayPal*

---

## Overview

**AgenticPay** acts as an autonomous, privacy-preserving Chief Financial Officer for small businesses. It learns daily inventory burn rates, scouts dark-stores and wholesale suppliers for optimal pricing, and executes zero-touch restocking through dynamic PayPal mandates—all while keeping sensitive business financials locked behind an on-device Zero-Knowledge (ZK) Vault and neutralizing adversarial prompt injections before a single dollar moves.

From a single natural-language merchant request such as:

> *"Sales of matcha have increased. Reorder without risking payroll."*

AgenticPay coordinates multi-agent intelligence, mathematical solvency verification, and PayPal authorization escrow to deliver end-to-end commerce with complete peace of mind.

---

## Repository Structure

```
accounter-agent-/
├── docs/                                  # Specifications and architectural blueprints
├── images/                                # Brand emblems and visual assets
├── scripts/                               # Verification suites and benchmark runners
│   ├── run-all-tests.ts                   # Master 9-phase compliance runner
│   ├── run-benchmark.ts                   # 65-case red-team security benchmark
│   ├── run-100-global-benchmark.ts        # 100-topic intent-RAG benchmark
│   ├── verify-swarm-5day.ts               # Multi-agent swarm verification
│   └── live-sandbox.ts                    # Live PayPal Sandbox verification
├── src/
│   ├── contracts/                         # Zod domain schemas (delivery, swarm, mandates)
│   ├── engines/                           # Core business logic & AI orchestration
│   │   ├── gemini-client.ts               # Gemini 3.8 Flash pool & failover manager
│   │   ├── autonomous-purchase-engine.ts  # Zero-touch doorstep commerce & order routing
│   │   ├── swarm-orchestrator.ts          # 5-day multi-agent DAG engine
│   │   ├── business-heartbeat.ts          # Operations heartbeat & velocity tracker
│   │   ├── vector-memory.ts               # Long-term semantic supplier memory
│   │   ├── taint-engine.ts                # Inbound security shield & injection detector
│   │   └── zk-vault.ts                    # Local zero-knowledge solvency verifier
│   ├── mcp/                               # Model Context Protocol STDIO server
│   ├── paypal/                            # Native PayPal Orders v2 & Payouts client
│   └── server/
│       ├── app.ts                         # Express application & API endpoints
│       └── ui.html                        # AgenticPay interactive luxury UI
├── package.json
└── tsconfig.json
```

---

## Core Capabilities & Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   LAYER 1: CONFIDENTIAL ZK-VAULT & DYNAMIC MANDATES                    │
│  • On-Device Private Financial Ledger (Cash balance, margins, and payroll floors)      │
│  • Local ZK-Constraint Solver (Solvency proofs: [Liquid Cash - Order] >= Cash Floor)   │
│  • Dynamic Adaptive Mandates (Asymmetric spend limits that expand/contract with sales) │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Blinded Boolean Clearances
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             LAYER 2: GOOGLE GEMINI 3.8 FLASH POOL & DYNAMIC INTENT-RAG                 │
│  • 4-Key Round-Robin Failover Rotation Pool (Zero downtime, instant quota failover)    │
│  • Universal Intent Grounding (/api/rag/ground) across 100+ global commercial topics   │
│  • Multi-Factor Sourcing Rationale & Natural Language Intent Parsing                   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Structured Restock Intent
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│           LAYER 3: 5-DAY AUTONOMOUS SWARM & OPERATIONS DIRECTOR (JARVIS)               │
│  • Multi-Agent Collaborative DAG Orchestrator & Event Bus                              │
│  • Continuous Business Heartbeat & Daily Sales Velocity Forecasting (EMA)              │
│  • Long-Term Vector Memory for Supplier Track Records & Price Fluctuations             │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Verified Sourcing Plan
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│              LAYER 4: PRE-FLIGHT INBOUND PAYMENT SECURITY SHIELD                       │
│  • Taint Isolator & Quarantined Data Envelope for untrusted external inputs            │
│  • Multi-Vector Prompt Injection & Jailbreak Scanner (65-test red-team benchmark)      │
│  • Strict Whitelist Payee Validation & Parameter Anomaly Detection                     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Sanitized Order Payload
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             LAYER 5: PAYPAL AUTONOMOUS COMMERCE & 60-SECOND UNDO WINDOW                │
│  • PayPal Orders v2 API (intent: AUTHORIZE escrow hold)                                │
│  • Active 60-Second Reversibility Window with 1-Tap Void (Zero Fees)                   │
│  • Zero-Touch Doorstep Commerce: Dark-store routing (Blinkit/Zepto), Rider & ETA       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Execution Receipt & Cryptographic Hash
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                  LAYER 6: EXPLAINABLE WHY-TRAIL & DISPUTE DOSSIER                      │
│  • Cryptographic SHA-256 Decision Ledger for non-repudiable auditability               │
│  • 1-Click Printable Dispute Dossier for the PayPal Resolution Center                  │
│  • Instant Emergency Stop Kill Switch                                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Google Gemini 3.8 Flash with 4-Key Failover Rotation Pool
AgenticPay integrates Google’s state-of-the-art **Gemini 3.8 Flash** model (`gemini-3.8-flash`) for dynamic prompt parsing, universal intent grounding, and sourcing rationale generation. To guarantee uninterrupted production availability, the system implements an automated **4-key round-robin rotation pool**:
- Seamlessly distributes requests across API keys.
- Catches quota exhaustion and transient errors, automatically failing over to the next healthy key.
- Surfaces active key pool health and rationale metrics directly in the commerce dashboard.

### 2. Zero-Touch Doorstep Commerce & Live Delivery Routing
Beyond traditional procurement, AgenticPay connects directly to hyperlocal dark-stores (e.g. Blinkit, Zepto) and regional wholesale partners:
- Translates natural-language intents into granular item quantities and specifications.
- Dispatches orders with dynamic dark-store selection, live rider assignment, and simulated minute-by-minute ETA progression.
- Backed by address profile management and live cash reconciliation with the ZK-Vault.

### 3. 5-Day Autonomous Swarm & Operations Director (Jarvis)
A Jarvis-grade multi-agent Directed Acyclic Graph (DAG) engine that simulates and automates 5 consecutive business days of operational oversight:
- **Operations Director Agent**: Coordinates sub-agents, arbitrates conflicting priorities, and reports operational health.
- **Agent Event Bus**: Enables asynchronous message passing between demand forecasters, inventory monitors, and pricing scouts.
- **Vector Memory**: Retains supplier reliability history, pricing shifts, and past dispute resolutions.

### 4. Zero-Knowledge (ZK) Confidential Financial Vault
Business owners never have to expose their sensitive bank balances, revenue numbers, or supplier margins to cloud LLMs:
- All sensitive financial ledgers remain stored locally on the merchant's machine.
- Local ZK-constraint algorithms verify financial invariant rules (e.g., `(Liquid Cash - Order Cost) >= Reserved Cash Floor` and `Projected Runway >= 30 Days`).
- Cloud agents receive only blinded boolean clearances (`budget_clearance_granted: true`).

### 5. Pre-Flight Inbound Payment Security Shield
Empowering AI agents to transact online introduces prompt injection and fraudulent payee vulnerabilities. AgenticPay’s shield sanitizes all external inputs:
- Quarantines incoming supplier memos and scrape payloads in isolated data envelopes.
- Neutralizes prompt injection, delimiter collisions, and instruction overrides (validated against a 65-case red-team adversarial benchmark).
- Enforces strict payee whitelisting to block rogue recipient tampering.

### 6. PayPal Autonomous Escrow & The 60-Second Undo Window
- Uses PayPal Orders v2 API with `intent: AUTHORIZE`.
- Funds are placed in authorization escrow, triggering a prominent **Active 60-Second Undo Window**.
- Merchants can cancel any automated order with a single click (**1-Tap Void with zero merchant fees**).
- Once the timer expires, the payment auto-captures cleanly.

### 7. MCP Server (Model Context Protocol) Integration
AgenticPay exposes its core financial verification and payment tools via an official **MCP STDIO server** (JSON-RPC 2.0), allowing external agents (such as Claude Desktop, Cursor, or custom multi-agent frameworks) to safely interact with AgenticPay's tools:
- `agenticpay_inspect_payment`
- `agenticpay_evaluate_mandate`
- `agenticpay_scout_wholesale`
- `agenticpay_web_price_compare`
- `agenticpay_simulate_undo_hold`

---

## Quickstart & Setup

### Prerequisites

- **Node.js**: 20.6+ (required for native `--env-file`) or 22+ / 24+
- **npm**: 9+
- Modern web browser (Chrome, Edge, Firefox, Safari)

### 1. Clone & Install

```bash
git clone https://github.com/rushil23shah-hue/accounter-agent-.git
cd accounter-agent-
npm install
```

### 2. Configure Environment Variables (Optional)

Create a `.env` file in the project root:

```env
# PayPal Sandbox Configuration
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_CURRENCY=USD
PAYPAL_PAYOUT_TO=your_sandbox_account_email
PAYPAL_PAYEE_EMAIL=your_sandbox_payee_email
PAYPAL_WEBHOOK_ID=your_sandbox_webhook_id

# Google Gemini API Keys (Single key or 4-Key Failover Pool)
GEMINI_API_KEY=your_primary_gemini_api_key
GEMINI_API_KEY_1=your_gemini_key_1
GEMINI_API_KEY_2=your_gemini_key_2
GEMINI_API_KEY_3=your_gemini_key_3
GEMINI_API_KEY_4=your_gemini_key_4

# Server Configuration
PORT=3000
```

> **Note:** AgenticPay runs in **MOCK mode by default**. You can test every dashboard feature, ZK calculation, and payment flow out of the box without real API credentials.

### 3. Run the Development Server

```bash
npm run dev
# or: npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

### 4. Run the Full Verification Suite

Execute the master compliance test runner covering all 9 test stages:

```bash
npm test
```

| Stage | Verification Scope | Command |
|---|---|---|
| **Stage 1** | Domain Contracts & Zod Type Invariants | `npm run verify:m1` |
| **Stage 2** | Core Execution Engines (Taint, Inventory, Autonomy) | `npm run verify:m2` |
| **Stage 3** | Native PayPal v2 Integration (Orders, Undo, Payouts) | `npm run verify:m3` |
| **Stage 4** | ZK-Vault & Autopilot Orchestrator | `npm run verify:m4` |
| **Stage 5** | 65-Case Red-Team Adversarial Security Benchmark | `npm run benchmark` |
| **Stage 6** | Dynamic Intent-RAG (100 Global Topics Benchmark) | `npm run verify:rag` |
| **Stage 7** | Autonomous Price Sentinel & Sniper Engine | `npm run verify:sentinel` |
| **Stage 8** | Agentic UPI AutoPay Mandate Protocol | `npm run verify:upi` |
| **Stage 9** | 5-Day Autonomous Swarm & Operations Director | `npm run verify:swarm` |

### 5. Run Live PayPal Sandbox Verification

To execute live transactions against PayPal Sandbox:

```bash
npm run live:m3
```

### 6. Connect to Claude Desktop or Cursor via MCP

Start the standalone MCP server:

```bash
npm run mcp
```

To configure Claude Desktop or Cursor, add this entry to your client configuration:

```json
{
  "mcpServers": {
    "agenticpay": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/absolute/path/to/accounter-agent-"
    }
  }
}
```

---

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.
