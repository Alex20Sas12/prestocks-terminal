/**
 * api/brief.js — daily "Pre-IPO Brief": markdown digest generated from live
 * prestocks.com data. Cached 1h. An external cron (X/Telegram autoposter) can
 * fetch this endpoint and publish the text as-is — that is the "life after
 * hackathon" pipeline; no database, no build step.
 */
const UPSTREAM = "https://prestocks.com/api/prestocks";
const STATS = "https://prestocks.com/api/stats";

const fmtB = (v) => {
  const a = Math.abs(v);
  if (a >= 1e12) return "$" + (v / 1e12).toFixed(2) + "T";
  if (a >= 1e9) return "$" + (v / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
  return "$" + v.toFixed(0);
};

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=3600");
  try {
    const [tokens, stats] = await Promise.all([
      fetch(UPSTREAM).then((r) => r.json()),
      fetch(STATS).then((r) => r.json()).catch(() => null),
    ]);
    if (!Array.isArray(tokens) || !tokens.length) throw new Error("empty upstream");

    const rows = tokens.map((t) => ({
      ...t,
      premium: t.markPrice ? (t.tokenPrice / t.markPrice - 1) * 100 : null,
    }));
    const byPrem = [...rows].filter((r) => r.premium != null).sort((a, b) => b.premium - a.premium);
    const mostPrem = byPrem[0];
    const mostDisc = byPrem[byPrem.length - 1];
    const totalMcap = rows.reduce((s, r) => s + (r.markValuation || 0), 0);
    const today = new Date().toISOString().slice(0, 10);

    let md = `# Pre-IPO Brief — ${today}\n\n`;
    md += `**${rows.length} tokenized private companies** tracked on Solana via PreStocks. Combined mark valuation: **${fmtB(totalMcap)}**.\n\n`;

    md += `## Premium watch\n\n`;
    md += `- Widest **premium** to mark: **${mostPrem.symbol}** at ${mostPrem.premium > 0 ? "+" : ""}${mostPrem.premium.toFixed(2)}% (token ${fmtB(mostPrem.tokenPrice)} vs mark ${fmtB(mostPrem.markPrice)}).\n`;
    md += `- Widest **discount**: **${mostDisc.symbol}** at ${mostDisc.premium.toFixed(2)}% (token ${fmtB(mostDisc.tokenPrice)} vs mark ${fmtB(mostDisc.markPrice)}).\n`;
    const tight = byPrem.filter((r) => Math.abs(r.premium) < 1);
    if (tight.length) md += `- Trading within ±1% of mark: ${tight.map((r) => `**${r.symbol}**`).join(", ")}.\n`;
    md += `\nPremium = what the Solana token trades at vs PreStocks' mark price for the underlying private company. A wide premium means buyers are paying up for 24/7 on-chain liquidity; a discount can mean bargain — or thin demand.\n\n`;

    if (stats && Array.isArray(stats.volume) && stats.volume.length) {
      const last = stats.volume[stats.volume.length - 1];
      const prev = stats.volume[stats.volume.length - 2] || {};
      const syms = Object.keys(last).filter((k) => k !== "date");
      const vols = syms.map((s) => ({ s, v: last[s] || 0, p: prev[s] || 0 }));
      const total = vols.reduce((a, x) => a + x.v, 0);
      const movers = vols.filter((x) => x.p > 0).map((x) => ({ ...x, chg: (x.v / x.p - 1) * 100 })).sort((a, b) => b.chg - a.chg);
      md += `## Volume (${last.date})\n\n`;
      md += `- Aggregate 24h volume across all PreStocks: **${fmtB(total)}**.\n`;
      const top3 = [...vols].sort((a, b) => b.v - a.v).slice(0, 3);
      md += `- Most traded: ${top3.map((x) => `**${x.s}** ${fmtB(x.v)}`).join(", ")}.\n`;
      if (movers.length) {
        const up = movers[0], dn = movers[movers.length - 1];
        if (up.chg > 5) md += `- Biggest volume jump day-over-day: **${up.s}** +${up.chg.toFixed(0)}%.\n`;
        if (dn.chg < -5) md += `- Biggest volume drop: **${dn.s}** ${dn.chg.toFixed(0)}%.\n`;
      }
      md += "\n";
    }
    if (stats && Array.isArray(stats.holders) && stats.holders.length) {
      const h = stats.holders[stats.holders.length - 1];
      const hp = stats.holders[stats.holders.length - 2] || {};
      const syms = Object.keys(h).filter((k) => k !== "week" && h[k] > 0);
      const totalH = syms.reduce((a, s) => a + h[s], 0);
      const growers = syms.filter((s) => hp[s] > 0).map((s) => ({ s, chg: (h[s] / hp[s] - 1) * 100 })).sort((a, b) => b.chg - a.chg);
      md += `## Holders (week of ${h.week})\n\n`;
      md += `- Total unique holders across tracked tokens: **${totalH.toLocaleString("en-US")}**.\n`;
      const top = [...syms].sort((a, b) => h[b] - h[a]).slice(0, 3);
      md += `- Largest communities: ${top.map((s) => `**${s}** ${h[s].toLocaleString("en-US")}`).join(", ")}.\n`;
      if (growers.length && growers[0].chg > 0.5) md += `- Fastest-growing holder base week-over-week: **${growers[0].s}** +${growers[0].chg.toFixed(1)}%.\n`;
      md += "\n";
    }

    md += `## Board\n\n`;
    for (const r of byPrem) {
      md += `- **${r.symbol}** — token ${fmtB(r.tokenPrice)}, mark ${fmtB(r.markPrice)}, ${r.premium > 0 ? "+" : ""}${r.premium.toFixed(2)}%, val ${fmtB(r.markValuation)}\n`;
    }
    md += `\n*Generated ${new Date().toISOString()} from prestocks.com public API. Not financial advice.*\n`;

    res.status(200).json({ date: today, markdown: md });
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) });
  }
};
