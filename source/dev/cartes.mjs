// Photos des cartes pour l'écran de chargement (assets/cartes/<carte>.jpg) : vues du survol de caméra du menu, rendues en
// qualité maximale avec les photos des matières. Sans OUT : planche de 6 vues (shots/cartes_<carte>.jpg) pour choisir le
// moment ; avec OUT=<t> : écrit l'image finale (1600 × 900, JPEG) au moment t du survol.
// Usage : node cartes.mjs <carte> [t1,t2,…] ; OUT=12 node cartes.mjs <carte> ; CAM='x,y,z,cx,cy,cz[;…]' : caméras libres
// (position, point visé ; plusieurs séparées par « ; ») à la place du survol (avec OUT=<n° de la caméra>) ; « s,a,p » : depuis le
// départ du joueur, à hauteur d'œil, tourné de a radians et incliné de p. Affiche ERRORS n.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname), id = process.argv[2] || 'poste7';
const cams = process.env.CAM ? process.env.CAM.split(';').map((c) => c.split(',').map((v) => (v === 's' ? 's' : Number(v)))) : null;
const times = cams ? (process.env.OUT ? [+process.env.OUT] : cams.map((_, i) => i)) : process.env.OUT ? [+process.env.OUT] : (process.argv[3] || '2,8,14,20,26,32').split(',').map(Number);
const W = process.env.OUT ? 1600 : 960, H = process.env.OUT ? 900 : 540;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
await ctx.addInitScript(() => localStorage.setItem('sp_settings', JSON.stringify({ quality: 3 })));
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 400000 });
const urls = await page.evaluate(([times, single, cams]) => {
  const { R } = SP, out = []; if (R.final) R.final.uniforms.uGrain.value = 0; // (sans grain de film : image plus nette et plus légère)
  for (const t of times) {
    SP.menuAt(cams ? 0 : t);
    if (cams && cams[t][0] === 's') { const st = SP.spots(), yaw = st.startYaw + (cams[t][1] || 0), p = cams[t][2] || 0, x = st.start[0] * 2 + 1, z = st.start[1] * 2 + 1; cams[t] = [x, 1.7, z, x - Math.sin(yaw) * 10, 1.7 + Math.tan(p) * 10, z - Math.cos(yaw) * 10]; }
    if (cams) { const [x, y, z, cx, cy, cz] = cams[t], m = R.lights.moon, off = m.position.clone().sub(m.target.position); R.camera.position.set(x, y, z); R.camera.lookAt(cx, cy, cz); m.target.position.set(x, 0, z); m.position.copy(m.target.position).add(off); }
    for (let i = 0; i < 3; i++) SP.renderFrame(t); // (ombres et effets posés)
    if (single) return [R.renderer.domElement.toDataURL('image/jpeg', 0.8)];
    out.push(R.renderer.domElement.toDataURL('image/jpeg', 0.8));
  }
  return out;
}, [times, !!process.env.OUT, cams]);
if (process.env.OUT) {
  const f = path.join(dir, '..', '..', 'assets', 'cartes', `${id}.jpg`); fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, Buffer.from(urls[0].split(',')[1], 'base64')); console.log(`${f} (${Math.round(fs.statSync(f).size / 1024)} Ko)`);
} else {
  // Planche 3 × 2 (images côte à côte, assemblées dans la page).
  const sheet = await page.evaluate(async ([urls, times]) => { const c = document.createElement('canvas'); c.width = 1920; c.height = 720; const x = c.getContext('2d');
    for (let i = 0; i < urls.length; i++) { const im = new Image(); im.src = urls[i]; await im.decode(); x.drawImage(im, (i % 3) * 640, ((i / 3) | 0) * 360, 640, 360); x.fillStyle = '#000a'; x.fillRect((i % 3) * 640, ((i / 3) | 0) * 360, 90, 22); x.fillStyle = '#ff0'; x.font = '15px monospace'; x.fillText('t=' + times[i], (i % 3) * 640 + 5, ((i / 3) | 0) * 360 + 16); }
    return c.toDataURL('image/jpeg', 0.82); }, [urls, times]);
  fs.mkdirSync(path.join(dir, 'shots'), { recursive: true }); fs.writeFileSync(path.join(dir, 'shots', `cartes_${id}.jpg`), Buffer.from(sheet.split(',')[1], 'base64')); console.log(`shots/cartes_${id}.jpg`);
}
for (const e of errors) console.log('[pageerror]', e);
console.log(`ERRORS ${errors.length}`);
await browser.close();
