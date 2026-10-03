// Sonde : place la caméra et liste les objets touchés par des rayons (sans fusion statique).
// usage : node probe.mjs <carte> '[[x,y,z,yaw,pitch], ...]'   (x,z en mètres, y = hauteur des yeux)
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2], views = JSON.parse(process.argv[3]);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage();
await page.addInitScript(() => localStorage.setItem('sp_settings', JSON.stringify({ quality: 1 })));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('file://' + path.join(dir, 'index.html') + '?nomerge#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
const out = await page.evaluate((views) => {
  const { THREE, R } = SP; const rc = new THREE.Raycaster(); rc.camera = R.camera; const res = [];
  for (const [x, y, z, yaw, pitch] of views) {
    const o = new THREE.Vector3(x, y, z);
    for (const [dy, dp] of [[0, 0], [-0.15, 0], [0.15, 0], [0, -0.12], [0, 0.12]]) {
      const yw = yaw + dy, pt = pitch + dp, d = new THREE.Vector3(-Math.sin(yw) * Math.cos(pt), Math.sin(pt), -Math.cos(yw) * Math.cos(pt));
      rc.set(o, d); rc.far = 60;
      const hits = rc.intersectObjects(R.scene.children, true).filter((h) => h.object.visible && h.object.isMesh && !h.object.isSprite).slice(0, 2);
      res.push(`[${x},${y},${z} yaw ${yaw.toFixed(2)}+${dy} pitch ${pt.toFixed(2)}] ` + hits.map((h) => {
        const ob = h.object, m = Array.isArray(ob.material) ? ob.material[0] : ob.material; ob.geometry.computeBoundingBox(); const bb = ob.geometry.boundingBox, s = new THREE.Vector3(); bb.getSize(s);
        const chain = []; for (let p = ob.parent; p && p !== R.scene; p = p.parent) chain.push(p.name || p.type);
        return `d=${h.distance.toFixed(2)} p=(${h.point.x.toFixed(1)},${h.point.y.toFixed(1)},${h.point.z.toFixed(1)}) ${ob.type}:${ob.name || '-'} geo=${ob.geometry.type} size=${s.x.toFixed(2)}x${s.y.toFixed(2)}x${s.z.toFixed(2)} at=(${ob.position.x.toFixed(1)},${ob.position.y.toFixed(1)},${ob.position.z.toFixed(1)}) mat=${m.name || m.type} col=${m.color?.getHexString()} map=${m.map ? 'oui' : 'non'} op=${m.opacity} parents=${chain.join('<')}`;
      }).join(' | '));
    }
  }
  return res;
}, views);
console.log(out.join('\n'));
await browser.close();
