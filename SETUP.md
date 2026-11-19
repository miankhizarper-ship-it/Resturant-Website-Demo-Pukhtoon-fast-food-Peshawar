# Pukhtoon AI — setup guide

Everything you need to take the website's AI ordering assistant live:
the **Google Sheet**, the **Apps Script backend**, and the **website hookup**.
Total time: about 10 minutes.

---

## 1. What you have

| Deliverable | Where | What it does |
| --- | --- | --- |
| **Google Sheet** | [Pukhtoon Fast Food — AI Orders & Menu](https://docs.google.com/spreadsheets/d/1UViZZ4B1jYzUMcU79Lywe61pW0GBkkPo_ZQTIi85xUY/edit) | The restaurant's brain: menu + prices, incoming orders, business settings, FAQ knowledge. |
| **Apps Script backend** | `apps-script/` in this repo | Receives chat messages, asks Gemini, validates prices, and writes each order into the sheet. |
| **Website widget** | `chat.js` · `chat.css` · `config.js` | The floating “Ask Pukhtoon AI” chat on the site, with dish photo cards, order summary and one-tap confirm. |

How a message travels:

```
Customer → chat widget (chat.js) → Apps Script web app → Gemini (menu + FAQs as context)
                                              ↓
                                   validated order → Google Sheet (Orders tab)
```

Nothing is invented on the website: prices come from the sheet, and the **server re-checks
every price** before a row is written, so a customer can never be charged a tampered amount.

---

## 2. The Google Sheet (already built)

Open it: **https://docs.google.com/spreadsheets/d/1UViZZ4B1jYzUMcU79Lywe61pW0GBkkPo_ZQTIi85xUY/edit**

| Tab | Edit it when… | Notes |
| --- | --- | --- |
| **Menu** | you change a price, add a dish, or run out of something | 19 active dishes. Columns: `id, name, category, price, description, tags, image, active, notes`. Set `active` to `FALSE` (or clear the price) to hide a dish from the AI. Never edit the `id` of a dish that is already in old orders. |
| **Orders** | never — it fills itself | One row per order: `Order ID, Timestamp, Customer, Phone, Address, Order Type, Items, Qty, Total (PKR), Status, Notes, Channel`. Change **Status** as the order moves (`New → Confirmed → Out for delivery → Delivered`). |
| **Settings** | you change timings, fees, or want to pause AI orders | Key/value pairs the bot reads on every message. |
| **Knowledge** | you want better answers to a common question | `topic, keywords, answer`. Answers are passed to Gemini verbatim. |
| **Read me** | — | Short in-sheet cheat sheet. |

**Most useful Settings keys**

| Key | Effect |
| --- | --- |
| `accept_ai_orders` | `FALSE` pauses online ordering instantly (the bot still answers questions). |
| `delivery_fee` | `0` today. Set e.g. `80` and every new order is charged delivery. |
| `min_order` | `249` — smaller baskets are politely refused. |
| `require_phone` | `TRUE` forces a phone number before an order is accepted. |
| `ai_tone` | Words that shape the assistant's voice. |
| `hours` / `delivery_hours` / `delivery_areas` | What the bot quotes to customers. |

The sheet's timezone is already **Asia/Karachi**, so timestamps are Peshawar time.

---

## 3. Deploy the Apps Script (10 minutes)

### 3.1 Open the script editor from the sheet

1. Open the sheet above.
2. **Extensions → Apps Script**. A new tab opens with a `Code.gs` file.

> The script must be created *from the sheet* so it is bound to it.

### 3.2 Paste the three files

1. **Code.gs** — delete the default `function myFunction() {}` and paste all of `apps-script/Code.gs`.
2. **+ (Files) → Script** → name it `Gemini` → paste `apps-script/Gemini.gs`.
3. **+ (Files) → Script** → name it `Secrets` → paste `apps-script/Secrets.gs`
   (your API key is already inside — that file is git-ignored and never uploaded to GitHub).

Click **Save** (💾).

> Prefer not to keep the key in a file? Skip `Secrets.gs` and instead run
> `setApiKey('YOUR_KEY')` once from the editor, which stores it in Script Properties.

### 3.3 First run + permissions

1. In the toolbar function dropdown pick **`setup`** → **Run**.
2. Google asks for authorisation: **Review permissions → choose your account → Advanced →
   Go to “Pukhtoon AI” (unsafe) → Allow.** (It is your own script; “unsafe” just means unverified.)
3. Check the **Execution log**: it should say *“All tabs already exist.”*
4. Now pick **`testGemini`** → **Run**. The log should show a one-line hello from Gemini.
   If it shows an error, see §6.

### 3.4 Deploy as a web app

1. **Deploy → New deployment**.
2. Click the ⚙️ gear next to “Select type” → **Web app**.
3. Fill in:
   - **Description:** `Pukhtoon AI v1`
   - **Execute as:** `Me (your@email)`
   - **Who has access:** **`Anyone`** ← must be *Anyone*, not “Anyone with a Google account”,
     or visitors will be asked to sign in.
4. **Deploy** → authorise if asked.
5. Copy the **Web app URL** — it looks like
   `https://script.google.com/macros/s/AKfycb…/exec`.

### 3.5 Connect the website

Open `config.js` in the site and paste the URL:

```js
window.PUKHTOON_AI = {
  endpoint: "https://script.google.com/macros/s/AKfycb…/exec",
  demoMode: false,
  …
};
```

Save, hard-refresh the site. The chat header should now read **“Online · replies in seconds”**
instead of “Demo mode”. Place a test order — a new row appears in the **Orders** tab within a second.

> **After any code change** you must redeploy: **Deploy → Manage deployments → ✏️ → Version: New
> version → Deploy.** Editing the script alone does not update the live URL.

---

## 4. Try it like a customer

Type any of these into the chat:

- “What's popular?” → recommendations with photo cards
- “Zinger burger kitne ka hai?” → Urdu/Roman-Urdu answers with the live price
- “2 zinger burgers and a chow mein, name Ali, delivery to Tehkal” → summary card
- tap **Confirm order** → order id `PK-YYMMDD-0001` + a “Send on WhatsApp” button
- “Do you deliver to Hayatabad?” / “Are you open now?” → answers from `Knowledge`
- “status of PK-251118-0001” → the current status from the sheet

Orders land in **Orders** with channel `AI Chat`, status `New`.

---

## 5. How the “RAG” works

There is no vector database to maintain. On every message the backend rebuilds a compact
context from the sheet and sends it to Gemini:

- **Menu tab** → every active dish as `[id] Name | Category | Rs. price | tags | description`
- **Knowledge tab** → the FAQ answers
- **Settings tab** → name, hours, fees, delivery areas, tone

Gemini must answer in a fixed JSON shape (`reply`, `itemIds`, `checkout`), which is why the
chat can draw photo cards and an order summary instead of dumping markdown. Answers are cached
for 5 minutes (`CacheService`), so the sheet is not re-read on every keystroke — edit a price and
it shows up within 5 minutes (or run `clearCache()` in the editor to force it).

---

## 6. Troubleshooting

| Symptom | Fix |
| --- | --- |
| “The Gemini API key is missing” | Add `GEMINI_API_KEY` in **Project Settings → Script properties**, or paste `Secrets.gs`. |
| “Gemini did not answer (API key not valid)” | The key is wrong, revoked, or from a different project. Make a new one at [aistudio.google.com/apikey](https://aistudio.google.com/app/apikey). |
| “Gemini did not answer (models/… not found)” | That model isn't available to your key. Change `MODEL` in `Code.gs` to `gemini-2.0-flash` and redeploy. |
| Chat says “I couldn't reach the ordering service” | The `endpoint` in `config.js` is wrong, or the deployment's access isn't **Anyone**. Redeploy and re-copy the URL. |
| Bot replies but no row appears | Orders are only written when the customer taps **Confirm** and the basket meets `min_order`. Check the script's **Executions** log. |
| Prices look stale | Cache: run `clearCache()` in the editor, or wait 5 minutes. |
| “Missing tab …” | Run `setup()` once, or make sure the script is bound to *this* sheet. |
| Changes to `Code.gs` do nothing | You edited a draft. **Deploy → Manage deployments → New version**. |
| Orders and menu in Urdu/Arabic look garbled | Keep the sheet locale `en_US` and timezone `Asia/Karachi` (already set). |

Logs: in the Apps Script editor open **Executions** (left sidebar) — every failed request is
listed with the exact error.

---

## 7. Security, cost, limits

- **The `/exec` URL is public.** That is required for anonymous visitors. It only accepts
  `chat`, `placeOrder`, `status` and `menu`, and it can write rows only to the Orders tab.
  Treat it like a phone number, not a password.
- **The API key never reaches the browser.** It lives in Apps Script only.
- **Gemini cost:** `gemini-2.5-flash` is inexpensive and comfortably inside the free tier for a
  demo. Each message sends ~1.5k tokens of menu context.
- **Quotas:** Apps Script allows 20k `UrlFetch` calls/day — far beyond a single restaurant.
- **Privacy:** the sheet holds customer names, phones and addresses. Share it only with staff.
- **Revoke a leaked key** at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey),
  then update Script Properties.

---

## 8. Files

```
config.js               ← paste the /exec URL here
chat.js                 ← chat widget: messages, dish cards, order confirm, demo fallback
chat.css                ← widget styling (matches the site's dark/red/orange theme)
apps-script/Code.gs     ← doPost router, sheet reads, order writing, setup helpers
apps-script/Gemini.gs   ← Gemini request, JSON schema, model fallbacks
apps-script/Secrets.gs  ← your API key (git-ignored — do not commit)
apps-script/appsscript.json ← manifest: Asia/Karachi, deploy as web app
```

Useful editor functions: `setup()` · `testGemini()` · `clearCache()` · `setApiKey()`
· `getWebAppUrl()` · `addTestOrder()`.

---

## 9. Demo mode

With `endpoint: ""` the widget uses a small built-in scripted assistant: it recommends dishes,
answers FAQs, builds a basket and shows the confirm card — but nothing is sent to Gemini or
Sheets (the receipt is clearly marked `PK-DEMO-…`). Perfect for showing the site before the
backend is deployed.
