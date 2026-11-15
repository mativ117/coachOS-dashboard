import type { Plugin } from "vite";
import { createHash } from "node:crypto";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";

export function pwa(): Plugin {
  return {
    name: "coachos-offline",
    apply: "build",
    async writeBundle(options) {
      const root = resolve(options.dir ?? "dist");
      async function walk(dir: string): Promise<string[]> {
        const entries = await readdir(dir, { withFileTypes: true });
        return (
          await Promise.all(
            entries.map(async (entry) =>
              entry.isDirectory()
                ? walk(resolve(dir, entry.name))
                : [resolve(dir, entry.name)],
            ),
          )
        ).flat();
      }
      const assets = (await walk(root))
        .filter((path) => !path.endsWith("/sw.js") && !path.endsWith(".map"))
        .sort();
      const hash = createHash("sha256").update(pwa.toString());
      for (const path of assets)
        hash.update(relative(root, path)).update(await readFile(path));
      const version = hash.digest("hex").slice(0, 16);
      const paths = [
        "./",
        ...assets.map((path) => `./${relative(root, path)}`),
      ];
      await writeFile(
        resolve(root, "sw.js"),
        `
const ROOT = new URL('./', self.location.href).href;
const PREFIX = 'coachos-' + encodeURIComponent(new URL(ROOT).pathname) + '-';
const CACHE = PREFIX + '${version}';
const FILES = ${JSON.stringify(paths)}.map(path => new URL(path, ROOT).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try { await cache.addAll(FILES); }
    catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
// No skipWaiting: updates activate only after all old app tabs are closed.
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.href.startsWith(ROOT) || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    if (url.pathname !== new URL(ROOT).pathname && url.pathname !== new URL('index.html', ROOT).pathname) return;
    event.respondWith(caches.open(CACHE).then(cache => cache.match(ROOT, { ignoreVary: true })).then(response => response || fetch(request)));
  } else if (FILES.includes(url.href)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(request, { ignoreVary: true })).then(response => response || fetch(request)));
  }
});
`,
      );
    },
  };
}
