# Forever — Telegram Mini App

This project is a React + Vite storefront that runs **inside Telegram** as a Mini App
(Telegram Web App) **and** as an ordinary website from the same build. Inside Telegram
it uses the client for identity, storage, the native back button and haptics, and a bot
posts the order confirmation into the chat.

---

## 1. Quick start (5 minutes, no bot needed)

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. This is the plain website: a "Demo Student" profile stands
in for the Telegram account, and orders are saved in `localStorage` (a browser has no
signed `initData`, so no server would accept them). Fastest way to work on screens.

## 2. Run it for real inside Telegram

Telegram only opens Mini Apps over **HTTPS**, so a local dev server needs a tunnel.

**a. Create the bot**

1. In Telegram, talk to [@BotFather](https://t.me/BotFather) → `/newbot`, pick a name
   and a username → copy the **token**.

**b. Expose the dev server**

```bash
npx cloudflared tunnel --url http://localhost:5173
```

(or `ngrok http 5173`) and copy the `https://….trycloudflare.com` URL it prints.

**c. Point the bot at it**

```bash
cp bot/.env.example bot/.env      # then edit bot/.env
```

Set `BOT_TOKEN` and `WEBAPP_URL` (the tunnel URL), then:

```bash
npm start --prefix bot
```

The bot sets its own menu button on boot, so in Telegram open the chat with your bot,
send `/start`, and tap **Open Shop**. (If the bot was previously deployed, run
`npm run webhook -- delete` first — a webhook and long polling are mutually exclusive.)

**d. Let the Mini App reach the order API**

```bash
cp .env.example .env              # set VITE_API_URL, then restart `npm run dev`
```

For a phone test the API must be reachable too — run a second tunnel for port `8787`
and put that URL in `VITE_API_URL`.

## 3. Deploy to Vercel (front end + bot in one project)

One Vercel project hosts everything: the static site, the Mini App, and the bot.
This project is deployed at <https://e-commerce-telegram-bot.vercel.app>, with the
webhook at `/api/telegram` and the order endpoint at `/api/order`.

```
dist/               the website and the Mini App (same build)
api/order.js        POST /api/order  — verifies initData, sends the receipt
api/telegram.js     POST /api/telegram — the bot's webhook
api/_lib/           shared code (signature check, receipt text, Telegram calls)
```

**a. Import the repo**

In Vercel → *Add New → Project* → pick the repo. If the app is not at the repository
root, set **Root Directory** to the folder holding `package.json`. Framework preset
*Vite*, build `npm run build`, output `dist` — `vercel.json` already says so.

**b. Environment variables** (Project → Settings → Environment Variables)

| Name | Value |
| --- | --- |
| `BOT_TOKEN` | the token from @BotFather — server-side only, never `VITE_*` |
| `WEBAPP_URL` | `https://<your-project>.vercel.app` — optional, Vercel's own production URL is used when unset |
| `WEBHOOK_SECRET` | any random string; Telegram echoes it back on every call |
| `SHOP_NAME` | optional, defaults to `Forever` |

Leave `VITE_API_URL` **unset** in production: the Mini App then calls `/api/order` on
its own domain, which needs no CORS and works from a phone.

**c. Point the bot at the deployment**

```bash
npm run webhook -- set https://<your-project>.vercel.app
```

That registers `POST /api/telegram` as the webhook and sets the chat menu button to the
deployment. Check it any time with `npm run webhook -- info`.

**d. Register the Mini App with BotFather** (optional but nice)

`/newapp` → pick the bot → title, description, 640×360 photo → **Web App URL** = your
Vercel URL → **short name** (e.g. `shop`). The app then also has a `t.me` link:
`https://t.me/<bot_username>/shop`, and `?startapp=product_aaaaa` deep-links into it.
Put that link in `VITE_BOT_LINK` so the product Share button shares the app.

### Webhook or polling — one at a time

A bot can either receive a webhook or be long-polled, never both. `npm run webhook --
set <url>` moves it to Vercel; `npm run webhook -- delete` hands it back to the local
`bot/` server for development.

### What serverless changes

`bot/index.js` keeps orders in an array; serverless functions do not keep state between
requests, so `api/order.js` only verifies and forwards. Order history lives on the
client (CloudStorage), which is all the demo needs — add Vercel KV or Postgres if the
project ever needs server-side order storage.

### Other hosts

Any static host works for the front end (Netlify, Cloudflare Pages, GitHub Pages —
`base: './'` and `HashRouter` mean no rewrite rules). The bot then needs either the same
webhook style of function or an always-on Node host (Railway, Render, a VPS) running
`bot/`.

## 4. How the Telegram integration works

The UI is the ordinary responsive website — same navbar, footer, collection grid and
checkout as the web build. Telegram support sits underneath it, so one codebase serves
both. The only screen that exists because of Telegram is **Profile** (`/profile`), which
replaced the old email/password login: a Mini App already knows who the user is.

| Concern | Where | Notes |
| --- | --- | --- |
| SDK | `index.html` | `telegram-web-app.js` is loaded from telegram.org — it cannot be bundled from npm |
| Safe SDK wrapper | `src/telegram/tg.js` | User, haptics, popups, links; every call degrades in a normal browser |
| Boot + viewport | `src/telegram/TelegramProvider.jsx` | `ready()`, `expand()`, viewport and safe-area variables |
| Native chrome | `src/telegram/theme.js` | Paints the Telegram header white to match the site |
| Back button | `src/telegram/useTelegramButtons.js` | Native BackButton on every screen except home |
| Cart + order storage | `src/telegram/cloudStorage.js` | CloudStorage (syncs across the user's devices), else `localStorage` |
| Identity | `src/pages/Profile.jsx` | `initDataUnsafe.user`, Lucide icons, no login form |
| Order submission | `src/lib/api.js` | Backend → `sendData` → local demo mode, in that order |
| Signature check | `api/_lib/initData.js` | HMAC-SHA256 of `initData` with the bot token |
| Receipt text | `api/_lib/receipt.js` | The "Order #1024 Confirmed" message |
| Bot (deployed) | `api/telegram.js` | Webhook: `/start`, `/keyboard`, `web_app_data` |
| Bot (local) | `bot/index.js` | Same logic, long polling, for development |

### Web and Telegram from one build

- In a browser: a normal shop. Orders are saved locally (no `initData` exists, so the
  server could not verify them anyway) and the Profile page shows demo account data.
- In Telegram: the same screens, plus the real account, haptics, the native back
  button, CloudStorage, and a chat receipt from the bot.

`HashRouter` keeps every route behind `#/`, so static hosts need no rewrite rules and
Telegram's own launch parameters cannot break routing.

### Why `initData` matters

`initDataUnsafe` is whatever the page says it is — a browser console can fake it. The
signed `initData` string can only be produced by Telegram, and `api/_lib/initData.js`
verifies it with the bot token before the server accepts an order. That check is the
whole security model of a Mini App, and it is worth a slide of its own.

---

## 5. Live demo script

1. **Open the bot** — send `/start`. The bot replies with a welcome message and an
   **🛍️ Open Shop** button (the Shop button next to the chat input works too).
2. **Open the Mini App** — the product catalogue loads inside Telegram.
3. **Open a product** — pick a size on the product page.
4. **Add to cart** — the cart badge in the navbar updates, with a haptic tap on a phone.
5. **Checkout** — *Proceed to checkout*; the delivery form is pre-filled with the name
   from the Telegram account.
6. **Place order** — a native Telegram popup confirms:
   `Order #1024 Confirmed · Total: $110 · Status: Processing`.
7. **Telegram confirmation** — the bot posts the receipt into the chat:

   ```
   ✅ Order #1024 Confirmed

   Product: Women Round Neck Cotton Top (M) × 1
   Total: $110
   Status: Processing

   Payment: Cash on Delivery
   Deliver to: 12 Norodom Blvd, Phnom Penh
   ```

8. **Close with the point**: the same React build is a normal website *and* a Telegram
   Mini App; Telegram supplies identity, storage and the chat channel, and the server
   trusts none of it until the `initData` signature checks out.

---

## 6. Troubleshooting

| Symptom | Fix |
| --- | --- |
| "This app is not available" / blank | The URL must be `https` and publicly reachable |
| Blocked host error from Vite | Already handled by `allowedHosts: true` in `vite.config.js` |
| Main button missing | Only Telegram draws it; in a browser you get the web fallback |
| Order fails with 401 | `BOT_TOKEN` in `bot/.env` does not match the bot that opened the app |
| CORS error on `/api/order` | Set `ALLOWED_ORIGIN` in `bot/.env` to the Mini App origin |
| Old version keeps loading | Telegram caches aggressively: close the app, then *Settings → Data → Clear cache* |
| Bot silent after deploying | `npm run webhook -- info` — a non-empty `last_error_message` names the cause |
| Bot silent locally | The webhook is still registered: `npm run webhook -- delete` |
| Order says "could not send the confirmation" | The buyer must press `/start` once before a bot may message them |
| 401 from `/api/order` on Vercel | `BOT_TOKEN` in the Vercel project does not match the bot that opened the app |
