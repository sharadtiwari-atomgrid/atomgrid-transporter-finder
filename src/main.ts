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
  source?: 'historical' | 'external';
  contact?: string;
};

type DataSet = {
  meta: { rows: number; ptlShipments: number; uniqueTransporters: number; lanes: number };
  transporters: Transporter[];
  lanes: Lane[];
};

type ExternalProvider = {
  n: string;
  regions: string[];
  corridors: string[];
  minKg: number | null;
  maxKg: number | null;
  contact: string;
  email: string;
  source: string;
  note: string;
};

const EXTERNAL_PROVIDERS: ExternalProvider[] = [
  { n: 'DNS Logistics', regions: ['West','North','South','Pan India'], corridors: ['Pan India','B2B express'], minKg: 1, maxKg: 5000, contact: '+91 90827 36097', email: 'info@dnslogistic.com', source: 'https://www.dnslogistic.com/services/ptl', note: 'Public PTL network; hazardous/restricted cargo requires prior agreement.' },
  { n: 'Fast Trackon Logistics', regions: ['West','North','South','East','Pan India'], corridors: ['Pan India'], minKg: 50, maxKg: 5000, contact: '+91 88288 81414', email: 'support@fasttrackonlogistics.com', source: 'https://www.fasttrackonlogistics.com/services/ptl', note: 'Public PTL network; special cargo acceptance must be confirmed.' },
  { n: 'CTC India', regions: ['North','West','South','East','Pan India'], corridors: ['Delhi-Mumbai','Delhi-Kolkata','Mumbai-Kolkata','Pan India'], minKg: null, maxKg: null, contact: '+91 9873294018', email: 'info@ctcipl.com', source: 'https://www.ctcipl.com/services/part-truck-load-ptl', note: 'Pan-India PTL coverage published on official site.' },
  { n: 'Bombay Kandla Transport', regions: ['West','North','South','East','Pan India'], corridors: ['Pan India','Industrial corridors'], minKg: null, maxKg: null, contact: 'Public contact via official site', email: 'sales@bombaykandla.com', source: 'https://bktpl.co.in/', note: 'Industrial/FMCG PTL published on official site; special cargo acceptance must be confirmed.' },
  { n: 'Superior Transways', regions: ['West','North','South'], corridors: ['West-North','West-South'], minKg: null, maxKg: null, contact: '+91 7770026141', email: 'superiortransways18@gmail.com', source: 'https://superiortransways.com/part-load-transportation/', note: 'Regional PTL option; exact pincode serviceability must be verified.' },
  { n: 'URTC Group', regions: ['West','Central','East'], corridors: ['Gujarat-Maharashtra','Gujarat-Chhattisgarh','Gujarat-Odisha','Pan India'], minKg: null, maxKg: null, contact: 'Public contact via official site', email: '', source: 'https://www.urtcgroup.com/services/part-load-transport-services/', note: 'Regional/corridor PTL option; exact pincode serviceability must be verified.' },
  { n: 'Jai Ambey Roadline', regions: ['North','West','Central','Pan India'], corridors: ['Pan India'], minKg: null, maxKg: null, contact: 'Public contact via official site', email: '', source: 'https://www.jaiambeyroadline.com/network', note: 'Pan-India network published; exact PTL lane must be verified.' },
  { n: 'Mukund Logistics', regions: ['North','Central'], corridors: ['Delhi NCR','North India'], minKg: null, maxKg: null, contact: 'Public contact via official site', email: '', source: 'https://www.mukundlogistic.com/ncr/services/part-load/', note: 'North India / NCR PTL option; exact pincode serviceability must be verified.' },
  { n: 'Malwa Golden Logistics', regions: ['North'], corridors: ['Punjab-Haryana-Delhi NCR','North India'], minKg: null, maxKg: null, contact: '+91 94637 37337', email: 'info@malwagolden.com', source: 'https://www.malwagolden.com/', note: 'North India regional option; exact pincode serviceability must be verified.' },
  { n: 'AKT Logistics', regions: ['North'], corridors: ['Uttarakhand-UP-Delhi','North India'], minKg: null, maxKg: null, contact: '+91 9720253030', email: 'admin@aktlogistics.co.in', source: 'https://aktlogistics.co.in', note: 'North India regional option; exact pincode serviceability must be verified.' },
  { n: 'Master Ashirwad Roadways', regions: ['North'], corridors: ['Uttarakhand-North India'], minKg: null, maxKg: null, contact: '05944 240107', email: 'master_ashirwadroadways@yahoo.com', source: 'https://masterashirwad.com', note: 'North India regional option; exact pincode serviceability must be verified.' },
  { n: 'Unique Carriers', regions: ['North'], corridors: ['Punjab-Haryana-Delhi-UP-Rajasthan-Uttarakhand'], minKg: null, maxKg: null, contact: '0172-4788763', email: 'mohali@uniquecarriers.in', source: 'https://uniquecarriers.in', note: 'North India network; PTL suitability and exact pincode serviceability must be verified.' },
  { n: 'SRL Carriers', regions: ['North'], corridors: ['Haryana-UP-Uttarakhand-North India'], minKg: null, maxKg: null, contact: '+91 95377 86932', email: 'mumbai@srlcarriers.com', source: 'https://srlcarriers.com', note: 'North India regional option; exact pincode serviceability must be verified.' },
  { n: 'Narsik Logistics', regions: ['North','West','Central'], corridors: ['Rajasthan-Delhi NCR-UP-MP-Gujarat'], minKg: null, maxKg: null, contact: '+91 9929031702', email: 'info@narsiklogistics.com', source: 'https://narsiklogistics.com', note: 'Rajasthan / Delhi NCR / UP / MP / Gujarat corridors; exact pincode serviceability must be verified.' },
  { n: 'Puran Bharat Road Carriers', regions: ['North','West'], corridors: ['Rajasthan-Haryana-Delhi NCR-UP'], minKg: null, maxKg: null, contact: '+91 9560622819', email: 'madhavyadav@pbrc.co.in', source: 'https://pbrc.co.in', note: 'North/West corridor option; exact pincode serviceability must be verified.' }
];

