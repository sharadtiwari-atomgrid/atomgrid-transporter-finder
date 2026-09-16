import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 10000);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

async function serveFile(res, filePath) {
  const data = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
  });
  res.end(data);
}

const server = createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const safePath = requestPath === '/' ? '/index.html' : requestPath;
    const candidate = path.normalize(path.join(publicDir, safePath));

    if (!candidate.startsWith(publicDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (existsSync(candidate)) {
      await serveFile(res, candidate);
      return;
    }

    // SPA fallback for client-side routes.
    await serveFile(res, path.join(publicDir, 'index.html'));
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Atomgrid Transporter Finder listening on port ${port}`);
});
