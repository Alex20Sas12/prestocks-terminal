/**
 * api/prestocks.js — merges prestocks.com token data with Jupiter price/v3
 * (liquidity, 24h change) and computes premium/discount server-side.
 * Cached 300s at the edge to stay well inside Vercel free limits.
 */
const JUP = "https://lite-api.jup.ag/price/v3?ids=";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  try {
    const tokens = await fetch("https://prestocks.com/api/prestocks").then((r) => r.json());
    if (!Array.isArray(tokens) || !tokens.length) throw new Error("empty prestocks response");

    let jup = {};
    try {
      const j = await fetch(JUP + tokens.map((t) => t.contract_address).join(",")).then((r) => r.json());
      jup = j.data || j;
    } catch (_) {}

    const out = tokens.map((t) => {
      const j = jup[t.contract_address] || {};
      const tokenPrice = j.usdPrice ?? t.tokenPrice;
      const markPrice = j.stockData?.price ?? t.markPrice;
      const premium = markPrice ? (tokenPrice / markPrice - 1) * 100 : null;
      return {
        name: t.name,
        symbol: t.symbol,
        description: t.description,
        image: t.image,
        external_url: t.external_url,
        mint: t.contract_address,
        tokenPrice,
        markPrice,
        markValuation: j.stockData?.mcap ?? t.markValuation,
        impliedValuation: t.impliedValuation,
        supply: t.supply,
        premiumPct: premium,
        liquidity: j.liquidity ?? null,
        priceChange24h: j.priceChange24h ?? null,
        markUpdatedAt: j.stockData?.updatedAt ?? null,
      };
    });
    res.status(200).json({ updatedAt: new Date().toISOString(), tokens: out });
  } catch (e) {
    res.status(502).json({ error: String(e && e.message || e) });
  }
};
