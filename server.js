import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
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

let indexHtmlPromise;

async function buildIndexHtml() {
  const [html, assets] = await Promise.all([
    readFile(path.join(publicDir, 'index.html'), 'utf8'),
    readdir(path.join(publicDir, 'assets'))
  ]);

  const jsFiles = assets.filter(name => name.endsWith('.js'));
  let datasetJson = null;

  for (const file of jsFiles) {
    const bundle = await readFile(path.join(publicDir, 'assets', file), 'utf8');
    const match = bundle.match(/H4sIA[A-Za-z0-9+/=]+/);
    if (!match) continue;
    try {
      datasetJson = gunzipSync(Buffer.from(match[0], 'base64')).toString('utf8');
      JSON.parse(datasetJson);
      break;
    } catch {
      datasetJson = null;
    }
  }

  if (!datasetJson) throw new Error('Embedded historical dataset could not be extracted from the production bundle.');

  const serialized = JSON.stringify(datasetJson).replace(/</g, '\\u003c');
  const shim = `<script>
window.__ATOMGRID_DATA_JSON__=${serialized};
window.DecompressionStream=class{constructor(format){if(format!=='gzip')throw new Error('Unsupported compression format');return new TransformStream({transform(){},flush(controller){controller.enqueue(new TextEncoder().encode(window.__ATOMGRID_DATA_JSON__));}})}};
</script>`;

  return html.replace('</head>', `${shim}</head>`);
}

async function serveFile(res, filePath) {
  const data = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
  });
  res.end(data);
}

async function serveIndex(res) {
  indexHtmlPromise ||= buildIndexHtml();
  const html = await indexHtmlPromise;
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
  res.end(html);
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

    if (requestPath === '/' || requestPath === '/index.html') {
      await serveIndex(res);
      return;
    }

    if (existsSync(candidate)) {
      await serveFile(res, candidate);
      return;
    }

    await serveIndex(res);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Atomgrid Transporter Finder listening on port ${port}`);
});
