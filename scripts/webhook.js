#!/usr/bin/env node
/**
 * Switch the bot between Vercel (webhook) and local development (long polling).
 *
 *   npm run webhook -- set https://your-project.vercel.app
 *   npm run webhook -- info
 *   npm run webhook -- delete      # back to `npm start --prefix bot`
 *
 * Reads BOT_TOKEN from bot/.env (or the environment).
 */
import { readFileSync } from 'node:fs';

function readEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('#'))
        .map((line) => {
          const index = line.indexOf('=');
          return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const fileEnv = readEnvFile(new URL('../bot/.env', import.meta.url).pathname);
const BOT_TOKEN = process.env.BOT_TOKEN || fileEnv.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || fileEnv.WEBHOOK_SECRET || '';

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN not found. Set it in bot/.env or in the environment.');
  process.exit(1);
}

const call = async (method, payload) => {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  return response.json();
};

const [command, argument] = process.argv.slice(2);

const commands = {
  async set() {
    if (!argument) {
      console.error('Usage: npm run webhook -- set https://your-project.vercel.app');
      process.exit(1);
    }
    const base = argument.replace(/\/$/, '');
    const result = await call('setWebhook', {
      url: `${base}/api/telegram`,
      secret_token: WEBHOOK_SECRET || undefined,
      drop_pending_updates: true,
      allowed_updates: ['message'],
    });
    console.log('setWebhook:', result.description ?? result);

    // Point the blue menu button next to the chat input at the same deployment.
    const menu = await call('setChatMenuButton', {
      menu_button: { type: 'web_app', text: 'Shop', web_app: { url: base } },
    });
    console.log('setChatMenuButton:', menu.ok ? 'ok' : menu.description);
  },

  async delete() {
    const result = await call('deleteWebhook', { drop_pending_updates: false });
    console.log('deleteWebhook:', result.description ?? result);
  },

  async info() {
    const result = await call('getWebhookInfo');
    console.log(JSON.stringify(result.result ?? result, null, 2));
  },
};

const action = commands[command];
if (!action) {
  console.log('Usage: npm run webhook -- <set https://url | info | delete>');
  process.exit(1);
}
await action();
