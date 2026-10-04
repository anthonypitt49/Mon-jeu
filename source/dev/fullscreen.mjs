// Plein écran : bouton du menu, explication pour iPhone (Safari n'a pas de plein écran pour une page), appli web (manifeste, icônes).
// usage : node fullscreen.mjs — trois appareils simulés : ordinateur, iPhone dans Safari, iPhone depuis l'icône de l'écran d'accueil.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [], check = (ok, msg) => { if (!ok) errors.push('[plein écran] ' + msg); };
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
// Safari sur iPhone : pas d'API plein écran pour une page ; depuis l'écran d'accueil, navigator.standalone vaut true.
const asIphone = (standalone) => {
  Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false });
  Object.defineProperty(Document.prototype, 'webkitFullscreenEnabled', { get: () => undefined });
  Object.defineProperty(Navigator.prototype, 'standalone', { get: () => standalone });
};
async function open(name, opts, init) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(() => localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })));
  if (init) await ctx.addInitScript(init.fn, init.arg);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${name}] ` + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${name} console] ` + m.text().slice(0, 300)); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto('http://127.0.0.1:8088/index.html');
  await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
  return { ctx, page };
}
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' && !e.closest('.hidden') && e.offsetParent !== null; }, sel);

// 1. Ordinateur : le bouton de l'en-tête passe en plein écran et change d'intitulé.
{
  const { ctx, page } = await open('ordinateur', { viewport: { width: 1280, height: 720 } });
  await page.click('#fullscreenButton'); await page.waitForFunction(() => /Quitter/.test(document.getElementById('fullscreenButton').textContent), null, { timeout: 8000 }).catch(() => {});
  const r = await page.evaluate(() => ({ fs: !!document.fullscreenElement, label: document.getElementById('fullscreenButton').textContent, help: !document.getElementById('fsHelp').classList.contains('hidden') }));
  console.log('ordinateur', JSON.stringify(r));
  check(r.fs && /Quitter/.test(r.label) && !r.help, `ordinateur : plein écran non obtenu (${JSON.stringify(r)})`);
  // Manifeste et icônes de l'appli web.
  const man = await page.evaluate(async () => { const m = await (await fetch(document.querySelector('link[rel=manifest]').href)).json(); const st = await Promise.all([...m.icons.map((i) => i.src), 'assets/icons/icon-180.png'].map(async (s) => (await fetch(s)).status)); return { display: m.display, start: m.start_url, st }; });
  console.log('manifeste', JSON.stringify(man));
  check(man.display === 'fullscreen' && man.st.every((s) => s === 200), `manifeste ou icônes (${JSON.stringify(man)})`);
  await ctx.close();
}
// 2. iPhone dans Safari : bouton visible dans l'en-tête, qui tient dans la largeur ; il ouvre l'explication pour iPhone (écran d'accueil).
{
  const { ctx, page } = await open('iphone', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, userAgent: IPHONE }, { fn: asIphone, arg: false });
  const head = await page.evaluate(() => { const h = document.querySelector('.site-header'), r = [...h.querySelectorAll('.header-link')].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().right)); return { right: Math.max(...r), vw: innerWidth }; });
  check(await vis(page, '#fullscreenButton') && head.right <= head.vw, `iPhone : bouton « Plein écran » absent ou en-tête qui déborde (${JSON.stringify(head)})`);
  await page.screenshot({ path: path.join(dir, 'shots/fs_iphone_menu.png') });
  // À la verticale aussi (390 px de large).
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  const port = await page.evaluate(() => { const r = [...document.querySelectorAll('.site-header .header-link')].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().right)); return { right: Math.max(...r), vw: innerWidth }; });
  check(port.right <= port.vw, `iPhone vertical : en-tête qui déborde (${JSON.stringify(port)})`);
  await page.screenshot({ path: path.join(dir, 'shots/fs_iphone_menu_vertical.png') });
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(300);
  await page.tap('#fullscreenButton'); await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({ help: !document.getElementById('fsHelp').classList.contains('hidden'), ios: !document.getElementById('fsHelpIos').classList.contains('hidden'), other: !document.getElementById('fsHelpOther').classList.contains('hidden'), framed: !document.getElementById('fsHelpFramed').classList.contains('hidden') }));
  console.log('iphone', JSON.stringify(r));
  check(r.help && r.ios && !r.other && !r.framed, `iPhone : explication absente ou mauvaise (${JSON.stringify(r)})`);
  // Tout tient à l'écran, « Compris » compris, sans faire défiler (iPhone à l'horizontale : 390 px de haut).
  const fit = await page.evaluate(() => { const c = document.querySelector('#fsHelp .pause-card').getBoundingClientRect(), b = document.getElementById('fsHelpClose').getBoundingClientRect(); return { w: Math.round(c.width), bottom: Math.round(b.bottom), vw: innerWidth, vh: innerHeight }; });
  check(fit.w <= fit.vw && fit.bottom <= fit.vh, `iPhone : explication plus grande que l'écran (${JSON.stringify(fit)})`);
  await page.screenshot({ path: path.join(dir, 'shots/fs_iphone_aide.png') });
  await page.locator('#fsHelpClose').scrollIntoViewIfNeeded(); await page.tap('#fsHelpClose');
  check(await page.evaluate(() => document.getElementById('fsHelp').classList.contains('hidden')), 'iPhone : « Compris » ne referme pas');
  // La partie démarre normalement, sans tenter le plein écran.
  await page.tap('#soloButton'); await page.evaluate(() => SP.sim(2));
  check(await page.evaluate(() => SP.G.mode === 'playing'), 'iPhone : la partie ne démarre pas');
  await ctx.close();
}
// 3. iPhone depuis l'icône de l'écran d'accueil : déjà plein écran, plus aucun bouton.
{
  const { ctx, page } = await open('icône', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, userAgent: IPHONE }, { fn: asIphone, arg: true });
  const r = await page.evaluate(() => ({ standalone: document.body.classList.contains('standalone') }));
  r.head = await vis(page, '#fullscreenButton');
  console.log('icône', JSON.stringify(r));
  check(r.standalone && !r.head, `icône : boutons plein écran encore affichés (${JSON.stringify(r)})`);
  await page.screenshot({ path: path.join(dir, 'shots/fs_iphone_icone.png') });
  await ctx.close();
}
// 4. Jeu affiché dans une autre page sans permission de plein écran (Artifact claude.ai) : l'explication renvoie à l'adresse du jeu.
{
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 680 } });
  await ctx.addInitScript(() => localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('[cadre] ' + e.message));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  // Page hôte d'une autre origine (comme claude.ai ; localhost ≠ 127.0.0.1, toutes deux locales pour que Chrome accepte le cadre) :
  // sans allow="fullscreen", le cadre n'a pas droit au plein écran.
  // Page servie par le serveur de test (une réponse interceptée passerait pour publique et Chrome refuserait le cadre local).
  fs.mkdirSync(path.join(dir, 'results'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'results', 'hote.html'), '<!doctype html><iframe src="http://127.0.0.1:8088/index.html" style="width:1000px;height:600px;border:0"></iframe>');
  await page.goto('http://localhost:8088/results/hote.html');
  const f = await (await page.$('iframe')).contentFrame();
  await f.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
  await f.click('#fullscreenButton'); await page.waitForTimeout(300);
  const r = await f.evaluate(() => ({ api: !!document.fullscreenEnabled, help: !document.getElementById('fsHelp').classList.contains('hidden'), framed: !document.getElementById('fsHelpFramed').classList.contains('hidden'), other: !document.getElementById('fsHelpOther').classList.contains('hidden'), ios: !document.getElementById('fsHelpIos').classList.contains('hidden') }));
  console.log('cadre', JSON.stringify(r));
  check(!r.api && r.help && r.framed && !r.other && !r.ios, `cadre : explication absente ou mauvaise (${JSON.stringify(r)})`);
  await ctx.close();
}
console.log('ERRORS:', errors.length); errors.slice(0, 20).forEach((e) => console.log(e));
await browser.close();
