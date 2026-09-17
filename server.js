import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'fresh', 'dist');
const dataDir = path.join(__dirname, 'data');
const lanesFile = path.join(dataDir, 'ptl_lanes.json.gz.b64');
const transportersFile = path.join(dataDir, 'ptl_transporters.json.gz.b64');
const port = Number(process.env.PORT || 10000);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};
let datasetPromise;

function readCompressedJson(file) {
  return readFile(file, 'utf8').then((b64) => {
    const cleaned = b64.replace(/\s+/g, '');
    const text = gunzipSync(Buffer.from(cleaned, 'base64')).toString('utf8');
    return JSON.parse(text);
  });
}

function asArray(raw, names = []) {
  if (Array.isArray(raw)) return raw;
  for (const name of names) {
    if (Array.isArray(raw?.[name])) return raw[name];
  }
  throw new Error('Canonical data payload does not contain an array');
}

function pick(obj, keys, fallback = null) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  }
  return fallback;
}

function normalizeTransporters(raw) {
  return asArray(raw, ['transporters', 'data']).map((t) => ({
    name: String(pick(t, ['name', 'n'], '')).trim(),
    shipments: Number(pick(t, ['shipments', 's'], 0)),
    avg_qty_kg: pick(t, ['avg_qty_kg', 'aq']),
    min_qty_kg: pick(t, ['min_qty_kg', 'mn']),
    max_qty_kg: pick(t, ['max_qty_kg', 'mx']),
    avg_tat_days: pick(t, ['avg_tat_days', 'tat']),
    median_tat_days: pick(t, ['median_tat_days', 'mtat']),
    avg_distance_km: pick(t, ['avg_distance_km', 'd', 'km']),
    last_used: pick(t, ['last_used', 'lu'])
  })).map((t) => ({
    ...t,
    avg_qty_kg: t.avg_qty_kg == null ? null : Number(t.avg_qty_kg),
    min_qty_kg: t.min_qty_kg == null ? null : Number(t.min_qty_kg),
    max_qty_kg: t.max_qty_kg == null ? null : Number(t.max_qty_kg),
    avg_tat_days: t.avg_tat_days == null ? null : Number(t.avg_tat_days),
    median_tat_days: t.median_tat_days == null ? null : Number(t.median_tat_days),
    avg_distance_km: t.avg_distance_km == null ? null : Number(t.avg_distance_km)
  })).filter((t) => t.name);
}

function normalizeLanes(raw) {
  return asArray(raw, ['lanes', 'data']).map((l) => ({
    pickup: String(pick(l, ['pickup', 'p', 'o'], '')).padStart(6, '0'),
    delivery: String(pick(l, ['delivery', 'd', 'dest'], '')).padStart(6, '0'),
    transporter: String(pick(l, ['transporter', 't'], '')).trim(),
    shipments: Number(pick(l, ['shipments', 's'], 0)),
    avg_qty_kg: pick(l, ['avg_qty_kg', 'aq']),
    min_qty_kg: pick(l, ['min_qty_kg', 'mn']),
    max_qty_kg: pick(l, ['max_qty_kg', 'mx']),
    avg_tat_days: pick(l, ['avg_tat_days', 'tat']),
    median_tat_days: pick(l, ['median_tat_days', 'mtat']),
    avg_distance_km: pick(l, ['avg_distance_km', 'km']),
    last_used: pick(l, ['last_used', 'lu'])
  })).map((l) => ({
    ...l,
    avg_qty_kg: l.avg_qty_kg == null ? null : Number(l.avg_qty_kg),
    min_qty_kg: l.min_qty_kg == null ? null : Number(l.min_qty_kg),
    max_qty_kg: l.max_qty_kg == null ? null : Number(l.max_qty_kg),
    avg_tat_days: l.avg_tat_days == null ? null : Number(l.avg_tat_days),
    median_tat_days: l.median_tat_days == null ? null : Number(l.median_tat_days),
    avg_distance_km: l.avg_distance_km == null ? null : Number(l.avg_distance_km)
  })).filter((l) => /^\d{6}$/.test(l.pickup) && /^\d{6}$/.test(l.delivery) && l.transporter);
}

async function loadDataset() {
  if (!datasetPromise) {
    datasetPromise = (async () => {
      if (!existsSync(lanesFile) || !existsSync(transportersFile)) {
        throw new Error('Canonical PTL data repository files are missing');
      }

      const [rawLanes, rawTransporters] = await Promise.all([
        readCompressedJson(lanesFile),
        readCompressedJson(transportersFile)
      ]);

      const lanes = normalizeLanes(rawLanes);
      const transporters = normalizeTransporters(rawTransporters);
      const pincodePairs = new Set(lanes.map((l) => `${l.pickup}|${l.delivery}`));
      const ptlShipments = lanes.reduce((sum, l) => sum + l.shipments, 0);

      const data = {
        meta: {
          source: 'Atomgrid Domestic MIS FY 2026-27 — PTL history',
          source_rows: 32070,
          ptl_shipments: 697,
          usable_ptl_shipments: ptlShipments,
          transporters: transporters.length,
          exact_pincode_lanes: pincodePairs.size,
          transporter_lane_combinations: lanes.length,
          updated_at: '2026-09-17'
        },
        transporters,
        lanes
      };

      if (data.meta.ptl_shipments !== 697) throw new Error(`Unexpected PTL shipment count: ${data.meta.ptl_shipments}`);
      if (data.meta.usable_ptl_shipments <= 0) throw new Error('Canonical PTL lane history is empty');
      if (!data.transporters.length) throw new Error('Canonical transporter aggregate is empty');
      if (!data.lanes.length) throw new Error('Canonical lane aggregate is empty');

      console.log(`Canonical PTL repository ready: ${data.meta.ptl_shipments} PTL shipments | ${data.transporters.length} transporters | ${data.meta.exact_pincode_lanes} pincode pairs | ${data.meta.transporter_lane_combinations} transporter-lane records | ${data.meta.usable_ptl_shipments} pincode-observed shipments`);
      return data;
    })();
  }
  return datasetPromise;
}

async function sendFile(res, file) {
  const body = await readFile(file);
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mime[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public,max-age=300'
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);

    if (url === '/api/health') {
      try {
        const data = await loadDataset();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ status: 'ok', dataset: 'ready', meta: data.meta }));
      } catch (error) {
        console.error('Transporter Finder health check failed:', error);
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ status: 'degraded', dataset: 'unavailable', error: error instanceof Error ? error.message : String(error) }));
      }
      return;
    }

    if (url === '/api/data') {
      const data = await loadDataset();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
      return;
    }

    if (url === '/api/data-status') {
      const data = await loadDataset();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({
        repository: 'GitHub / data/ptl_lanes.json.gz.b64 + data/ptl_transporters.json.gz.b64',
        meta: data.meta
      }));
      return;
    }

    const relative = url === '/' ? '/index.html' : url;
    const file = path.normalize(path.join(publicDir, relative));
    if (!file.startsWith(publicDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (existsSync(file) && (await stat(file)).isFile()) {
      await sendFile(res, file);
      return;
    }
    await sendFile(res, path.join(publicDir, 'index.html'));
  } catch (error) {
    console.error('Transporter Finder error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
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