// test.js — local self-check: node test.js <base-url>
// Verifies API shapes + premium math against a live deployment.
const base = (process.argv[2] || "").replace(/\/$/, "");
if (!base) { console.error("usage: node test.js https://<deployment-url>"); process.exit(2); }

const get = (u) => fetch(u).then(async (r) => { if (!r.ok) throw new Error(u + " → " + r.status); return r.json(); });
const getT = (u) => fetch(u).then(async (r) => { const t = await r.text(); if (!r.ok) throw new Error(u + " → " + r.status); return t; });
const assert = (cond, msg) => { if (!cond) throw new Error("ASSERT: " + msg); };

(async () => {
  // API: prestocks
  const d = await get(base + "/api/prestocks");
  assert(Array.isArray(d.tokens) && d.tokens.length === 8, "expected 8 tokens, got " + (d.tokens || []).length);
  const openai = d.tokens.find((t) => t.symbol === "OPENAI");
  assert(openai && openai.tokenPrice > 0 && openai.markPrice > 0, "OPENAI prices missing");
  const recomputed = (openai.tokenPrice / openai.markPrice - 1) * 100;
  assert(Math.abs(recomputed - openai.premiumPct) < 1e-9, `premium mismatch: ${recomputed} vs ${openai.premiumPct}`);
  for (const t of d.tokens) assert(typeof t.mint === "string" && t.mint.length > 30, "bad mint for " + t.symbol);
  console.log(`OK /api/prestocks — 8 tokens; OPENAI token ${openai.tokenPrice.toFixed(2)} vs mark ${openai.markPrice.toFixed(2)} = ${openai.premiumPct.toFixed(2)}%`);

  // API: stats
  const s = await get(base + "/api/stats");
  assert(Array.isArray(s.volume) && s.volume.length > 100, "volume series too short");
  assert(Array.isArray(s.holders) && s.holders.length > 10, "holders series too short");
  assert(s.volume.at(-1).ANTHROPIC > 0, "latest ANTHROPIC volume missing");
  console.log(`OK /api/stats — ${s.volume.length} volume points, ${s.holders.length} holder weeks`);

  // API: brief
  const b = await get(base + "/api/brief");
  assert(b.markdown.includes("Pre-IPO Brief"), "brief missing header");
  assert(b.markdown.includes("OPENAI") && b.markdown.includes("SPACEX"), "brief missing symbols");
  // renderMd must survive the real brief markdown (catches browser-side render bugs)
  const { renderMd } = require("./app.js");
  const rendered = renderMd(b.markdown);
  assert(rendered.includes("<h1>") && rendered.includes("<li>") && rendered.includes("</ul>"), "markdown render broken");
  console.log(`OK /api/brief — ${b.markdown.length} chars, date ${b.date}; renderMd OK (${rendered.length} chars html)`);

  // Pages
  for (const p of ["/", "/token?symbol=ANTHROPIC", "/brief"]) {
    const html = await getT(base + p);
    assert(html.includes("PreStocks"), "page missing brand: " + p);
    assert(html.includes('<meta name="description"'), "page missing meta: " + p);
    console.log(`OK ${p} — ${html.length} bytes`);
  }

  console.log("ALL CHECKS PASSED");
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
