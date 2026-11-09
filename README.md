## 🤖 How the Steward Agent Works

The Steward Agent coordinates the purchasing process, from understanding the owner's request to preparing and executing a purchase.

For example, an owner might say:

> "Sales of matcha have increased. Reorder without risking payroll."

The agent takes this request and coordinates the different components of Steward to turn it into a purchase.

Its workflow includes:

1. **Understanding the request:** Identifies the product, quantity, budget and purchasing preferences.
2. **Planning the purchase:** Checks inventory, analyses sales trends and finds suitable suppliers.
3. **Checking affordability:** Validates the proposed order against the owner's financial rules and available spending allowance.
4. **Verifying the transaction:** Sends supplier information and payment details through the security shield.
5. **Handling payment:** Initiates a PayPal authorization and starts the 60-second Undo Window.
6. **Updating records:** Tracks the transaction, updates inventory and maintains supplier history after payment confirmation.

The agent coordinates these steps but doesn't have unrestricted access to business funds. Financial calculations, spending limits and payment approvals are handled by separate deterministic components.

### Connecting External Agents

Steward can also be used by other AI agents through its MCP server.

We implemented MCP using JSON-RPC 2.0 over STDIO, allowing compatible applications such as Claude Desktop, Cursor and agent frameworks to access Steward's tools.

These tools allow external agents to:
- Inspect payments.
- Evaluate spending mandates.
- Find wholesale suppliers.
- Compare consumer prices.
- Simulate payment holds.

This means an external agent can handle the conversation while Steward takes care of financial checks and payment security.

---

## ⚡ Quickstart & Setup

### Prerequisites

- Node.js 20.6+ (required for `--env-file`) / 24+
- npm

### 1. Clone the repository

```bash
git clone https://github.com/rushil23shah-hue/accounter-agent-.git
cd accounter-agent-
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start Steward

```bash
npm run dev
```

The dashboard will be available at:

`http://localhost:3000`

Steward runs in MOCK mode by default, so you can explore the application without configuring PayPal credentials.

### 4. Run the verification suite

```bash
npm test
```

This runs the nine test suites covering the project's core functionality and security checks.

### 5. Connect PayPal Sandbox (Optional)

Create a `.env` file in the project root:

```env
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_CURRENCY=USD
PAYPAL_PAYOUT_TO=your_sandbox_account_email
```

Optional variables:

| Variable | Purpose |
|---|---|
| `PAYPAL_PAYEE_EMAIL` | Sandbox payee email for authorizations. |
| `PAYPAL_WEBHOOK_ID` | Sandbox webhook ID, if verifying webhooks. |
| `PORT` | Dashboard port (default `3000`). |

> Never commit `.env`. It is gitignored; use sandbox credentials only.

To run live sandbox verification:

```bash
npm run live:m3
```

### 6. Start the MCP Server (Optional)

To allow external agents to interact with Steward:

```bash
npm run mcp
```

To use it from Claude Desktop, Cursor or another MCP client, add this to the client's MCP config (set `cwd` to your local clone path):

```json
{
  "mcpServers": {
    "steward": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/path/to/accounter-agent-"
    }
  }
}
```

---

## 🎬 Try the Steward Demo

Once the dashboard is running, here's a suggested walkthrough of the main features.

| Step | What to try | What to look for |
|---|---|---|
| 1. Financial Vault | Open the CFO Dashboard | View the spending ceiling, cash floor and financial constraints. |
| 2. Autonomous Restock | Run the restock pipeline | Watch demand forecasting, supplier selection and payment validation. |
| 3. Undo Window | Initiate a PayPal authorization | See the 60-second countdown and try cancelling the payment. |
| 4. Security Shield | Open the Red-Team Playground | Test how Steward handles malicious supplier instructions and suspicious payment details. |
| 5. Intent Processing | Open the Intent interface | Try a natural-language shopping request and see how it is converted into an order. |
| 6. Transaction Ledger | Open the audit ledger | Review transaction history and export records. |
| 7. Price Sentinel | Open the Sentinel dashboard | Explore automated price monitoring and spending conditions. |
| 8. Dispute Dossier | Open the Dispute Dossier | Generate a printable transaction evidence report. |

---

## Demo Walkthrough

For a quick overview of Steward's main capabilities, follow the three-minute demo:

| Time | Demonstration | What to show |
|---|---|---|
| 0:00–0:45 | Financial Vault | Show the owner intent profile, spending ceiling and protected financial information. |
| 0:45–1:15 | Autonomous Restock | Run the restock pipeline and demonstrate the PayPal authorization and Undo Window. |
| 1:15–1:45 | Security Shield | Inject a malicious supplier instruction and demonstrate how Steward blocks it. |
| 1:45–2:15 | Intent Processing | Enter a shopping request and demonstrate product matching and price comparison. |
| 2:15–2:40 | Transaction Ledger | Show the transaction history and export functionality. |
| 2:40–3:00 | Price Sentinel and Dispute Dossier | Demonstrate automated monitoring and generate a transaction evidence report. |