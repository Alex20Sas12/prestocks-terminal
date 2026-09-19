/**
 * api/stats.js — proxy for prestocks.com/api/stats (volume time series,
 * weekly holders, launch dates). Cached 30 min: the source updates slowly.
 */
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
  try {
    const stats = await fetch("https://prestocks.com/api/stats").then((r) => r.json());
    if (!stats || !Array.isArray(stats.volume)) throw new Error("bad stats response");
    res.status(200).json(stats);
  } catch (e) {
    res.status(502).json({ error: String(e && e.message || e) });
  }
};
