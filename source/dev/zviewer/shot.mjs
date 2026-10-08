// Visionneuse : un modèle GLB vu de face, de trois quarts, de dos et au visage (CURL=0.4 : doigts repliés ; HAND=1 : gros plan de la main).
// usage : node zviewer/shot.mjs zombies/p7_a.glb zviewer/out/p7_a  (→ p7_a_0.jpg … p7_a_3.jpg)
import { chromium } from 'playwright';
import fs from 'fs';
const [file, out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 600, height: 800 } }); const errs = [];
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(([c, h]) => { if (c) window.CURL = +c; if (h) window.HAND = 1; }, [process.env.CURL, process.env.HAND]);
await p.goto('http://127.0.0.1:8088/zviewer/index.html'); await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
const { info, out: urls } = await p.evaluate((f) => window.shots(f), file);
console.log(JSON.stringify(info));
fs.mkdirSync('zviewer/out', { recursive: true });
urls.forEach((u, i) => fs.writeFileSync(`${out}_${i}.jpg`, Buffer.from(u.split(',')[1], 'base64')));
console.log('ERRORS', errs.length, errs.slice(0, 5).join(' | '));
await b.close();
