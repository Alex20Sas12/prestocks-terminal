// app.js — shared helpers: fetch, formatters, SVG charts, tiny markdown renderer.
const $ = (s, r = document) => r.querySelector(s);
const getJSON = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + " → " + r.status); return r.json(); });

const fmtUSD = (v, min = 2) => v == null ? "—" : "$" + v.toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: Math.max(min, v < 10 ? 4 : 2) });
const fmtBig = (v) => {
  if (v == null) return "—";
  const a = Math.abs(v);
  if (a >= 1e12) return "$" + (v / 1e12).toFixed(2) + "T";
  if (a >= 1e9) return "$" + (v / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return "$" + (v / 1e3).toFixed(1) + "K";
  return "$" + v.toFixed(0);
};
const fmtNum = (v) => v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtPct = (v) => v == null ? "—" : (v > 0 ? "+" : "") + v.toFixed(2) + "%";

function premiumBadge(p) {
  if (p == null) return '<span class="badge flat">n/a</span>';
  const cls = p > 0.5 ? "prem" : p < -0.5 ? "disc" : "flat";
  const label = p > 0.5 ? "premium" : p < -0.5 ? "discount" : "at mark";
  return `<span class="badge ${cls}">${fmtPct(p)} ${label}</span>`;
}

// Inline SVG line/area chart from [{x:label, y:number}]. Zero deps.
function svgChart(points, { height = 140, area = true, fmt = fmtBig } = {}) {
  const W = 600, H = height, P = 6;
  const ys = points.map((p) => p.y).filter((y) => y != null && isFinite(y));
  if (!ys.length) return "";
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi === lo) { hi += 1; lo -= 1; }
  const X = (i) => P + (i / (points.length - 1 || 1)) * (W - 2 * P);
  const Y = (y) => H - P - ((y - lo) / (hi - lo)) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.y ?? lo).toFixed(1)}`).join("");
  const fill = area ? `<path class="area" d="${d}L${X(points.length - 1).toFixed(1)},${H - P}L${P},${H - P}Z"/>` : "";
  const first = points[0], last = points[points.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
    ${fill}<path class="line" d="${d}"/>
    <text x="${P}" y="${H - 2}">${first.x}</text>
    <text x="${W - P}" y="${H - 2}" text-anchor="end">${last.x}</text>
    <text x="${P}" y="12">${fmt(hi)}</text>
  </svg>`;
}

// Minimal markdown → HTML: #/##/###, - bullets, **bold**, [t](u), paragraphs.
function renderMd(md) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  const out = [];
  let list = null;
  const closeList = () => { if (list) { out.push("</ul>"); list = null; } };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) { closeList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    const li = line.match(/^[-*]\s+(.*)/);
    if (li) { if (!list) { out.push("<ul>"); list = 1; } out.push(`<li>${inline(li[1])}</li>`); continue; }
    if (!line) { closeList(); continue; }
    closeList(); out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join("\n");
}

if (typeof module !== "undefined") module.exports = { fmtUSD, fmtBig, fmtNum, fmtPct, premiumBadge, svgChart, renderMd };
