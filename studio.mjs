/** Local-only Studio server: serve fresh files and save validated configuration. */
import { createServer } from 'node:http';
import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { buildSvg } from './build.mjs';
import { updateConfigSource } from './docs/config-source.js';

const root = new URL('./', import.meta.url);
const port = Number(process.env.PORT || 4173);
const origin = `http://localhost:${port}`;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.md': 'text/plain' };
let saving = false;

createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const reply = (status, message) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message }));
  };
  if (req.headers.host !== `localhost:${port}`) return reply(403, 'Use the local Studio URL.');
  const path = new URL(req.url, origin).pathname;
  if (path === '/api/save' && req.method === 'POST') {
    if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') {
      return reply(403, 'Save must come from this Studio.');
    }
    if (saving) return reply(409, 'A save is already in progress.');
    saving = true;
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 100000) throw new Error('Configuration is too large.');
      }
      const { baseSource, config, pattern } = JSON.parse(body);
      const original = await readFile(new URL('config.js', root), 'utf8');
      if (baseSource !== original) return reply(409, 'config.js changed outside Studio. Reload before saving.');
      // Accept settings, never executable JavaScript supplied by the browser.
      const source = updateConfigSource(original, { CONFIG: config, PATTERN: pattern });
      const svg = buildSvg(config, pattern);
      await writeFile(new URL('config.js.tmp', root), source);
      await writeFile(new URL('hektor.svg.tmp', root), svg);
      // Recheck after generation so external edits are not silently replaced.
      if (await readFile(new URL('config.js', root), 'utf8') !== original) {
        return reply(409, 'config.js changed outside Studio. Reload before saving.');
      }
      await rename(new URL('hektor.svg.tmp', root), new URL('hektor.svg', root));
      await rename(new URL('config.js.tmp', root), new URL('config.js', root));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ source }));
    } catch (error) {
      reply(400, error.message);
    } finally {
      await Promise.all(['config.js.tmp', 'hektor.svg.tmp'].map(name => rm(new URL(name, root), { force: true })));
      saving = false;
    }
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return reply(405, 'Method not allowed.');
  if (path === '/') {
    res.writeHead(302, { Location: '/docs/studio.html' }); res.end(); return;
  }
  // Only public project files; no directory listing or arbitrary filesystem access.
  if (!/^\/(?:[\w-]+\.(?:js|svg)|README\.md|docs\/[\w-]+\.(?:html|js|svg))$/.test(path)) {
    return reply(404, 'Not found.');
  }
  try {
    const content = await readFile(new URL(path.slice(1), root));
    res.writeHead(200, { 'Content-Type': types[path.slice(path.lastIndexOf('.'))] });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { reply(404, 'Not found.'); }
}).listen(port, '127.0.0.1', () => console.log(`Studio: ${origin}/docs/studio.html`));
