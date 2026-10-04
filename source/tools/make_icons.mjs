// Icônes de l'appli web (écran d'accueil iPhone et Android), dessinées en SVG et rendues en PNG par le navigateur de test.
// usage (depuis source/, après `npm install` dans dev/) : node tools/make_icons.mjs → ../assets/icons/icon-180.png, -192, -512.
// Fond plein, sans transparence : iOS arrondit lui-même les coins, Android peut découper l'icône (« maskable ») ; le flocon reste au centre.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const { chromium } = createRequire(path.join(dir, '..', 'dev', 'package.json'))('playwright');
const out = path.join(dir, '..', '..', 'assets', 'icons');
fs.mkdirSync(out, { recursive: true });
// Flocon : trois axes et leurs ramures, couleur « givre » du jeu, sur la nuit polaire avec une lueur au centre.
const arm = 'M0-19V19M0-12l-5-5M0-12l5-5M0 12l-5 5M0 12l5 5';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><radialGradient id="g" cx="50%" cy="46%" r="62%"><stop offset="0" stop-color="#16303e"/><stop offset="1" stop-color="#050b10"/></radialGradient></defs>
<rect width="64" height="64" fill="url(#g)"/>
<g transform="translate(32 32)" fill="none" stroke="#9ce8ff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
<path d="${arm}"/><path d="${arm}" transform="rotate(60)"/><path d="${arm}" transform="rotate(-60)"/></g></svg>`;
const browser = await chromium.launch();
const page = await browser.newPage();
for (const s of [180, 192, 512]) {
  await page.setViewportSize({ width: s, height: s });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${s}px;height:${s}px}</style>${svg}`);
  await page.screenshot({ path: path.join(out, `icon-${s}.png`) });
  console.log('icône', s);
}
await browser.close();
