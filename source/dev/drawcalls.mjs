// Détail des appels de dessin visibles depuis la vue de départ : regroupés par matériau, avec ombres.
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const mapId = process.argv[2] || 'filon', q = +(process.argv[3] ?? 2), turn = +(process.argv[4] ?? 0);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
const page = await ctx.newPage();
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.goto('http://127.0.0.1:8088/index.html#carte=' + mapId); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
await page.evaluate(() => document.getElementById('soloButton').click());
const r = await page.evaluate((turn) => {
  const { THREE } = SP; SP.P.yaw += turn; SP.updatePlayer(0.016); SP.renderFrame(1);
  const cam = SP.R.camera, fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const groups = new Map(); let vis = 0, cast = 0, tot = 0;
  SP.R.scene.traverseVisible((o) => {
    if (!(o.isMesh || o.isPoints || o.isSprite || o.isLine)) return; tot++; if (!o.layers.test(cam.layers)) return;
    if (o.geometry && !o.geometry.boundingSphere) o.geometry.computeBoundingSphere?.();
    const inV = o.isSprite || o.frustumCulled === false || (o.geometry && fr.intersectsObject(o)); if (!inV) return; vis++; if (o.castShadow) cast++;
    const m = Array.isArray(o.material) ? o.material[0] : o.material, key = (o.isInstancedMesh ? 'INST ' : o.isSprite ? 'SPRITE ' : o.isPoints ? 'PTS ' : '') + (m?.name || m?.type || '?') + (o.userData.dynamic ? ' [dyn]' : '') + (o.parent && o.parent.type === 'Group' && o.parent.name ? ' <' + o.parent.name + '>' : '');
    const g = groups.get(key) || { n: 0, tris: 0, shadow: 0 }; g.n++; g.tris += (o.geometry?.index ? o.geometry.index.count / 3 : (o.geometry?.attributes?.position?.count || 0) / 3) * (o.isInstancedMesh ? o.count : 1); if (o.castShadow) g.shadow++; groups.set(key, g);
  });
  const spr = []; SP.R.scene.traverse((o) => { if (o.isSprite && !o.userData.glowB) { let d = false; for (let p = o; p; p = p.parent) if (p.userData.dynamic) d = true; spr.push((o.material.map === SP.GLOWB[0]?.mesh.material.uniforms.map.value ? 'glow' : 'autre') + (d ? '/dyn' : '') + (o.material.blending === 2 ? '/add' : '')); } });
  const det = {}; SP.R.scene.traverseVisible((o) => { if (!o.isMesh || !o.layers.test(cam.layers)) return; const m = Array.isArray(o.material) ? o.material[0] : o.material; if ((m?.name || m?.type) !== (globalThis.__DET || 'MeshStandardMaterial')) return; let top = o; while (top.parent && top.parent !== SP.R.scene) top = top.parent; let d = false; for (let p = o; p; p = p.parent) if (p.userData.dynamic) d = true; const k = (d ? 'dyn ' : '') + (o.isInstancedMesh ? 'inst ' : '') + (m.map ? 'tex ' : '') + (m.transparent ? 'transp ' : '') + (o.geometry.attributes.uv ? '' : 'sansUV ') + (o.geometry.attributes.color ? 'couleurs ' : '') + '@' + Math.round(top.position.x) + ',' + Math.round(top.position.z); det[k] = (det[k] || 0) + 1; });
  const cnt = {}; for (const k of spr) cnt[k] = (cnt[k] || 0) + 1;
  return { det: Object.entries(det).sort((a, b) => b[1] - a[1]).slice(0, 25), batched: SP.GLOWB.map((b) => b.list.length), rest: cnt, tot, vis, cast, bytris: [...groups.entries()].sort((a, b) => b[1].tris - a[1].tris).slice(0, 12).map(([k, g]) => `${Math.round(g.tris / 1000)}k tris  ${g.n}× ${k} (${g.shadow} ombre)`), top: [...groups.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 28).map(([k, g]) => `${g.n}×  ${k}  (${Math.round(g.tris / 1000)}k tris, ${g.shadow} ombre)`) };
}, turn);
console.log(mapId, 'q' + q, 'objets visibles', r.vis, '/', r.tot, 'portant ombre', r.cast, 'halos regroupés', JSON.stringify(r.batched), 'halos restants', JSON.stringify(r.rest)); for (const l of r.top) console.log('  ' + l);
console.log('PAR TRIANGLES'); for (const l of r.bytris) console.log('  ' + l);
await browser.close();
