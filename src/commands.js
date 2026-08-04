/**
 * Parses a Telegram message into an actionable command.
 * Supports:
 *   /log <event name> | <actual> | [forecast] | [previous] | [USD|EUR]
 *   /status
 *   /help
 * Strips a trailing "@BotName" from the command, since group chats send that.
 */
export function parseCommand(text) {
  if (!text) return null;
  const trimmed = text.trim();
  const [cmdRaw, ...rest] = trimmed.split(/\s+/);
  const cmd = cmdRaw.split('@')[0].toLowerCase();
  const argsText = trimmed.slice(cmdRaw.length).trim();

  if (cmd === '/status') return { type: 'status' };
  if (cmd === '/help' || cmd === '/start') return { type: 'help' };

  if (cmd === '/log') {
    const parts = argsText.split('|').map(p => p.trim());
    const [event, actual, forecast, previous, country] = parts;

    if (!event || !actual) {
      return {
        type: 'log_error',
        message: 'Usage: /log <event name> | <actual> | [forecast] | [previous] | [USD|EUR]\ne.g. /log NFP | 254K | 200K',
      };
    }

    return {
      type: 'log',
      event,
      actual,
      forecast: forecast || null,
      previous: previous || null,
      country: (country || 'USD').toUpperCase(),
    };
  }

  return null; // not a recognized command - ignore (could be a random chat message)
}
