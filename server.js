import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'fresh', 'dist');
const dataDir = path.join(__dirname, 'src', 'data');
const dataFile = path.join(dataDir, 'data.fixed.gz.b64');
const port = Number(process.env.PORT || 10000);
const mime = { '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon' };
let datasetPromise;

function normalizeDataset(raw) {
  if (!raw?.meta || !Array.isArray(raw.transporters) || !Array.isArray(raw.lanes)) {
    throw new Error('Historical repository data has an unexpected structure');
  }

  const transporters = raw.transporters.map((t) => ({
    name: String(t.n ?? ''),
    shipments: Number(t.s ?? 0),
    avg_qty_kg: t.aq == null ? null : Number(t.aq),
    min_qty_kg: t.mn == null ? null : Number(t.mn),
    max_qty_kg: t.mx == null ? null : Number(t.mx),
    avg_tat_days: t.tat == null ? null : Number(t.tat),
    median_tat_days: null,
    avg_distance_km: t.d == null ? null : Number(t.d),
    last_used: t.lu ?? null
  }));

  const lanes = raw.lanes.map((l) => ({
    pickup: String(l.o ?? '').padStart(6, '0'),
    delivery: String(l.d ?? '').padStart(6, '0'),
    transporter: String(l.t ?? ''),
    shipments: Number(l.s ?? 0),
    avg_qty_kg: l.aq == null ? null : Number(l.aq),
    min_qty_kg: l.mn == null ? null : Number(l.mn),
    max_qty_kg: l.mx == null ? null : Number(l.mx),
    avg_tat_days: l.tat == null ? null : Number(l.tat),
    median_tat_days: null,
    avg_distance_km: l.km == null ? null : Number(l.km),
    last_used: l.lu ?? null
  })).filter((l) => /^\d{6}$/.test(l.pickup) && /^\d{6}$/.test(l.delivery));

  return {
    meta: {
      source: 'Atomgrid Domestic MIS FY 2026-27 — PTL history',
      source_rows: Number(raw.meta.rows ?? 0),
      ptl_shipments: Number(raw.meta.ptlShipments ?? 0),
      usable_ptl_shipments: lanes.reduce((sum, l) => sum + l.shipments, 0),
      transporters: transporters.length,
      exact_pincode_lanes: lanes.length
    },
    transporters,
    lanes
  };
}

async function loadDataset() {
  if (!datasetPromise) datasetPromise = (async () => {
    if (!existsSync(dataFile)) throw new Error('Central transporter data repository file is missing');
    const b64 = (await readFile(dataFile, 'utf8')).replace(/\s+/g, '');
    const raw = JSON.parse(gunzipSync(Buffer.from(b64, 'base64')).toString('utf8'));
    const data = normalizeDataset(raw);
    if (!data.lanes.length || !data.transporters.length) throw new Error('Historical repository contains no usable transporter data');
    if (data.meta.ptl_shipments !== 697) throw new Error(`Unexpected PTL shipment count: ${data.meta.ptl_shipments}`);
    console.log(`Central data repository ready: ${data.meta.ptl_shipments} PTL shipments | ${data.transporters.length} transporters | ${data.lanes.length} exact pincode lanes`);
    return data;
  })();
  return datasetPromise;
}

async function sendFile(res, file) {
  const body = await readFile(file);
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public,max-age=300' });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/api/health') {
      try {
        const data = await loadDataset();
        res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
        res.end(JSON.stringify({ status:'ok', dataset:'ready', meta:data.meta }));
      } catch (error) {
        console.error('Transporter Finder health check failed:', error);
        res.writeHead(503, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
        res.end(JSON.stringify({ status:'degraded', dataset:'unavailable', error:error instanceof Error ? error.message : String(error) }));
      }
      return;
    }
    if (url === '/api/data') {
      const data = await loadDataset();
      res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
      res.end(JSON.stringify(data));
      return;
    }
    if (url === '/api/data-status') {
      const data = await loadDataset();
      res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
      res.end(JSON.stringify({ repository:'GitHub / src/data/data.fixed.gz.b64', meta:data.meta }));
      return;
    }
    const relative = url === '/' ? '/index.html' : url;
    const file = path.normalize(path.join(publicDir, relative));
    if (!file.startsWith(publicDir)) { res.writeHead(403); res.end('Forbidden'); return; }
    if (existsSync(file) && (await stat(file)).isFile()) { await sendFile(res, file); return; }
    await sendFile(res, path.join(publicDir, 'index.html'));
  } catch (error) {
    console.error('Transporter Finder error:', error);
    res.writeHead(500, { 'Content-Type':'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  }
});

server.listen(port, '0.0.0.0', async () => {
  console.log(`Atomgrid Transporter Finder listening on ${port}`);
  try {
    await loadDataset();
    console.log('Startup dataset validation passed');
  } catch (error) {
    console.error('Startup dataset validation failed:', error);
  }
});