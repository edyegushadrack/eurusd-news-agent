# EUR/USD News-Reaction Agent (v2)

Runs entirely on GitHub Actions — no local install, no server, no phone
needed. It has two jobs:

1. **Automatic pre-alerts** — every 5 minutes it checks a free economic
   calendar feed and messages you on Telegram ~60 minutes before a
   high-impact USD/EUR event, with the forecast and previous values.
2. **Manual reaction logging** — when the release actually drops, you check
   the actual number yourself (ForexFactory, Investing.com, your broker's
   calendar, MT4/5 — whatever you'd normally glance at), then trigger the
   workflow manually with that number. The agent then computes the surprise
   vs forecast, waits 15 minutes, pulls the EUR/USD price reaction, and
   sends you the full read on Telegram.

## Why it works this way

Free calendar feeds (ForexFactory's public export, which this uses) give
you the *schedule*, forecast, and previous value — but strip out the live
*actual* released number. Every provider that includes real-time actuals
gates that behind a paid plan. Rather than pretend otherwise, this agent
automates everything that's genuinely free (the schedule/reminder side) and
gives you a 10-second manual step for the one piece that isn't.

## One-time setup

### 1. Add repo secrets
Go to this repo → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**:

| Secret name | Where to get it |
|---|---|
| `TWELVEDATA_API_KEY` | https://twelvedata.com/pricing → free plan (email signup) |
| `TELEGRAM_BOT_TOKEN` | From @BotFather when you created your bot |
| `TELEGRAM_CHAT_ID` | From @userinfobot on Telegram |
| `ANTHROPIC_API_KEY` | Optional — omit to use a template-based summary instead |

You do **not** need a Finnhub key anymore — the calendar feed is free and
keyless.

### 2. Enable the workflow
Go to the **Actions** tab, enable workflows if prompted. It's already set
to run automatically every 5 minutes.

## How to use it day to day

**You don't need to do anything for pre-alerts** — they arrive on Telegram
automatically ~60 minutes before a high-impact event.

**When an event actually releases:**
1. Go to the **Actions** tab → **"EUR/USD News Agent"** → **"Run workflow"**
2. Fill in the form that appears:
   - **event**: the event name (e.g. `CPI m/m`)
   - **actual**: the number that just released (e.g. `3.5%` or `250K`)
   - **forecast** / **previous**: optional, fill in if you know them (helps
     compute the surprise even if the pre-alert data was incomplete)
   - **country**: USD or EUR
3. Click the green **"Run workflow"** button
4. Within ~15-20 minutes, you'll get a Telegram message with the surprise
   magnitude and EUR/USD's price reaction

Every logged event is saved to `data/event_log.json` in this repo, so it
becomes your own growing dataset of "how EUR/USD actually reacted to X."

## Project structure
```
.github/workflows/watch.yml  - schedule + manual trigger inputs
src/
  calendar.js    - free ForexFactory calendar feed (no key needed)
  parseFigure.js - parses "3.5%", "215K" etc. into numbers
  price.js       - EUR/USD price data (Twelve Data)
  surprise.js    - actual-vs-forecast surprise, direction-aware
  summarize.js   - plain-English read (Claude API or template)
  state.js       - tracks alerted/pending/processed across runs
  telegram.js    - sends alerts
  logger.js      - appends to data/event_log.json
  check.js       - main entry point
data/
  event_log.json       - your growing historical dataset
  processed_state.json - internal state, don't edit manually
```

## Limitations, honestly stated
- Qualitative events (e.g. "ECB Press Conference," which don't have a
  numeric actual/forecast) won't get a surprise score — they'll still log
  the price reaction if you trigger the workflow, just without the
  surprise magnitude.
- GitHub Actions cron can lag a few minutes under load — fine for this use
  case, not built for second-level precision.
- The manual step means you need to be at your computer (or phone via the
  GitHub mobile app) within a few minutes of a release to trigger it — this
  agent assists your reaction, it doesn't replace watching the calendar.

## Free tier limits
- **GitHub Actions**: 2,000 free minutes/month on private repos — 5-min
  interval runs use a small fraction of this
- **Twelve Data free tier**: 8 requests/minute, 800/day — only called when
  processing a pending event, so normal use stays well under this
