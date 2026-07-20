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
