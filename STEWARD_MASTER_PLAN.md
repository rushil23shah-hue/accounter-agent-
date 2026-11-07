# Steward 2.0: The Intent-Aware Agentic Financial Autopilot
### *Zero-Knowledge Financial Privacy, Pre-Flight Security Shield & Autonomous Zero-Touch Commerce on PayPal*
**PayPal AI Hackathon 2026 — Master Specification & Implementation Roadmap**

---

## 1. Executive Summary & Core Pitch

### The One-Line Pitch
> **Steward is an autonomous, privacy-preserving financial autopilot that acts like a human CFO for small businesses—learning inventory consumption rhythms, scouting the web for the best wholesale deals, and executing zero-touch restocking via dynamic PayPal mandates—all while protecting business financials behind a Zero-Knowledge Confidential Vault and neutralizing prompt injections through a Pre-Flight Payment Security Shield.**

### The Problem It Solves
1. **The Small Business Reordering Nightmare**: Online sellers (e.g. specialty food, tea shops, beauty brands, craft retailers) spend 10+ hours a week juggling inventory spreadsheets. They either over-order and lock up critical cash, or under-order and lose sales to stockouts.
2. **Dumb, Static AutoPay / Mandates**: Existing automated payments (like basic recurring charges or debit caps) are rigid numbers. They cannot adapt to seasonality, sudden sales spikes, or cash dips.
3. **The AI Financial Privacy Crisis**: Business owners refuse to connect bank accounts and margins to cloud LLMs because sensitive balances, profit margins, and cash flow data leak into AI training sets and third-party logs.
4. **The Prompt Injection & Rogue Wallet Vulnerability**: Autonomous agents empowered to browse the web and buy stock can be easily tricked by malicious webpages, fake invoices, and hidden prompt injections into draining funds or paying fraudulent accounts.

---

## 2. The Complete 6-Layer System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               LAYER 1: CONFIDENTIAL ZK-VAULT & DYNAMIC MANDATE (ON-DEVICE)             │
│                                                                                        │
│  • Private Financial Ledger (Liquid Cash, Sales Velocity, Margins)                     │
│  • Local ZK-Constraint Verifier (Solvency, Cash Floor, Runway Checks)                  │
│  • Dynamic Adaptive Mandate ("Smart UPI AutoPay" style delegated spend)                │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Blinded Proof & Inventory Need
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   LAYER 2: ADAPTIVE CONSUMPTION & USAGE FORECASTER                     │
│                                                                                        │
│  • Daily Burn Velocity Tracking (Exponential Moving Average EMA)                       │
│  • Demand Anomaly & Spike Detector (Weekend surges, weather/seasonal shifts)           │
│  • Dynamic Next-Month Batch Tailoring (Sizes exact order to prevent stockouts)         │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Target Batch Size
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   LAYER 3: BLIND WHOLESALE DEAL SCOUT & COMPARISON                     │
│                                                                                        │
│  • Blind Market Query Engine (Anonymizes buyer identity)                               │
│  • Multi-Vendor Price & Discount Comparator (Unit cost, volume tiers, shipping)        │
│  • Optimal Deal Selector (Balances price vs lead time vs supplier trust)              │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Selected Wholesale Deal
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   LAYER 4: PRE-FLIGHT INBOUND PAYMENT SECURITY SHIELD                  │
│                                                                                        │
│  • Taint Isolator & Data Envelope (Quarantines untrusted text as literal JSON)         │
│  • Prompt Injection & Jailbreak Scanner (Detects hidden overrides & markdown exploits) │
│  • Payee & Parameter Sanitizer (Enforces whitelist, flags price/quantity anomalies)    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Clean & Verified Action
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   LAYER 5: PAYPAL AUTONOMOUS PAYMENT GATE                              │
│                                                                                        │
│  • PayPal Orders v2 API (intent: AUTHORIZE)                                            │
│  • Active 60-Second Undo Window (Reversible hold before capture)                       │
│  • One-Tap Instant Void or Auto-Capture upon Expiry                                    │
│  • PayPal Payouts API (Batch vendor disbursements)                                     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Execution Receipt
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   LAYER 6: EXPLAINABLE TRUST & DISPUTE DOSSIER                         │
│                                                                                        │
│  • Earned Autonomy Engine (Tier 0 Suggest ➔ Tier 1 One-Tap ➔ Tier 2 Autonomous)       │
│  • Non-Repudiable Why-Trail (Cryptographic SHA-256 decision ledger)                    │
│  • 1-Click PayPal Resolution Center Dispute Dossier                                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Breakthrough Features & Innovations

