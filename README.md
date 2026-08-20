# Forever — Fashion e-commerce Telegram Mini App

**Live:** <https://e-commerce-telegram-bot.vercel.app> · **Bot:** [@zentinelfovever_bot](https://t.me/zentinelfovever_bot)

A fashion storefront built with React + Vite + Tailwind. The same build runs as a normal
website **and** as a Telegram Mini App: inside Telegram it adds the real account, the
native back button, haptics, a CloudStorage-backed cart, and a bot that confirms orders
in the chat. The login form is gone — `/profile` shows the Telegram account instead.

```bash
npm install
npm run dev          # http://localhost:5173 — works in a plain browser too
npm run build        # static bundle in dist/
npm run bot          # local bot + order API, long polling (see bot/README.md)
npm run webhook -- info   # where Telegram is currently delivering updates
```

Deployed on Vercel, the same project serves the website, the Mini App and the bot:
`api/telegram.js` is the webhook and `api/order.js` confirms orders.

**Setup, deployment, architecture and a demo script: [TELEGRAM.md](TELEGRAM.md).**

## Layout

```
src/
  telegram/     Telegram SDK wrapper, native chrome, CloudStorage, back-button hook
  components/   Navbar, footer, search, product cards, cart totals
  pages/        Home, Collection, Product, Cart, PlaceOrder, Orders, Profile, About, Contact
  context/      Shop state: cart, orders, persistence
  lib/          Order API client
api/            Vercel functions: bot webhook + order endpoint (_lib/ is shared)
bot/            The same bot for local development, long polling instead of a webhook
scripts/        webhook.js — switch the bot between Vercel and local
```

Product data is mock data in `src/assets/frontend_assets/assets.js` — there is no real
payment or inventory system. School demo project.
