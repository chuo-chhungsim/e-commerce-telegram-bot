# Forever shop bot

The **local development** bot: long polling plus the order API, with no npm dependencies
(Node 20+ built-ins only). The deployed equivalent runs on Vercel as `api/telegram.js`
and `api/order.js`, and both share the modules in `api/_lib/`.

A bot cannot be webhooked and polled at the same time. If the app is deployed, run
`npm run webhook -- delete` from the project root before starting this one.

```bash
cp .env.example .env    # fill in BOT_TOKEN and WEBAPP_URL
npm start
```

## What it does

- **`/start`** — replies with an inline `web_app` button that opens the Mini App, plus a
  reply-keyboard button that demonstrates the `sendData` path.
- **Menu button** — on boot it calls `setChatMenuButton`, so the button next to the chat
  input opens the shop.
- **`POST /api/order`** — receives `{ initData, order }` from the Mini App, verifies the
  signature (`initData.js`), stores the order in memory and sends the buyer a receipt.
- **`web_app_data`** — orders sent with `WebApp.sendData()` (reply-keyboard flow) arrive
  as a normal message and get the same receipt.
- **`/keyboard`** — pins the reply-keyboard button used for that `sendData` demo.
- **`GET /health`** — `{ ok: true, orders: n }`.

## Security notes for the write-up

- `initData` is verified with HMAC-SHA256 keyed by the bot token, compared in constant
  time, and rejected when older than 24 hours (replay protection). See
  `api/_lib/initData.js`.
- The user id always comes from the verified `initData`, never from the request body.
- Orders are rate-limited to one per user per 3 seconds, and bodies are capped at 100 kB.
- The bot token lives only in `bot/.env`, which is git-ignored.

Orders are kept in memory, so they disappear on restart — swap `orders` for SQLite or
Postgres if the project needs persistence.