### 1. The Zero-Knowledge (ZK) Confidential Financial Vault
* **How It Works**: All sensitive financial records (actual bank balance, revenue numbers, supplier margins, private runway) are stored **locally inside the merchant's secure vault**.
* **Zero Cloud Leakage**: The cloud AI agent never receives the merchant's balance sheet. 
* **ZK-Constraint Proofs**: The local vault solves mathematical constraints:
  $$\text{Is } (\text{Current Cash} - \text{Order Cost}) \ge \text{Reserved Cash Floor}? \implies \text{TRUE}$$
  $$\text{Is Projected Post-Order Runway} \ge \text{Target Days}? \implies \text{TRUE}$$
* **Blinded Payload**: The external LLM receives only verified boolean clearances (`budget_clearance_granted: true`), completely shielding the business from AI training leaks.

### 2. Dynamic Agentic Mandate ("Smart UPI AutoPay" for PayPal)
* Instead of a static ceiling, the owner authorizes an **Adaptive Intent Mandate**:
  * *"Keep my business stocked with bestsellers, preserve at least 30 days of runway, and spend within my monthly sales velocity."*
* When revenue rises, the allowable batch size flexes upward to capture bulk wholesale discounts.
* When sales slow, the mandate automatically contracts to protect cash reserves.
* **The Asymmetric Invariant**: The AI can autonomously tighten limits during slow periods, but **can never loosen limits** beyond the owner's authorized ceiling.

### 3. Adaptive Consumption & Next-Month Order Tailoring
* Learns daily burn rates using an Exponential Moving Average (EMA).
* Detects demand shifts (e.g. Earl Grey sales jumping from 4 tins/day to 7 tins/day).
* Automatically calculates:
  $$\text{Safety Stock} = \text{Lead Time} \times \text{Daily Velocity} + \text{Buffer}$$
  $$\text{Reorder Point} = (\text{Lead Time Days} \times \text{Daily Velocity}) + \text{Safety Stock}$$
* Dynamically sizes the next order batch to the exact predicted demand for the upcoming month.

### 4. Blind Wholesale Deal Scout & Price Comparison
* Connects to wholesale supplier feeds and web catalogs without revealing the buyer's store name or inventory distress.
* Compares:
  * Base unit prices across suppliers.
  * Volume discount tiers (e.g. 15% off for >80 units).
  * Shipping fees and delivery lead times.
* Computes the net cost per unit and selects the highest-value option.

### 5. Pre-Flight Payment Security Shield ("Steward Shield")
* **Inbound Firewall**: Positioned directly between web inputs/invoices and the payment execution layer.
* **Taint Parser**: Wraps external supplier text inside safe JSON data literals with SHA-256 hashes, preventing prompt injections from executing as system instructions.
* **Adversarial Pattern Detection**: Scans for:
  * Indirect prompt injection (`"Ignore previous instructions..."`).
  * Payee substitution (diverting funds to unapproved PayPal addresses).
  * Quantity or price inflation.
  * Hidden unicode / zero-width characters.

### 6. Native PayPal `AUTHORIZE` Hold + 60-Second "Undo Window"
* Leverages PayPal Orders v2 with `intent: "AUTHORIZE"`.
* Money is held on PayPal's network, not captured.
* A live 60-second interactive countdown gives the owner complete control.
* If cancelled, Steward calls `POST /v2/payments/authorizations/{id}/void` — money is immediately released with **zero transaction fees**.
* If the window expires cleanly, Steward issues `/capture`.

