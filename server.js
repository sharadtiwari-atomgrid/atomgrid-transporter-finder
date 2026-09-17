import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'fresh', 'dist');
const sourceDir = path.join(__dirname, 'src', 'data');
const port = Number(process.env.PORT || 10000);
const mime = { '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon' };
let datasetPromise;

async function loadDataset() {
  if (!datasetPromise) datasetPromise = (async () => {
    const files = (await readdir(sourceDir))
      .filter(name => /^part\d+\.txt$/.test(name))
      .sort((a,b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
    if (!files.length) throw new Error('No dataset parts found');
    const text = (await Promise.all(files.map(file => readFile(path.join(sourceDir, file), 'utf8')))).join('');
    const data = JSON.parse(text);
    if (!data?.lanes?.length) throw new Error('Dataset contains no historical lanes');
    console.log(`Historical dataset ready: ${files.length} parts | ${data.meta?.ptlShipments ?? 0} PTL shipments | ${data.meta?.transporters ?? 0} transporters | ${data.meta?.exact_pincode_lanes ?? data.meta?.lanes ?? 0} lanes`);
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
    if (url === '/api/data') {
      const data = await loadDataset();
      res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
      res.end(JSON.stringify(data));
      return;
    }
    const relative = url === '/' ? '/index.html' : url;
    const file = path.normalize(path.join(publicDir, relative));
    if (!file.startsWith(publicDir)) { res.writeHead(403); res.end('Forbidden'); return; }
    if (existsSync(file) && (await stat(file)).isFile()) { await sendFile(res, file); return; }
    await sendFile(res, path.join(publicDir, 'index.html'));
  } catch (error) {
    console.error('Transporter Finder V2 error:', error);
    res.writeHead(500, { 'Content-Type':'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Atomgrid Transporter Finder V2 listening on ${port}`));
