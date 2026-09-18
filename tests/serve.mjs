// Serve the production bundle under the same subpath as GitHub Pages.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve('dist');
const prefix = '/abngandmingweb/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg' };
export function createPreviewServer() { return createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (!path.startsWith(prefix)) throw new Error('Not found');
    let file = resolve(root, path.slice(prefix.length) || 'index.html');
    if (!file.startsWith(root + '/')) throw new Error('Not found');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
}); }
if (import.meta.url === pathToFileURL(process.argv[1]).href) createPreviewServer().listen(4180, '127.0.0.1');