### 7. Transparent Earned Autonomy & Zero-Tolerance Penalty Box
* **Tier 0 (Suggest Only)**: New suppliers; requires full human confirmation.
* **Tier 1 (One-Tap Approve)**: Unlocked after 5 consecutive clean transactions.
* **Tier 2 (Autonomous Reorders)**: Unlocked after 15 clean repeat transactions for routine reorders $\le \$150$.
* **Zero-Tolerance Penalty Box**: A single cancellation or mismatch instantly demotes the supplier back to Tier 0.

### 8. 1-Click PayPal Resolution Center Dispute Dossier
* Generates a tamper-proof forensic audit dossier containing:
  * SHA-256 hash of the owner's intent profile.
  * Exact invoice provenance trail.
  * Verifiable PayPal authorization and capture IDs.
  * Full chronological Why-Trail explaining the decision.

---

## 4. Current Status: What Has Been Built & Verified

| Component | Files Implemented | Verification Status |
| :--- | :--- | :---: |
| **Milestone 1: Domain Contracts** | `src/contracts/*.ts` (intent, inventory, policy, payment, autonomy, adversarial, dossier, provenance) | ✅ Verified (`npm run verify:m1`) |
| **Milestone 2: Core Execution Engines** | `src/engines/` (`taint-parser.ts`, `inventory-calculus.ts`, `policy-engine.ts`, `autonomy-engine.ts`) | ✅ Verified (`npm run verify:m2`) |
| **Milestone 3: PayPal Sandbox Integration** | `src/paypal/` (`client.ts`, `orders.ts`, `payouts.ts`, `undo-window.ts`, `webhook-listener.ts`) | ✅ Verified Offline (`verify:m3`) & Live Sandbox (`live:m3`) |

---

## 5. Implementation Roadmap (Phases 4 through 6)

### Phase 4: ZK-Privacy Vault, Deal Scout & Autopilot Core (Current Priority)
- [ ] **`src/privacy/zk-vault.ts`**:
  * Local private financial state (bank balance, revenue, margins).
  * Local constraint evaluation (cash floor, runway verification).
  * Blinded payload generator (strips all dollar balances before external calls).
- [ ] **`src/privacy/pre-flight-shield.ts`**:
  * Inbound prompt injection scanner and jailbreak detector.
  * Payee whitelist verification and price anomaly detection.
- [ ] **`src/engines/deal-scout.ts`**:
  * Multi-vendor wholesale comparison engine (unit price, bulk breaks, shipping).
  * Blind market search query formatter.
- [ ] **`src/engines/consumption-forecaster.ts`**:
  * Adaptive demand learning and dynamic next-month batch tailoring.
- [ ] **`src/engines/dynamic-mandate.ts`**:
  * Context-aware spending mandate (adapts to sales velocity).
- [ ] **`src/engines/autopilot.ts`**:
  * Orchestrator connecting ZK-Vault $\to$ Consumption $\to$ Deal Scout $\to$ Pre-Flight Shield $\to$ PayPal Sandbox.
- [ ] **`scripts/verify-phase-4.ts`**: End-to-end verification script for the autopilot loop.

### Phase 5: Adversarial Benchmark & Empirical Evaluation
- [ ] **25-Case Labelled Attack Dataset** (`src/benchmark/cases.ts`):
  * 10 Benign genuine reorders.
  * 15 Adversarial attacks (prompt injection, payee spoofing, price inflation, hidden unicode).
- [ ] **Automated Benchmark Runner** (`scripts/run-benchmark.ts`):
  * Evaluates detection rate (100%), false positive rate (0%), and average gate latency (<250ms).

### Phase 6: Full-Stack Demo UI & Red-Team Playground
- [ ] **Next.js 15 + Tailwind CSS Dashboard**:
  * **Seller CFO View**: Real-time inventory levels, consumption curves, cash runway gauge.
  * **Live Deal Scout Widget**: Visual price comparison across 3 suppliers with savings breakdown.
  * **Active Undo Window Card**: Live 60-second interactive countdown with 1-tap Void button.
  * **Interactive Red-Team Attack Playground**: Lets judges inject attacks live and watch the Pre-Flight Shield isolate and block them in real-time.
  * **1-Click Dispute Dossier Generator**: Exports printable/JSON evidence dossier for PayPal Resolution Center.
