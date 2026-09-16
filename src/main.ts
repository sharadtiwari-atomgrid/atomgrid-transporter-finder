import './styles.css';

type Transporter = {
  n: string;
  s: number;
  aq: number | null;
  mn: number | null;
  mx: number | null;
  tat: number | null;
  d: number | null;
  lu: string;
};

type Lane = {
  o: string;
  d: string;
  t: string;
  s: number;
  aq: number | null;
  mn: number | null;
  mx: number | null;
  tat: number | null;
  km: number | null;
  lu: string;
};

type DataSet = {
  meta: { rows: number; ptlShipments: number; uniqueTransporters: number; lanes: number };
  transporters: Transporter[];
  lanes: Lane[];
};

const app = document.querySelector<HTMLDivElement>('#app')!;
const state = { data: null as DataSet | null };

function esc(value: string) {
  return value.replace(/[&<>\"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[ch] || ch));
}
function fmt(value: number | null) { return value == null ? '—' : value.toLocaleString('en-IN'); }
function qtyFit(qty: number, min: number | null, max: number | null) { return (min == null || qty >= min) && (max == null || qty <= max); }
function fitLabel(qty: number, min: number | null, max: number | null) { if (qtyFit(qty, min, max)) return 'Quantity compatible'; if (min != null && qty < min) return `Below ${fmt(min)} KG historical minimum`; if (max != null && qty > max) return `Above ${fmt(max)} KG historical maximum`; return 'Quantity outside history'; }
function daysLabel(value: number | null) { return value == null ? '—' : `${value} days`; }

function renderShell() {
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="brand"><span class="brand-mark">◆</span><div><strong>ATOMGRID</strong><small>GROWING TOGETHER</small></div></div><div class="sidebar-item active">⌕ <span>Transporter Finder</span></div><div class="sidebar-bottom">Internal Use Only</div></aside><main class="main"><header class="topbar"><div>Smarter logistics. Stronger supply chains.</div><div class="avatar">AT</div></header><section class="content"><div class="hero"><div><div class="eyebrow">PTL SOURCING</div><h1>Find transporter options fast</h1><p>Enter the route and quantity. The tool ranks historical PTL options using Atomgrid shipment history.</p></div><div class="snapshot" id="snapshot">Loading data…</div></div><section class="search-card"><div class="field"><label>Pickup Pincode <span>*</span></label><input id="pickup" inputmode="numeric" maxlength="6" placeholder="e.g. 394210" /></div><button class="swap" id="swap" title="Swap route">↔</button><div class="field"><label>Delivery Pincode <span>*</span></label><input id="delivery" inputmode="numeric" maxlength="6" placeholder="e.g. 151001" /></div><div class="field qty-field"><label>Quantity (KG) <span>*</span></label><input id="qty" inputmode="decimal" type="number" min="1" placeholder="e.g. 850" /></div><button class="primary" id="find">Find Options</button></section><div class="hint">Exact pincode-to-pincode history is shown first. Quantity outside a transporter's historical range is not treated as a compatible match.</div><section class="results card"><div class="results-head"><div><div class="eyebrow">RESULTS</div><h2 id="result-title">Enter route and quantity</h2><p id="result-subtitle">Your transporter options will appear here.</p></div><select id="sort"><option value="ship">Most used</option><option value="tat">Fastest TAT</option><option value="distance">Shortest distance</option></select></div><div class="table-wrap"><table><thead><tr><th>Transporter</th><th>Serviceability</th><th>Historical Shipments</th><th>TAT</th><th>Distance</th><th>Historical Qty Range</th><th>Last Used</th></tr></thead><tbody id="results-body"><tr><td colspan="7"><div class="empty">No search yet.</div></td></tr></tbody></table></div></section><div class="footer-note">Historical data only. A transporter appearing here confirms Atomgrid historical usage, not current booking availability. Confirm current availability and cargo acceptance before dispatch.</div></section></main></div>`;
  document.getElementById('find')?.addEventListener('click', runSearch);
  document.getElementById('sort')?.addEventListener('change', runSearch);
  document.getElementById('swap')?.addEventListener('click', () => { const pickup = document.getElementById('pickup') as HTMLInputElement; const delivery = document.getElementById('delivery') as HTMLInputElement; const value = pickup.value; pickup.value = delivery.value; delivery.value = value; runSearch(); });
  ['pickup', 'delivery', 'qty'].forEach(id => document.getElementById(id)?.addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Enter') runSearch(); }));
}

function sortResults(rows: Lane[], mode: string) {
  return [...rows].sort((a, b) => mode === 'tat' ? (a.tat ?? 999) - (b.tat ?? 999) || b.s - a.s : mode === 'distance' ? (a.km ?? 999999) - (b.km ?? 999999) || b.s - a.s : b.s - a.s || (a.tat ?? 999) - (b.tat ?? 999));
}
function rowHtml(row: Lane, qty: number) {
  const compatible = qtyFit(qty, row.mn, row.mx);
  const service = compatible ? 'Exact historical lane' : 'Exact lane • qty outside history';
  const cls = compatible ? 'badge green' : 'badge amber';
  return `<tr><td><strong>${esc(row.t)}</strong><small>${row.o} → ${row.d}</small></td><td><span class="${cls}">${service}</span></td><td><strong>${fmt(row.s)}</strong></td><td>${daysLabel(row.tat)}</td><td>${fmt(row.km)} km</td><td>${fmt(row.mn)}–${fmt(row.mx)} KG<small>${esc(fitLabel(qty, row.mn, row.mx))}</small></td><td>${row.lu || '—'}</td></tr>`;
}
function networkRowHtml(row: Transporter, qty: number) {
  return `<tr class="network-row"><td><strong>${esc(row.n)}</strong><small>Historical network usage — not an exact lane match</small></td><td><span class="badge blue">Network option</span></td><td><strong>${fmt(row.s)}</strong></td><td>${daysLabel(row.tat)}</td><td>${fmt(row.d)} km</td><td>${fmt(row.mn)}–${fmt(row.mx)} KG<small>${esc(fitLabel(qty, row.mn, row.mx))}</small></td><td>${row.lu || '—'}</td></tr>`;
}

function runSearch() {
  if (!state.data) return;
  const pickup = (document.getElementById('pickup') as HTMLInputElement).value.trim();
  const delivery = (document.getElementById('delivery') as HTMLInputElement).value.trim();
  const qty = Number((document.getElementById('qty') as HTMLInputElement).value || 0);
  const sort = (document.getElementById('sort') as HTMLSelectElement).value;
  const title = document.getElementById('result-title')!;
  const subtitle = document.getElementById('result-subtitle')!;
  const body = document.getElementById('results-body')!;
  if (!/^\d{6}$/.test(pickup) || !/^\d{6}$/.test(delivery) || qty <= 0) { title.textContent = 'Enter valid inputs'; subtitle.textContent = 'Use 6-digit pickup and delivery pincodes and a quantity above 0 KG.'; body.innerHTML = '<tr><td colspan="7"><div class="empty">Complete the three fields to see transporter options.</div></td></tr>'; return; }
  const exactAll = state.data.lanes.filter(lane => lane.o === pickup && lane.d === delivery);
  const exactCompatible = exactAll.filter(lane => qtyFit(qty, lane.mn, lane.mx));
  const exactRows = sortResults(exactCompatible, sort);
  const networkRows = exactRows.length === 0 ? state.data.transporters.filter(t => qtyFit(qty, t.mn, t.mx)).sort((a, b) => b.s - a.s || (a.tat ?? 999) - (b.tat ?? 999)).slice(0, 8) : [];
  if (exactRows.length) { title.textContent = `${exactRows.length} transporter option${exactRows.length === 1 ? '' : 's'}`; subtitle.textContent = `${pickup} → ${delivery} • ${fmt(qty)} KG • exact historical lane + quantity match`; body.innerHTML = exactRows.map(row => rowHtml(row, qty)).join(''); return; }
  if (exactAll.length) { title.textContent = 'Exact lane found, but quantity is outside history'; subtitle.textContent = `${pickup} → ${delivery} • ${fmt(qty)} KG`; body.innerHTML = sortResults(exactAll, sort).map(row => rowHtml(row, qty)).join(''); return; }
  if (networkRows.length) { title.textContent = 'No exact lane history — network options'; subtitle.textContent = `${pickup} → ${delivery} • ${fmt(qty)} KG • quantity-compatible historical transporter network`; body.innerHTML = networkRows.map(row => networkRowHtml(row, qty)).join(''); return; }
  title.textContent = 'No compatible transporter history found'; subtitle.textContent = `${pickup} → ${delivery} • ${fmt(qty)} KG`; body.innerHTML = '<tr><td colspan="7"><div class="empty">No historical transporter matches the requested quantity. Try a nearby pincode, a different quantity, or verify a new carrier externally.</div></td></tr>';
}

async function loadData() {
  const response = await fetch('/api/data', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Dataset request failed: ${response.status}`);
  const data = await response.json() as DataSet;
  if (!data?.lanes?.length || !data?.transporters?.length) throw new Error('Dataset is empty');
  return data;
}

renderShell();
loadData().then(data => { state.data = data; document.getElementById('snapshot')!.textContent = `${data.meta.ptlShipments.toLocaleString('en-IN')} PTL shipments • ${data.meta.uniqueTransporters} historical transporters`; }).catch(error => { console.error(error); document.getElementById('snapshot')!.textContent = 'Data unavailable'; document.getElementById('result-title')!.textContent = 'Historical data could not be loaded'; document.getElementById('result-subtitle')!.textContent = 'Refresh the page and try again.'; });
