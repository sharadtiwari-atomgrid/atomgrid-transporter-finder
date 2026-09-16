import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'dist');
const dataDir = path.join(__dirname, 'src', 'data');
const port = Number(process.env.PORT || 10000);
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };
let dataPromise;

async function loadDataset() {
  if (!dataPromise) dataPromise = (async () => {
    const files = (await readdir(dataDir)).filter(name => /^part\d+\.txt$/i.test(name)).sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
    if (!files.length) throw new Error('Historical dataset parts not found.');
    const chunks = await Promise.all(files.map(file => readFile(path.join(dataDir, file), 'utf8')));
    const json = chunks.join('');
    const data = JSON.parse(json);
    if (!data?.lanes?.length || !data?.transporters?.length) throw new Error('Historical dataset is empty.');
    return data;
  })();
  return dataPromise;
}

async function serveFile(res, filePath) {
  const data = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable' });
  res.end(data);
}

const server = createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (requestPath === '/api/data') {
      const data = await loadDataset();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
      return;
    }
    const safePath = requestPath === '/' ? '/index.html' : requestPath;
    const candidate = path.normalize(path.join(publicDir, safePath));
    if (!candidate.startsWith(publicDir)) { res.writeHead(403); res.end('Forbidden'); return; }
    if (existsSync(candidate)) { await serveFile(res, candidate); return; }
    await serveFile(res, path.join(publicDir, 'index.html'));
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }));
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Atomgrid Transporter Finder listening on port ${port}`));
