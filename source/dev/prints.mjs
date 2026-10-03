// Empreintes dans la neige (Poste 7) : on marche sur une étendue de neige, on se retourne et on photographie les traces (shots/real_prints.png).
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 2 })); localStorage.setItem('sp_tips', JSON.stringify({ repair: 1, objective: 1, power: 1, ping: 1, perks: 1, box: 1, down: 1 })); });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.goto('http://127.0.0.1:8088/index.html#carte=poste7'); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
await page.evaluate(() => document.getElementById('soloButton').click());
const r = await page.evaluate(() => {
  const { G, P } = SP; P.hp = P.maxHp = 1e9; G.toSpawn = 0; G.breakT = 1e9; SP.sim(5); for (const z of [...SP.ZOMBIES]) z.destroy(); document.getElementById('locIntro')?.remove?.();
  SP.Sfx.init(); let audio = SP.Sfx.ready; try { SP.Sfx.gun('ar', null, true); SP.Sfx.setReverb(0.2, 1); SP.Sfx.gun('pistol', new SP.THREE.Vector3(5, 1, 5), false); } catch (e) { audio = 'ERR ' + e.message; }
  // Bord du cratère (Poste 7 : centre 46,32 ; rayon 7,4), marche vers le centre.
  let best = null; const sx = P.pos.x, sz = P.pos.z; for (let z = 0; z < 60; z++) for (let x = 0; x < 60; x++) { if (SP.MAP.style?.[z * SP.MAPW() + x] !== 3 || SP.TCLASS(x, z) !== 1) continue; let ok = true; for (let k = 1; k <= 3; k++) if (SP.MAP.style[(z + k) * SP.MAPW() + x] !== 3 || SP.TCLASS(x, z + k) !== 1) ok = false; if (!ok) continue; const d = Math.hypot(x * 2 - sx, z * 2 - sz); if (!best || d < best.d) best = { x, z, d }; } window.__yard = best; P.pos.set(best.x * 2 + 1, 0, best.z * 2 + 0.5); P.yaw = Math.PI; P.pitch = 0; SP.sim(0.1); P.torch = false;
  const p0 = [P.pos.x, P.pos.z]; SP.INPUT.keys.add('KeyW'); SP.sim(3.2); SP.INPUT.keys.delete('KeyW'); SP.sim(0.2); const p1 = [P.pos.x, P.pos.z], np = SP.FX.prints.filter((d) => d.m.visible).length;
  P.pos.set(best.x * 2 + 1.0, 0, best.z * 2 + 0.1); P.yaw = Math.PI; P.pitch = -0.55; SP.updatePlayer(0.016); SP.renderFrame(1);
  const rc = new SP.THREE.Raycaster(new SP.THREE.Vector3(best.x * 2 + 1, 3, best.z * 2 + 2), new SP.THREE.Vector3(0, -1, 0), 0, 6); const ms = []; SP.R.scene.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && !(o.geometry && o.geometry.isInstancedBufferGeometry) && o.layers.mask === 1) ms.push(o); }); rc.camera = SP.R.camera; const hit = rc.intersectObjects(ms, false).filter((h) => !h.object.isSprite && h.object.visible).slice(0, 3).map((h) => [h.point.y.toFixed(3), h.object.material?.name || h.object.material?.type, h.object.isInstancedMesh ? 'inst' : '']);
  return { p0, p1, np, surface: hit, yard: window.__yard, audio, prints: SP.FX.prints.filter((d) => d.m.visible).length, pos: [P.pos.x.toFixed(1), P.pos.y.toFixed(2), P.pos.z.toFixed(1)], printY: SP.FX.prints.filter((d) => d.m.visible).slice(0, 4).map((d) => [d.m.position.x.toFixed(1), d.m.position.y.toFixed(2), d.m.position.z.toFixed(1)]) };
});
await page.waitForTimeout(200); await page.screenshot({ path: path.join(dir, 'shots', 'real_prints.png') });
console.log(JSON.stringify(r), 'erreurs', errors.length, errors.slice(0, 3)); await browser.close();
