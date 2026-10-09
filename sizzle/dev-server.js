// Dev server for the sizzle pages: static files + live reload + auto-rebuild.
//   node dev-server.js [port]        (default 4200)
// - Edit a *.template.html  -> runs build.py, then reloads open pages
// - Edit extract-glyphs.js  -> runs it (rewrites glyphs.json), then reloads
// - Edit anything else here (svg, images, built html, ...) -> reloads
// Open pages keep their playhead across a reload (see the "seq" bit in sequence.template.html).
const http = require('http'), fs = require('fs'), path = require('path'), { execFile } = require('child_process');
const ROOT = __dirname, PORT = +process.argv[2] || 4200;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf', '.mp4': 'video/mp4' };
const SNIPPET = `<script>(() => { const es = new EventSource('/__reload'); es.onmessage = () => { try { sessionStorage.setItem('liveReload', '1'); } catch (e) {} location.reload(); }; })();</script>`;

const clients = new Set();
const reload = why => { console.log(new Date().toLocaleTimeString(), 'reload:', why); clients.forEach(res => res.write('data: reload\n\n')); };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  let file = path.join(ROOT, decodeURIComponent(url.pathname)); if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    const ext = path.extname(file), headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' };
    if (ext === '.html') buf = Buffer.from(buf.toString().replace('</body>', SNIPPET + '</body>'));
    res.writeHead(200, headers).end(buf);
  });
}).listen(PORT, () => console.log(`sizzle dev server: http://localhost:${PORT}/sequence.html  (live reload + auto-build)`));

// ---- watch
// Files the build writes itself are ignored (otherwise a build would trigger another one); every other change is queued, so edits that
// land while a build is running are picked up by the next pass instead of being dropped.
let timer = null, busy = false, again = false; const pending = new Set();
const GENERATED = /^(sequence|variants|disney-morph)\.html$|^glyphs\.json$/, TMP = /\.tmp\.|~$|\.swp$/;
const run = (cmd, args, label) => new Promise(done => execFile(cmd, args, { cwd: ROOT }, (err, out, errout) => { if (err) console.error(label + ' failed:\n' + (errout || err.message)); done(!err); }));
async function flush() {
  if (busy) { again = true; return; }
  busy = true;
  do {
    again = false; const files = [...pending]; pending.clear(); let ok = true;
    if (files.some(f => f === 'extract-glyphs.js')) ok = await run('node', ['extract-glyphs.js'], 'extract-glyphs');
    if (ok && files.some(f => /\.template\.html$/.test(f))) ok = await run('python3', ['build.py'], 'build');
    if (ok && files.length && !again) reload(files.join(', '));
  } while (again);
  busy = false;
}
fs.watch(ROOT, { recursive: true }, (_, name) => {
  if (!name || GENERATED.test(name) || TMP.test(name) || /(^|\/)(\.|node_modules)/.test(name)) return;
  pending.add(name); clearTimeout(timer); timer = setTimeout(flush, 150);
});
