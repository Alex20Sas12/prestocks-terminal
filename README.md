# PreStocks Terminal

Live analytics for the 8 **PreStocks** tokenized pre-IPO companies on Solana (OpenAI, Anthropic, SpaceX, Anduril, Neuralink, Kalshi, Figure AI, Polymarket). Built for the [Stocklana hackathon](https://hackathons.solana.com/hackathons/stocklana) (PreStocks bounty).

**Live:** https://prestocks-terminal.vercel.app

## What it does

- **Dashboard** (`/`) — cards per token: live token price (Jupiter) vs mark price (PreStocks), premium/discount %, mark & implied valuation, 24h change, on-chain liquidity; market-wide summary stats.
- **Token pages** (`/token?symbol=OPENAI`) — 90-day volume chart, weekly holders chart (inline SVG, zero deps), valuation/liquidity/supply stats, premium explainer, Jupiter swap deep-link.
- **Pre-IPO Brief** (`/brief`) — a daily markdown digest generated live from upstream data (`/api/brief`): premium watch, volume movers, holder growth, full board. Designed to be published as-is by a cron job (X/Telegram) — the "life after hackathon" pipeline.

## Architecture

Static HTML/CSS/JS pages + 3 Vercel serverless functions (Node, zero npm deps):

| Endpoint | Purpose | Cache |
|---|---|---|
| `/api/prestocks` | Merges prestocks.com/api/prestocks + Jupiter `price/v3` (liquidity, 24h change), computes premium/discount server-side | `s-maxage=300` |
| `/api/stats` | Proxy for prestocks.com/api/stats (412 daily volume points, 60 weekly holder snapshots) | `s-maxage=1800` |
| `/api/brief` | Generates the daily Pre-IPO Brief markdown from live data | `s-maxage=3600` |

The functions also solve CORS — pages are plain static files. Free Vercel hobby tier only; no keys, no DB, no on-chain writes.

## Run locally

```bash
npx vercel dev        # or just open the HTML files (APIs need the Vercel runtime)
node test.js https://prestocks-terminal.vercel.app   # live verification suite
```

## Deploy

```bash
bash deploy.sh        # vercel deploy --prod (creds via XDG_DATA_HOME)
```

## Data sources (public, no auth)

- https://prestocks.com/api/prestocks — token list, mark/token prices, valuations
- https://prestocks.com/api/stats — volume & holder time series
- https://lite-api.jup.ag/price/v3 — live DEX price, liquidity, 24h change

Not affiliated with PreStocks. Not financial advice.
