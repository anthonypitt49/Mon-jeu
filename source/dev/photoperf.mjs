// Coût des textures photo et de l'ombrage d'ambiance : temps de rendu (moyenne sur 40 images, même vue) et mémoire vidéo.
// Rendu logiciel (swiftshader) : seul l'écart relatif a un sens, pas les valeurs absolues.
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const run = async (label, q, query) => {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript((q) => localStorage.setItem('sp_settings', JSON.stringify({ quality: q })), q);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('http://127.0.0.1:8088/index.html?' + query + '#carte=poste7'); await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
  await page.evaluate(() => document.getElementById('soloButton').click());
  await page.waitForFunction(() => SP.PHOTO.state !== 'loading', null, { timeout: 120000 }); await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const { G, P, R } = SP; P.hp = P.maxHp = 1e9; G.toSpawn = 0; G.breakT = 1e9; for (const z of [...SP.ZOMBIES]) z.destroy();
    P.pos.set(63, 0, 55); P.yaw = 0; P.pitch = 0; SP.updatePlayer(0.016); SP.renderFrame(1); SP.renderFrame(1);
    const gl = R.renderer.getContext(); gl.finish(); const t0 = performance.now();
    for (let i = 0; i < 40; i++) SP.renderFrame(1 + i / 60);
    gl.finish(); const ms = (performance.now() - t0) / 40;
    const info = R.renderer.info, mem = info.memory;
    // Mémoire vidéo approximative des textures (RGBA 8 bits + mipmaps) : somme sur les textures chargées.
    let vram = 0; const seen = new Set();
    R.scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k of ['map', 'normalMap', 'roughnessMap']) { const t = m[k]; const img = t?.source?.data; if (!img || seen.has(t.source.uuid)) continue; seen.add(t.source.uuid); vram += (img.width || 0) * (img.height || 0) * 4 * 1.33; } });
    return { ms: +ms.toFixed(1), textures: mem.textures, geometries: mem.geometries, drawCalls: info.render.calls, vramMB: +(vram / 1048576).toFixed(1), photo: SP.PHOTO.state, ao: !!R.ao };
  });
  console.log(label.padEnd(26), JSON.stringify(r), errors.length ? 'ERR ' + errors[0] : '');
  await ctx.close();
};
await run('élevé, sans photo ni AO', 2, 'nophoto&noao');
await run('élevé, photo sans AO', 2, 'noao');
await run('élevé, photo + AO', 2, '');
await run('moyen, photo', 1, '');
await run('bas (inchangé)', 0, '');
await browser.close();