const DATA_B64 = [
  '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',
].join('');

const app = document.querySelector<HTMLDivElement>('#app')!;
const state = { data: null as DataSet | null, view: 'finder', results: [] as Lane[], query: '', note: '' };

async function decodeData(): Promise<DataSet> {
  const normalized = DATA_B64.replace(/\s+/g, '');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  if (typeof DecompressionStream === 'undefined') throw new Error('Gzip decompression is not supported in this browser.');
  const compressedStream = new Response(bytes).body;
  if (!compressedStream) throw new Error('Unable to create the dataset byte stream.');
  const decompressedStream = compressedStream.pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(decompressedStream).text();
  const data = JSON.parse(text) as DataSet;
  if (!data?.lanes?.length || !data?.transporters?.length) throw new Error('The historical PTL dataset is empty.');
  return data;
}

function esc(value: string) { return value.replace(/[&<>\"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[ch] || ch); }
function fmt(value: number | null) { return value == null ? '—' : value.toLocaleString('en-IN'); }
function pincodeRegion(pin: string) { const first = Number(pin.slice(0, 1)); if (first === 1 || first === 2) return 'North'; if (first === 3 || first === 4) return 'West'; if (first === 5 || first === 6) return 'South'; if (first === 7 || first === 8) return 'East'; return 'Central'; }
function externalScore(provider: ExternalProvider, pickup: string, delivery: string, qty: number) { const pickupRegion = pincodeRegion(pickup); const deliveryRegion = pincodeRegion(delivery); let score = provider.regions.includes('Pan India') ? 30 : 0; if (provider.regions.includes(pickupRegion)) score += 22; if (provider.regions.includes(deliveryRegion)) score += 22; if (pickupRegion === deliveryRegion && provider.regions.includes(pickupRegion)) score += 14; if (provider.minKg != null && qty >= provider.minKg) score += 4; if (provider.maxKg != null && qty <= provider.maxKg) score += 4; return score; }
function cargoFit(provider: ExternalProvider, cargo: string) { if (cargo === 'General') return { label: 'Published PTL', rank: 3 }; if (provider.n === 'DNS Logistics' && cargo === 'Hazardous') return { label: 'Prior approval stated', rank: 3 }; return { label: 'Verify acceptance', rank: 1 }; }
function externalFallbackRows(pickup: string, delivery: string, qty: number, cargo: string) { return EXTERNAL_PROVIDERS.map(provider => ({ provider, score: externalScore(provider, pickup, delivery, qty), cargo: cargoFit(provider, cargo) })).filter(item => item.score > 20).sort((a, b) => (b.cargo.rank - a.cargo.rank) || (b.score - a.score)).slice(0, 6).map(({ provider, score, cargo: fit }) => `<tr><td><strong>${esc(provider.n)}</strong><small>${pincodeRegion(pickup)} → ${pincodeRegion(delivery)} regional fit</small></td><td><span class="badge amber">External • Verify</span></td><td>Verify</td><td>—</td><td>—</td><td>${esc(provider.contact)}${provider.email ? `<br><small>${esc(provider.email)}</small>` : ''}</td><td>${esc(fit.label)}</td><td><a href="${esc(provider.source)}" target="_blank" rel="noreferrer">Source</a></td><td>${score >= 60 ? 'High' : score >= 45 ? 'Medium' : 'Broad'}</td></tr>`).join(''); }
function laneCard(lane: Lane, idx: number, status: string) { const badge = status === 'Historical Lane' ? 'blue' : 'green'; const contact = lane.contact || 'Enrichment pending'; return `<tr><td><strong>${esc(lane.t)}</strong><small>${lane.o} → ${lane.d}</small></td><td><span class="badge ${badge}">${esc(status)}</span></td><td>${lane.tat == null ? '—' : `${lane.tat} days`}</td><td>${lane.s}</td><td>${fmt(lane.km)} km</td><td>${esc(contact)}</td><td><button class="view" data-lane="${idx}">View</button></td></tr>`; }

function renderFinder(results: Lane[], note: string) {
  const pickup = (document.getElementById('pickup') as HTMLInputElement | null)?.value || '';
  const delivery = (document.getElementById('delivery') as HTMLInputElement | null)?.value || '';
  const qty = Number((document.getElementById('qty') as HTMLInputElement | null)?.value || 0);
  const cargo = (document.getElementById('cargo') as HTMLSelectElement | null)?.value || 'General';
  state.results = results; state.note = note;
  const routeLabel = `${pickup || '—'} → ${delivery || '—'}`;
  const historicalRows = results.length ? results.map((lane, idx) => { const status = note.includes('outside') ? 'Qty outside historical range' : pickup && delivery ? 'Historical Lane' : 'Historical Network'; return laneCard(lane, idx, status); }).join('') : `<tr><td colspan="7"><div class="empty">No historical transporter found for ${esc(routeLabel)}${qty ? ` at ${fmt(qty)} KG` : ''}. Try another lane or use Transporter Directory.</div></td></tr>`;

  document.querySelector<HTMLDivElement>('#view')!.innerHTML = `
    <div class="title-row"><div><h1>Transporter Finder</h1><p>Find PTL options using Atomgrid FY 2026-27 historical shipment data.</p></div><button class="outline" id="reset">Reset</button></div>
    <section class="search-card">
      <div class="field"><label>Pickup Pincode <em>*</em></label><input id="pickup" value="${esc(pickup)}" maxlength="6"><small>6-digit pincode</small></div>
      <button class="swap" id="swap">↔</button>
      <div class="field"><label>Delivery Pincode <em>*</em></label><input id="delivery" value="${esc(delivery)}" maxlength="6"><small>6-digit pincode</small></div>
      <div class="field"><label>Quantity (KG) <em>*</em></label><input id="qty" value="${qty || ''}" type="number" min="1"></div>
      <div class="field"><label>Cargo Type</label><select id="cargo"><option value="General" ${cargo === 'General' ? 'selected' : ''}>General</option><option value="Chemical" ${cargo === 'Chemical' ? 'selected' : ''}>Chemical</option><option value="Hazardous" ${cargo === 'Hazardous' ? 'selected' : ''}>Hazardous</option><option value="Agrochemical" ${cargo === 'Agrochemical' ? 'selected' : ''}>Agrochemical</option></select></div>
      <button class="primary" id="find">Find Transporters</button>
    </section>
    <div class="layout">
      <section class="results card">
        <div class="results-head"><div><h2>Transporters (${results.length})</h2><p>${esc(note || 'Search a pincode-to-pincode lane to see exact historical matches.')}</p></div><select id="sort"><option value="ship">Historical Usage</option><option value="tat">TAT</option><option value="distance">Distance</option></select></div>
        <div class="table-wrap"><table><thead><tr><th>Transporter</th><th>Serviceability</th><th>TAT</th><th>Historical Shipments</th><th>Distance</th><th>Contact</th><th>Action</th></tr></thead><tbody>${historicalRows}</tbody></table></div><div class="external-fallback"><div class="section-heading"><div><h3>External Regional Fallback</h3><p>Shown only as a sourcing fallback. Ordering uses pickup/delivery pincode region fit.</p></div></div><div class="table-wrap"><table><thead><tr><th>Transporter</th><th>Status</th><th>TAT</th><th>Shipments</th><th>Distance</th><th>Contact</th><th>Cargo Suitability</th><th>Source</th><th>Regional Fit</th></tr></thead><tbody>${externalFallbackRows(pickup, delivery, qty, cargo) || '<tr><td colspan="9"><div class="empty">No regional fallback matched.</div></td></tr>'}</tbody></table></div></div>
      </section>
      <aside class="right-col">
        <section class="card route-card"><h3>Route Overview</h3><div class="route-point"><i class="dot green"></i><div><b>${esc(pickup || 'Pickup')}</b><small>Pickup pincode</small></div></div><div class="route-line"></div><div class="route-point"><i class="dot red"></i><div><b>${esc(delivery || 'Delivery')}</b><small>Delivery pincode</small></div></div><div class="route-facts"><span>Approx. distance<strong>${results[0]?.km ? `${fmt(results[0].km)} km` : '—'}</strong></span><span>Historical PTL TAT<strong>${results.length && results.every(r => r.tat != null) ? `${Math.min(...results.map(r => r.tat!))}–${Math.max(...results.map(r => r.tat!))} days` : '—'}</strong></span></div></section>
        <section class="card"><h3>Data Snapshot</h3><div class="route-facts"><span>PTL shipments<strong>${state.data?.meta.ptlShipments.toLocaleString('en-IN')}</strong></span><span>Historical transporters<strong>${state.data?.meta.uniqueTransporters}</strong></span><span>Pincode lanes<strong>${state.data?.meta.lanes}</strong></span></div></section>
      </aside>
    </div>
    <section class="external-section"><div class="section-heading"><div><h3>Public PTL Network Sources</h3><p>These options come from current public company websites and are kept separate from Atomgrid historical lane facts.</p></div></div><div class="source-grid-list"><article class="source-card"><h4>DNS Logistics</h4><p>Pan India B2B PTL. Public contact: +91 90827 36097 | info@dnslogistic.com</p><small>18,000+ pincodes stated on official PTL page. Hazardous/restricted cargo requires prior written agreement.</small><a href="https://www.dnslogistic.com/services/ptl" target="_blank" rel="noreferrer">Official source</a></article><article class="source-card"><h4>Fast Trackon Logistics</h4><p>Pan India PTL. Public contact: +91 88288 81414 | support@fasttrackonlogistics.com</p><small>28,000+ pincodes and 500+ routes stated on official PTL page. Special cargo acceptance must be confirmed.</small><a href="https://www.fasttrackonlogistics.com/services/ptl" target="_blank" rel="noreferrer">Official source</a></article><article class="source-card"><h4>CTC India</h4><p>Pan India PTL. Public contact: +91 9873294018 | info@ctcipl.com</p><small>Major India corridors and PTL services stated on official site.</small><a href="https://www.ctcipl.com/services/part-truck-load-ptl" target="_blank" rel="noreferrer">Official source</a></article><article class="source-card"><h4>Bombay Kandla Transport</h4><p>Pan India PTL. Public contact: sales@bombaykandla.com</p><small>Branches across India and PTL for industrial/FMCG cargo stated on official site. Special cargo acceptance must be confirmed.</small><a href="https://bktpl.co.in/" target="_blank" rel="noreferrer">Official source</a></article></div></section><div class="note">${esc(note || 'Exact pincode history is preferred. Quantity is compared with the historical min/max quantity for the selected transporter-lane.')}</div>
    <div class="modal hidden" id="modal"><div class="modal-box"><button class="close" id="close">×</button><h2 id="modal-title"></h2><p id="modal-body"></p></div></div>`;
  wireFinder();
}

function renderDirectory() { const data = state.data!; const filtered = data.transporters.filter(t => t.n.toLowerCase().includes(state.query.toLowerCase())); const rows = filtered.map(t => `<tr><td><strong>${esc(t.n)}</strong><small>Historical PTL usage</small></td><td>${t.s}</td><td>${t.tat == null ? '—' : `${t.tat} days`}</td><td>${fmt(t.aq)} kg</td><td>${fmt(t.mn)}–${fmt(t.mx)} kg</td><td>${fmt(t.d)} km</td><td>${t.lu || '—'}</td></tr>`).join(''); document.querySelector<HTMLDivElement>('#view')!.innerHTML = `<div class="title-row"><div><h1>Transporter Directory</h1><p>${filtered.length} transporters from Atomgrid PTL history.</p></div></div><section class="results card"><div class="results-head"><div><h2>Historical Transporter Master</h2><p>Aggregate PTL usage across FY 2026-27.</p></div><input id="directory-search" value="${esc(state.query)}" placeholder="Search transporter"></div><div class="table-wrap"><table><thead><tr><th>Transporter</th><th>PTL Shipments</th><th>Median TAT</th><th>Avg Qty</th><th>Historical Qty Range</th><th>Avg Distance</th><th>Last Used</th></tr></thead><tbody>${rows}</tbody></table></div></section><div class="note">Contact enrichment is intentionally kept separate from historical shipment facts and will be added after verification.</div>`; document.getElementById('directory-search')?.addEventListener('input', event => { state.query = (event.target as HTMLInputElement).value; renderDirectory(); }); }
function renderLaneIntel() { const data = state.data!; const lanes = [...data.lanes].sort((a, b) => b.s - a.s).slice(0, 50); const rows = lanes.map(l => `<tr><td>${l.o}</td><td>${l.d}</td><td><strong>${esc(l.t)}</strong></td><td>${l.s}</td><td>${l.tat ?? '—'} days</td><td>${fmt(l.km)} km</td><td>${l.lu || '—'}</td></tr>`).join(''); document.querySelector<HTMLDivElement>('#view')!.innerHTML = `<div class="title-row"><div><h1>Lane Intelligence</h1><p>Most-used PTL lanes from the Atomgrid historical dataset.</p></div></div><section class="results card"><div class="results-head"><div><h2>Top Historical Lanes</h2><p>Ranked by PTL shipment count.</p></div></div><div class="table-wrap"><table><thead><tr><th>Pickup</th><th>Delivery</th><th>Transporter</th><th>Shipments</th><th>TAT</th><th>Distance</th><th>Last Used</th></tr></thead><tbody>${rows}</tbody></table></div></section>`; }
function renderAdmin() { const meta = state.data!.meta; document.querySelector<HTMLDivElement>('#view')!.innerHTML = `<div class="title-row"><div><h1>Data Admin</h1><p>Dataset health and sourcing readiness.</p></div></div><div class="layout"><section class="results card"><div class="results-head"><div><h2>Current Dataset</h2><p>Derived from the uploaded Domestic MIS FY 2026-27.</p></div></div><div class="route-facts" style="padding:20px"><span>Source rows<strong>${meta.rows.toLocaleString('en-IN')}</strong></span><span>PTL shipments<strong>${meta.ptlShipments.toLocaleString('en-IN')}</strong></span><span>Unique historical transporters<strong>${meta.uniqueTransporters}</strong></span><span>Exact pincode lanes<strong>${meta.lanes}</strong></span></div></section><aside class="card route-card"><h3>Next Enrichment</h3><p style="font-size:12px;color:#718096;line-height:1.6">Add verified phone/email contacts, chemical/hazardous cargo capability, and online discovery without mixing external data into the historical lane facts.</p></aside></div>`; }
function navMarkup() { return `<button class="nav active" data-view="finder">⌕ <span>Transporter Finder</span></button><button class="nav" data-view="directory">▣ <span>Transporter Directory</span></button><button class="nav" data-view="lanes">⌁ <span>Lane Intelligence</span></button><button class="nav" data-view="admin">⚙ <span>Admin</span></button>`; }
function renderApp() { app.innerHTML = `<div class="shell"><aside class="sidebar"><div class="logo"><span class="logo-icon">◆</span><div><b>ATOMGRID</b><small>GROWING TOGETHER</small></div></div><nav id="nav">${navMarkup()}</nav><div class="side-note"><b>Atomgrid</b><span>Internal Use Only</span></div></aside><section class="main"><header class="topbar"><div>Smarter logistics. Stronger supply chains.</div><div class="top-right"><input id="global-search" placeholder="Search transporter or pincode…"><span>◔</span><span class="avatar">AT</span></div></header><main class="content"><div id="view"><div class="title-row"><div><h1>Loading transporter data…</h1><p>Preparing the Atomgrid historical PTL index.</p></div></div></div></main></section></div>`; document.querySelectorAll<HTMLButtonElement>('.nav').forEach(btn => btn.addEventListener('click', () => { state.view = btn.dataset.view || 'finder'; document.querySelectorAll('.nav').forEach(n => n.classList.remove('active')); btn.classList.add('active'); if (state.view === 'finder') runSearch(); if (state.view === 'directory') renderDirectory(); if (state.view === 'lanes') renderLaneIntel(); if (state.view === 'admin') renderAdmin(); })); document.getElementById('global-search')?.addEventListener('input', event => { state.query = (event.target as HTMLInputElement).value; if (state.view === 'directory') renderDirectory(); }); }
function runSearch() { if (!state.data) return; const pickup = (document.getElementById('pickup') as HTMLInputElement | null)?.value.trim() || ''; const delivery = (document.getElementById('delivery') as HTMLInputElement | null)?.value.trim() || ''; const qty = Number((document.getElementById('qty') as HTMLInputElement | null)?.value || 0); if (!/^\d{6}$/.test(pickup) || !/^\d{6}$/.test(delivery) || qty <= 0) { renderFinder([], 'Enter valid 6-digit pickup and delivery pincodes and a quantity above 0 KG.'); return; } let results = state.data.lanes.filter(l => l.o === pickup && l.d === delivery); let note = ''; if (results.length) { const inRange = results.filter(l => l.mn == null || l.mx == null || (qty >= l.mn && qty <= l.mx)); note = inRange.length ? `Exact historical lane match • ${inRange.length} quantity-compatible option(s).` : 'Exact historical lane found, but entered quantity is outside the historical quantity range.'; results = inRange.length ? inRange : results; } else { const compatible = state.data.transporters.filter(t => t.mn == null || t.mx == null || (qty >= t.mn && qty <= t.mx)); results = compatible.slice(0, 8).map(t => ({ o: pickup, d: delivery, t: t.n, s: t.s, aq: t.aq, mn: t.mn, mx: t.mx, tat: t.tat, km: t.d, lu: t.lu, source: 'historical' as const })); note = compatible.length ? 'No exact lane history found • historical network options shown first, followed by the regional public PTL fallback below.' : 'No exact lane history found • showing regional public PTL fallbacks. Verify pincode serviceability, TAT and cargo acceptance before booking.'; } const sort = (document.getElementById('sort') as HTMLSelectElement | null)?.value || 'ship'; results.sort((a, b) => sort === 'tat' ? (a.tat ?? 999) - (b.tat ?? 999) : sort === 'distance' ? (a.km ?? 999999) - (b.km ?? 999999) : b.s - a.s); renderFinder(results, note); }
function wireFinder() { document.getElementById('find')?.addEventListener('click', runSearch); document.getElementById('swap')?.addEventListener('click', () => { const p = document.getElementById('pickup') as HTMLInputElement; const d = document.getElementById('delivery') as HTMLInputElement; const tmp = p.value; p.value = d.value; d.value = tmp; }); document.getElementById('reset')?.addEventListener('click', () => { (document.getElementById('pickup') as HTMLInputElement).value = ''; (document.getElementById('delivery') as HTMLInputElement).value = ''; (document.getElementById('qty') as HTMLInputElement).value = ''; renderFinder([], 'Enter a lane to start sourcing.'); }); document.getElementById('sort')?.addEventListener('change', runSearch); document.getElementById('cargo')?.addEventListener('change', runSearch); document.querySelectorAll<HTMLButtonElement>('.view').forEach(button => button.addEventListener('click', () => { const lane = state.results[Number(button.dataset.lane)]; if (!lane) return; const modal = document.getElementById('modal'); (document.getElementById('modal-title') as HTMLElement).textContent = lane.t; (document.getElementById('modal-body') as HTMLElement).textContent = `Lane ${lane.o} → ${lane.d} • TAT ${lane.tat ?? '—'} days • Historical shipments ${lane.s} • Avg distance ${fmt(lane.km)} km • Historical quantity range ${fmt(lane.mn)}–${fmt(lane.mx)} kg • Contact enrichment pending.`; modal?.classList.remove('hidden'); })); document.getElementById('close')?.addEventListener('click', () => document.getElementById('modal')?.classList.add('hidden')); document.getElementById('modal')?.addEventListener('click', event => { if ((event.target as HTMLElement).id === 'modal') document.getElementById('modal')?.classList.add('hidden'); }); }
renderApp();
decodeData().then(data => { state.data = data; state.view = 'finder'; renderFinder([], 'Enter a lane to start sourcing.'); }).catch(() => { document.getElementById('view')!.innerHTML = '<div class="note">The historical PTL dataset could not be loaded. Please refresh the page.</div>'; });
