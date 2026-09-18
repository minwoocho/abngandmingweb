import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else if (entry.name !== 'sw.js') result.push(path);
  }
  return result.sort();
}
const files = await walk('dist');
const hash = createHash('sha256');
for (const file of files) hash.update(file).update(await readFile(file));
const cache = `hbd-${hash.digest('hex').slice(0, 14)}`;
const urls = ['./', ...files.map(file => './' + file.slice(5))];
const source = `
const CACHE = ${JSON.stringify(cache)};
const FILES = ${JSON.stringify(urls)};
const scopedPrefix = 'hbd:' + self.registration.scope + ':';
const cacheName = scopedPrefix + CACHE;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(FILES)));
});
self.addEventListener('message', event => {
  if (event.data === 'ACTIVATE') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(scopedPrefix) && key !== cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    if (event.request.mode === 'navigate') {
      return (await cache.match('./index.html')) || fetch(event.request);
    }
    return (await cache.match(event.request)) || fetch(event.request);
  })());
});
`;
await writeFile('dist/sw.js', source);
console.log(`Offline cache: ${files.length} files (${cache})`);
