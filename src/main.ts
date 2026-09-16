import './styles.css';

type Transporter = { n: string; s: number; aq: number | null; mn: number | null; mx: number | null; tat: number | null; d: number | null; lu: string };
type Lane = { o: string; d: string; t: string; s: number; aq: number | null; mn: number | null; mx: number | null; tat: number | null; km: number | null; lu: string };
type DataSet = { meta: { rows: number; ptlShipments: number; uniqueTransporters: number; lanes: number }; transporters: Transporter[]; lanes: Lane[] };
type Match = Lane & { score: number; confidence: 'High' | 'Medium' | 'Low'; exact: boolean; qtyCompatible: boolean; reasons: string[] };
type NetworkMatch = Transporter & { score: number; confidence: 'Medium' | 'Low'; reasons: string[] };

const app = document.querySelector<HTMLDivElement>('#app')!;
const state = { data: null as DataSet | null };

function esc(value: string) { return value.replace(/[&<>\"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[ch] || ch)); }
function fmt(value: number | null) { return value == null ? '—' : value.toLocaleString('en-IN'); }
function qtyFit(qty: number, min: number | null, max: number | null) { return (min == null || qty >= min) && (max == null || qty <= max); }
function qtyLabel(qty: number, min: number | null, max: number | null) { if (qtyFit(qty, min, max)) return 'Fits historical range'; if (min != null && qty < min) return `Below ${fmt(min)} KG minimum`; if (max != null && qty > max) return `Above ${fmt(max)} KG maximum`; return 'Outside historical range'; }
function daysLabel(value: number | null) { return value == null ? '—' : `${value} days`; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

function smartLaneScore(lane: Lane, qty: number, maxShipments: number, maxDistance: number): Match {
  const qtyCompatible = qtyFit(qty, lane.mn, lane.mx);
  const volumeScore = maxShipments ? (lane.s / maxShipments) * 18 : 0;
  const tatScore = lane.tat == null ? 4 : clamp(12 - lane.tat * 2, 2, 12);
  const distanceScore = lane.km == null || !maxDistance ? 4 : clamp(8 - (lane.km / maxDistance) * 6, 1, 8);
  const score = Math.round(clamp(40 + (qtyCompatible ? 22 : 0) + volumeScore + tatScore + distanceScore, 0, 100));
  const reasons: string[] = ['Exact pincode lane history'];
  if (qtyCompatible) reasons.push('Quantity fits historical range');
  if (lane.s >= Math.max(5, maxShipments * 0.35)) reasons.push('Strong historical usage');
  if (lane.tat != null && lane.tat <= 3) reasons.push('Historically fast TAT');
  if (lane.lu) reasons.push(`Last used ${lane.lu}`);
  return { ...lane, score, confidence: qtyCompatible && lane.s >= 5 ? 'High' : qtyCompatible ? 'Medium' : 'Low', exact: true, qtyCompatible, reasons };
}

function networkScore(t: Transporter, qty: number, maxShipments: number): NetworkMatch {
  const compatible = qtyFit(qty, t.mn, t.mx);
  const volumeScore = maxShipments ? (t.s / maxShipments) * 35 : 0;
  const tatScore = t.tat == null ? 5 : clamp(15 - t.tat * 2, 3, 15);
  const score = Math.round(clamp(25 + (compatible ? 30 : 0) + volumeScore + tatScore, 0, 85));
  const reasons = ['Historical network usage'];
  if (compatible) reasons.push('Quantity fits historical range');
  if (t.s >= Math.max(8, maxShipments * 0.25)) reasons.push('Frequently used in PTL history');
  if (t.tat != null && t.tat <= 3) reasons.push('Historically fast TAT');
  return { ...t, score, confidence: compatible ? 'Medium' : 'Low', reasons };
}

function renderShell() {
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="brand"><span class="brand-mark">◆</span><div><strong>ATOMGRID</strong><small>GROWING TOGETHER</small></div></div><div class="sidebar-block"><span class="nav-label">SMART SOURCING</span><div class="sidebar-item active"><span class="nav-dot"></span>Transporter Finder</div></div><div class="sidebar-bottom"><span>Internal Use Only</span><b>PTL Sourcing Desk</b></div></aside><main class="main"><header class="topbar"><div><span class="top-kicker">SUPPLY CHAIN INTELLIGENCE</span><strong>Transporter Finder</strong></div><div class="top-actions"><span class="live-dot">Live</span><div class="avatar">AT</div></div></header><section class="content"><div class="hero"><div class="hero-copy"><div class="eyebrow">SMART PTL SOURCING</div><h1>Find transporter options<br><span>in a few seconds.</span></h1><p>Enter a route and quantity. Smart Match combines exact lane history, quantity fit, usage and TAT to surface relevant options.</p></div><div class="hero-card"><div class="hero-card-label">HISTORICAL INDEX</div><div class="hero-big" id="hero-big">—</div><div class="hero-sub" id="hero-sub">Loading Atomgrid PTL data…</div></div></div><section class="search-card"><div class="field"><label>Pickup Pincode <span>*</span></label><input id="pickup" inputmode="numeric" maxlength="6" placeholder="394210" /></div><button class="swap" id="swap" title="Swap route">↔</button><div class="field"><label>Delivery Pincode <span>*</span></label><input id="delivery" inputmode="numeric" maxlength="6" placeholder="151001" /></div><div class="field qty-field"><label>Quantity (KG) <span>*</span></label><input id="qty" inputmode="decimal" type="number" min="1" placeholder="850" /></div><button class="primary" id="find"><span>Find Transporters</span><span class="button-arrow">→</span></button></section><div class="smart-strip"><div class="smart-icon">✦</div><div><strong>Smart Match</strong><span>Exact lane first, then quantity fit, historical usage and TAT.</span></div><div class="smart-chip">Historical-first</div></div><section class="results card"><div class="results-head"><div><div class="eyebrow">MATCH RESULTS</div><h2 id="result-title">Enter route and quantity</h2><p id="result-subtitle">Your transporter shortlist will appear here.</p></div><div class="result-tools"><span id="result-count" class="count-pill">0 options</span><select id="sort"><option value="smart">Smart Match</option><option value="ship">Most used</option><option value="tat">Fastest TAT</option><option value="distance">Shortest distance</option></select></div></div><div id="ai-summary" class="ai-summary hidden"></div><div id="results-grid" class="results-grid"></div></section><div class="footer-note"><strong>Data note:</strong> Smart Match uses Atomgrid historical PTL movements. Historical use does not guarantee current availability; confirm booking and cargo acceptance before dispatch.</div></section></main></div>`;
  document.getElementById('find')?.addEventListener('click', runSearch);
  document.getElementById('sort')?.addEventListener('change', runSearch);
  document.getElementById('swap')?.addEventListener('click', () => { const pickup = document.getElementById('pickup') as HTMLInputElement; const delivery = document.getElementById('delivery') as HTMLInputElement; const value = pickup.value; pickup.value = delivery.value; delivery.value = value; runSearch(); });
  ['pickup', 'delivery', 'qty'].forEach(id => document.getElementById(id)?.addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Enter') runSearch(); }));
}

function confidenceClass(value: string) { return value === 'High' ? 'high' : value === 'Medium' ? 'medium' : 'low'; }
function transporterCard(match: Match | NetworkMatch, qty: number, rank: number, network = false) {
  const compatible = 'qtyCompatible' in match ? match.qtyCompatible : qtyFit(qty, match.mn, match.mx);
  const confidence = match.confidence;
  const badge = network ? 'Network option' : 'Exact historical lane';
  const distance = 'km' in match ? match.km : match.d;
  const route = 'o' in match ? `${match.o} → ${match.d}` : 'Historical network usage';
  return `<article class="transporter-card ${rank === 1 ? 'featured' : ''}"><div class="rank">#${rank}</div><div class="card-top"><div><div class="transporter-name">${esc(match.t || match.n)}</div><div class="route-line">${esc(route)}</div></div><div class="score-block"><div class="score">${match.score}</div><div class="score-label">SMART<br>MATCH</div></div></div><div class="badges"><span class="badge ${network ? 'blue' : 'green'}">${badge}</span><span class="confidence ${confidenceClass(confidence)}">${confidence} confidence</span></div><div class="metric-grid"><div><span>Historical use</span><strong>${fmt(match.s)} shipments</strong></div><div><span>TAT</span><strong>${daysLabel(match.tat)}</strong></div><div><span>Distance</span><strong>${fmt(distance)} km</strong></div><div><span>Qty range</span><strong>${fmt(match.mn)}–${fmt(match.mx)} KG</strong></div></div><div class="why"><span>Why it matches</span><div class="reason-list">${match.reasons.slice(0, 3).map(reason => `<span>✓ ${esc(reason)}</span>`).join('')}</div></div><div class="card-foot"><span class="qty-status ${compatible ? 'fit' : 'no-fit'}">${esc(compatible ? 'Quantity compatible' : qtyLabel(qty, match.mn, match.mx))}</span><span class="last-used">Last used ${esc(match.lu || '—')}</span></div></article>`;
}

function renderEmpty(title: string, subtitle: string, message: string) {
  document.getElementById('result-title')!.textContent = title;
  document.getElementById('result-subtitle')!.textContent = subtitle;
  document.getElementById('result-count')!.textContent = '0 options';
  document.getElementById('results-grid')!.innerHTML = `<div class="empty-state"><div class="empty-icon">⌕</div><strong>${esc(message)}</strong><span>Use a 6-digit pickup pincode, delivery pincode and quantity.</span></div>`;
  document.getElementById('ai-summary')!.classList.add('hidden');
}

function renderSmartSummary(top: Match | NetworkMatch, count: number, exact: boolean) {
  const summary = document.getElementById('ai-summary')!;
  const name = 't' in top ? top.t : top.n;
  const note = exact ? `${top.score}/100 smart match based on lane history, quantity fit, usage and TAT.` : `${top.score}/100 network fit based on historical usage, quantity compatibility and TAT.`;
  summary.innerHTML = `<div class="ai-orb">✦</div><div><div class="ai-title">Smart sourcing view</div><div class="ai-main">${exact ? 'Top historical match' : 'Best historical network fit'}: ${esc(name)}</div><div class="ai-note">${esc(note)} ${count > 1 ? `Showing ${count} relevant options below.` : ''}</div></div>`;
  summary.classList.remove('hidden');
}

function runSearch() {
  if (!state.data) return;
  const pickup = (document.getElementById('pickup') as HTMLInputElement).value.trim();
  const delivery = (document.getElementById('delivery') as HTMLInputElement).value.trim();
  const qty = Number((document.getElementById('qty') as HTMLInputElement).value || 0);
  const sort = (document.getElementById('sort') as HTMLSelectElement).value;
  if (!/^\d{6}$/.test(pickup) || !/^\d{6}$/.test(delivery) || qty <= 0) { renderEmpty('Enter valid inputs', 'Complete all three fields to see transporter options.', 'Start with your pickup, delivery and quantity.'); return; }
  const exactAll = state.data.lanes.filter(lane => lane.o === pickup && lane.d === delivery);
  const maxShipments = Math.max(...(exactAll.map(l => l.s).concat([1])));
  const maxDistance = Math.max(...(exactAll.map(l => l.km ?? 0).concat([1])));
  let exactMatches = exactAll.map(lane => smartLaneScore(lane, qty, maxShipments, maxDistance)).filter(match => match.qtyCompatible);
  if (sort === 'ship') exactMatches.sort((a, b) => b.s - a.s || b.score - a.score); else if (sort === 'tat') exactMatches.sort((a, b) => (a.tat ?? 999) - (b.tat ?? 999) || b.score - a.score); else if (sort === 'distance') exactMatches.sort((a, b) => (a.km ?? 999999) - (b.km ?? 999999) || b.score - a.score); else exactMatches.sort((a, b) => b.score - a.score);
  if (exactMatches.length) {
    document.getElementById('result-title')!.textContent = `${exactMatches.length} transporter option${exactMatches.length === 1 ? '' : 's'} found`;
    document.getElementById('result-subtitle')!.textContent = `${pickup} → ${delivery} • ${fmt(qty)} KG • exact historical lane`;
    document.getElementById('result-count')!.textContent = `${exactMatches.length} options`;
    renderSmartSummary(exactMatches[0], exactMatches.length, true);
    document.getElementById('results-grid')!.innerHTML = exactMatches.slice(0, 8).map((match, index) => transporterCard(match, qty, index + 1)).join('');
    return;
  }
  if (exactAll.length) {
    const outside = exactAll.map(lane => smartLaneScore(lane, qty, maxShipments, maxDistance)).sort((a, b) => b.s - a.s);
    document.getElementById('result-title')!.textContent = 'Exact lane found, quantity outside history';
    document.getElementById('result-subtitle')!.textContent = `${pickup} → ${delivery} • ${fmt(qty)} KG`;
    document.getElementById('result-count')!.textContent = `${outside.length} historical lane${outside.length === 1 ? '' : 's'}`;
    const summary = document.getElementById('ai-summary')!;
    summary.innerHTML = `<div class="ai-orb warn">!</div><div><div class="ai-title">Smart sourcing view</div><div class="ai-main">The lane exists, but your quantity is outside the historical range.</div><div class="ai-note">Showing lane evidence so you can decide whether to seek an exception or use an alternate transporter.</div></div>`;
    summary.classList.remove('hidden');
    document.getElementById('results-grid')!.innerHTML = outside.slice(0, 8).map((match, index) => transporterCard(match, qty, index + 1)).join('');
    return;
  }
  const compatible = state.data.transporters.filter(t => qtyFit(qty, t.mn, t.mx));
  const maxNetworkShip = Math.max(...(compatible.map(t => t.s).concat([1])));
  const network = compatible.map(t => networkScore(t, qty, maxNetworkShip)).sort((a, b) => b.score - a.score).slice(0, 8);
  if (network.length) {
    document.getElementById('result-title')!.textContent = 'No exact lane history — best network options';
    document.getElementById('result-subtitle')!.textContent = `${pickup} → ${delivery} • ${fmt(qty)} KG • historical transporter network`;
    document.getElementById('result-count')!.textContent = `${network.length} options`;
    renderSmartSummary(network[0], network.length, false);
    document.getElementById('results-grid')!.innerHTML = network.map((match, index) => transporterCard(match, qty, index + 1, true)).join('');
    return;
  }
  renderEmpty('No compatible transporter history found', `${pickup} → ${delivery} • ${fmt(qty)} KG`, 'No historical transporter matches this quantity.');
}

async function loadData() {
  const response = await fetch('/api/data', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Dataset request failed: ${response.status}`);
  const data = await response.json() as DataSet;
  if (!data?.lanes?.length || !data?.transporters?.length) throw new Error('Dataset is empty');
  return data;
}

renderShell();
loadData().then(data => { state.data = data; document.getElementById('hero-big')!.textContent = data.meta.ptlShipments.toLocaleString('en-IN'); document.getElementById('hero-sub')!.textContent = `${data.meta.uniqueTransporters} transporters • ${data.meta.lanes} lane records`; }).catch(error => { console.error(error); document.getElementById('hero-big')!.textContent = '—'; document.getElementById('hero-sub')!.textContent = 'Historical data unavailable'; renderEmpty('Historical data could not be loaded', 'Refresh the page and try again.', 'The PTL historical index is temporarily unavailable.'); });
