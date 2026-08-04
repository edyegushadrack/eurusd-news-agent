const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Sends a message to your Telegram chat via bot API.
 * Silently no-ops if credentials aren't configured, so the agent
 * still works (logs to console/repo) even before Telegram is set up.
 */
export async function sendTelegramAlert(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log('(Telegram not configured — skipping alert. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to enable.)');
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Telegram send failed: ${res.status} ${body}`);
    }
  } catch (err) {
    console.error('Telegram send error:', err.message);
  }
}

/**
 * Polls Telegram for new messages since `offset` (an update_id).
 * Used to let you send /log and /status commands from Telegram itself,
 * instead of needing the GitHub Actions UI.
 * NOTE: getUpdates fails if a webhook is set on this bot - keep this bot webhook-free.
 */
export async function getTelegramUpdates(offset) {
  if (!BOT_TOKEN) return [];

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=0`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Telegram getUpdates failed: ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram getUpdates returned not-ok:', JSON.stringify(data));
      return [];
    }
    return data.result || [];
  } catch (err) {
    console.error('Telegram getUpdates error:', err.message);
    return [];
  }
}
