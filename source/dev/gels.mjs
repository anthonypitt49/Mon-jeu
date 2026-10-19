// Gels et à-coups : ce que le jeu fait au mauvais moment. Compte, phase par phase (chargement, menu, menu au repos, début
// de partie), les compilations de shaders (linkProgram, et la lecture de leur état qui attend la fin de la compilation),
// les envois de textures à la carte graphique, les tâches longues du fil principal et les images de plus de 100 ms.
// Sur une vraie carte graphique (Windows : ANGLE/Direct3D), chaque shader compilé coûte de 20 à 300 ms : il n'en faut
// aucun une fois le menu affiché, ni en partie. Le rendu logiciel du conteneur est lent : ses tâches longues de rendu
// ne veulent rien dire, ce sont les compilations et les envois tardifs qui comptent.
// Usage : node gels.mjs <carte> [qualité=2] [secondes de partie=25] ; WEB=http://127.0.0.1:<port> ; MATS=1 : nomme les matières
// compilées et leurs paramètres (Δ) ; NOACT=1 : sans la partie scriptée ; Q=nophoto : sans les photos. Affiche ERRORS n
// (erreurs de la page) et TARDIFS n (shaders compilés après l'affichage du menu).
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname), id = process.argv[2] || 'poste7', q = +(process.argv[3] ?? 2), playS = +(process.argv[4] ?? 25);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
await ctx.addInitScript(([q, mats]) => {
  localStorage.setItem('sp_settings', JSON.stringify({ quality: q }));
  const G = (window.__G = { ev: [], phase: 'chargement' });
  const mark = (k, d, x) => G.ev.push([Math.round(performance.now()), G.phase, k, d, x]);
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue; const P = C.prototype;
    const wrap = (name, kind, info) => { const f = P[name]; if (!f) return; P[name] = function (...a) { const t = performance.now(), r = f.apply(this, a); mark(kind, performance.now() - t, info ? info(a) : undefined); return r; }; };
    // Programme lié : nom du shader (SHADER_NAME de three.js) et ses options marquantes, pour savoir quoi préchauffer.
    const desc = function (prog) { try { const src = this.getAttachedShaders(prog).map((sh) => this.getShaderSource(sh)).join('\n'); const nm = /#define SHADER_NAME (\S+)/.exec(src)?.[1] || '?'; const f = ['USE_SKINNING', 'USE_INSTANCING', 'USE_MAP', 'USE_NORMALMAP', 'USE_ALPHATEST', 'USE_SHADOWMAP', 'DEPTH_PACKING', 'USE_POINTS', 'FLAT_SHADED', 'USE_COLOR', 'DOUBLE_SIDED', 'USE_ALPHAMAP', 'USE_FOG'].filter((d) => new RegExp('#define ' + d + '\\b').test(src)).map((d) => d.replace('USE_', '').toLowerCase()); const ul = (src.match(/uniform\s+\w+\s+(u[A-Z]\w*)/g) || []).map((u) => u.split(/\s+/).pop()).slice(0, 4); return nm + (f.length ? '[' + f.join(',') + ']' : '') + (ul.length ? '{' + ul.join(',') + '}' : ''); } catch { return '?'; } };
    { const f = P.linkProgram; P.linkProgram = function (p) { const t = performance.now(), r = f.call(this, p); mark('link', performance.now() - t, desc.call(this, p)); return r; }; }
    wrap('compileShader', 'compile');
    wrap('getProgramParameter', 'wait', (a) => a[1]); // (LINK_STATUS : attend la fin de la compilation)
    const texInfo = (a) => { const s = a.find((v) => v && typeof v === 'object' && 'width' in v); return s ? `${s.width}x${s.height}` : (typeof a[3] === 'number' && typeof a[4] === 'number' ? `${a[3]}x${a[4]}` : ''); };
    wrap('texImage2D', 'tex', texInfo); wrap('texSubImage2D', 'tex', texInfo); wrap('texStorage2D', 'alloc', (a) => `${a[3]}x${a[4]}`);
  }
  // Matières compilées, dès la création du moteur (window.SP posé avant init()) : voir __patchMats.
  window.__patchMats = function (THREE) {
    const M = THREE.Material.prototype, f = M.onBeforeCompile;
      // Paramètres de chaque compilation (valeurs simples), pour comparer une compilation tardive à la précédente de la même matière.
      const PR = (window.__G.params ||= {}), flat = (p) => { const o = {}; for (const [k, v] of Object.entries(p || {})) if (v === null || ['number', 'boolean'].includes(typeof v) || (typeof v === 'string' && v.length < 40)) o[k] = v; return o; };
      const diffP = (a, b) => Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]).map((k) => `${k}:${a[k]}→${b[k]}`).join(' ');
      const SNAP = (window.__G.snapAll ||= {});
      M.onBeforeCompile = function (...a) {
        const cur = flat(a[0]), prev = PR[this.uuid]; PR[this.uuid] = cur;
        const ref = prev || SNAP[this.type + '|' + (cur.shaderID || '')]; SNAP[this.type + '|' + (cur.shaderID || '')] ||= cur;
        (window.__G.pdiff ||= []).push([window.__G.phase, this.uuid.slice(0, 4), ref ? (prev ? 'même matière : ' : 'même type : ') + diffP(ref, cur) : 'première de son type', Object.keys(this.userData || {}).join('/')]); (window.__G.mats ||= []).push([window.__G.phase, `${this.uuid.slice(0, 4)} v${this.version} t${(performance.now() / 1000).toFixed(1)} ${this.type}${this.name ? ' « ' + this.name + ' »' : ''} #${this.color?.getHexString?.() || '-'}${this.map ? ' tex ' + (this.map.image?.width || '?') : ''}${this.blending === 2 ? ' additif' : ''}${this.clippingPlanes?.length ? ' coupé' : ''}${this.isMeshDepthMaterial || this.isMeshDistanceMaterial ? ' ← ' + (new Error().stack || '').split('\n').slice(2, 14).map((l) => (/at (?:\S+\.)?(\w+)/.exec(l) || [])[1]).filter((n) => n && !/^(getProgram|setProgram|renderBufferDirect|renderObject|renderObjects|renderScene|onBeforeCompile|anonymous)$/.test(n)).slice(0, 5).join('<') : ''}`]); return f.apply(this, a); }; 
  };
  // (Seulement avec MATS=1 : three.js met le texte de onBeforeCompile dans la clé de chaque shader ; posé après le préchauffage,
  // cet espion forcerait lui-même des recompilations. Posé avant init(), il ne fausse rien.)
  if (mats) Object.defineProperty(window, 'SP', { configurable: true, get() { return this.__sp; }, set(v) { this.__sp = v; try { window.__patchMats(v.THREE); } catch (e) { console.error(e); } } });
  let last = 0; const loop = (now) => { if (last && now - last > 100) mark('frame', now - last); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) G.ev.push([Math.round(e.startTime), G.phase, 'long', e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch { /* sans tâches longues */ }
}, [q, !!process.env.MATS]);
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
const T = {}; const t0 = Date.now(), now = () => ((Date.now() - t0) / 1000).toFixed(1);
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html' + (process.env.Q ? '?' + process.env.Q : '') + '#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 300000 }); T.menu = now();
const setPhase = (ph) => page.evaluate((ph) => { window.__G.phase = ph; (window.__G.pc ||= []).push([ph, SP.R.renderer.info.programs.length]); }, ph);
await setPhase('menu'); T.readyPerf = await page.evaluate(() => (performance.now() / 1000).toFixed(1));

// Menu : on attend la fin des chargements en arrière-plan (photos, infectés réalistes), puis 8 s de repos.
await page.waitForFunction(() => !['loading'].includes(SP.PHOTO.state) && !['loading'].includes(SP.ZREAL?.state), null, { timeout: 400000, polling: 500 }).catch(() => {});
T.charges = now(); await setPhase('menu au repos'); await page.waitForTimeout(8000);
await setPhase('début de partie'); T.clic = await page.evaluate(() => { const t = performance.now(); document.getElementById('soloButton').click(); return Math.round(performance.now() - t); });
T.partie = now(); await page.waitForTimeout(playS * 1000);
// Partie scriptée : ce que fait un joueur (chaque action laisse le jeu dessiner 1,5 s, le temps de compiler ce qu'elle montre).
const act = async (label, fn) => { await setPhase('partie : ' + label); await page.evaluate((src) => new Function('SP', src)(SP), `(${fn})(SP)`); await page.waitForTimeout(1500); };
if (!process.env.NOACT) {
  await act('infectés', (SP) => { const { P, G } = SP; P.hp = P.maxHp = 1e9; G.me().points = 1e6; const f = [-Math.sin(P.yaw), -Math.cos(P.yaw)]; for (let i = 0; i < 4; i++) { const z = SP.spawnTestZombie(P.pos.x + f[0] * (3 + i * 0.7) + f[1] * (i - 1.5) * 0.8, P.pos.z + f[1] * (3 + i * 0.7) - f[0] * (i - 1.5) * 0.8); z.hp = z.maxHp = 1e6; } });
  await act('tir', (SP) => { SP.INPUT.fire = true; setTimeout(() => (SP.INPUT.fire = false), 1200); });
  await act('mise à mort', (SP) => { for (const z of SP.ZOMBIES) if (z.alive && !z.menu) SP.G.applyDamage(z, 1e7, SP.P.id, { dir: new SP.THREE.Vector3(Math.random() - 0.5, 0.3, Math.random() - 0.5), limb: true, explosive: true }); });
  await act('grenade', (SP) => SP.throwGrenade && SP.throwGrenade());
  await act('couteau', (SP) => SP.knife && SP.knife());
  await act('caisse', (SP) => { const s = SP.boxSpots()[SP.G.box.loc]; SP.P.pos.set(s.pos.x - s.face[0] * 1.6, 0, s.pos.z - s.face[1] * 1.6); SP.P.yaw = Math.atan2(s.face[0], s.face[1]) + Math.PI; SP.G.interact(SP.P.id, 'box'); });
  await act('armes', (SP) => { for (const k of Object.keys(SP.WEAPONS).slice(0, 6)) SP.grantWeapon(k); });
  await act('atout', (SP) => { const p = SP.WORLD.perks.find((q) => q.landed) || SP.WORLD.perks[0]; if (p) SP.G.interact(SP.P.id, 'perk', p.key); });
  await act('armurier', (SP) => { SP.G.power = true; SP.G.interact(SP.P.id, 'bench', SP.P.weapons[SP.P.slot]?.key); });
}
const info = await page.evaluate(() => ({ photo: SP.PHOTO.state, zreal: SP.ZREAL?.state, zombies: SP.ZOMBIES.filter((z) => !z.menu).length, progs: SP.R.renderer.info.programs.length, round: SP.G.round }));
const ev = await page.evaluate(() => window.__G.ev);
const pdiff = await page.evaluate(() => window.__G.pdiff || []);
for (const [ph, u, d, ud] of pdiff) if (ph !== 'chargement' && !process.env.NODIFF) console.log(`  ∆ ${ph} ${u}${ud ? ' {' + ud + '}' : ''} : ${d.slice(0, 300)}`);
const progs = await page.evaluate(() => {
  // Objets qui portent chaque matière compilée hors chargement : chemin (types/noms des parents) et position.
  const own = {}, path = (o) => { const a = []; for (let q = o; q && a.length < 5; q = q.parent) a.push(q.name || q.type); return a.join('<'); };
  for (const sc of [SP.R.scene, SP.R.viewScene]) sc.traverse((o) => { for (const m of [].concat(o.material || [])) { const k = m.uuid.slice(0, 4); if (!own[k]) { const p = o.getWorldPosition(new SP.THREE.Vector3()); own[k] = path(o) + ` @${p.x.toFixed(0)},${p.y.toFixed(0)},${p.z.toFixed(0)} ${o.geometry?.type || ''}/${o.geometry?.attributes?.position?.count || 0}${o.receiveShadow ? ' reçoit' : ''}${o.castShadow ? ' porte' : ''}${o.visible ? '' : ' caché'}` + (sc === SP.R.viewScene ? ' (arme en main)' : ''); } } });
  return { names: SP.R.renderer.info.programs.map((p) => p.name), pc: window.__G.pc || [], mats: (window.__G.mats || []).map(([ph, d]) => [ph, d + (own[d.slice(0, 4)] ? ' ⇐ ' + own[d.slice(0, 4)] : '')]) };
});
const phases = [...new Set(ev.map((x) => x[1]))], fmt = (x) => Math.round(x);
console.log(`carte ${id}, qualité ${q} : menu à ${T.menu} s, chargements finis à ${T.charges} s, partie à ${T.partie} s ; photos ${info.photo}, infectés réalistes ${info.zreal}, ${info.zombies} infectés en partie (manche ${info.round}), ${info.progs} programmes`);
let late = 0;
for (const ph of phases) {
  const e = ev.filter((x) => x[1] === ph), sum = (k) => e.filter((x) => x[2] === k).reduce((s, x) => s + x[3], 0), n = (k) => e.filter((x) => x[2] === k).length;
  const waits = e.filter((x) => x[2] === 'wait' && x[4] === 35714); // LINK_STATUS
  const tex = e.filter((x) => x[2] === 'tex'), big = tex.filter((x) => { const m = /^(\d+)x(\d+)$/.exec(x[4] || ''); return m && +m[1] * +m[2] >= 512 * 512; });
  if (ph !== 'chargement') late += n('link');
  console.log(`— ${ph} : ${n('link')} shaders liés (${fmt(sum('link') + waits.reduce((s, x) => s + x[3], 0))} ms), ${n('compile')} compilés (${fmt(sum('compile'))} ms) ; ${tex.length} envois de texture (${fmt(sum('tex'))} ms, dont ${big.length} ≥ 512² : ${fmt(big.reduce((s, x) => s + x[3], 0))} ms) ; ${n('long')} tâches longues (${fmt(sum('long'))} ms, max ${fmt(Math.max(0, ...e.filter((x) => x[2] === 'long').map((x) => x[3])))} ms) ; ${n('frame')} images > 100 ms (max ${fmt(Math.max(0, ...e.filter((x) => x[2] === 'frame').map((x) => x[3])))} ms)`);
}
console.log(`clic « Solo » : ${T.clic} ms dans le fil principal ; accueil affiché à t${T.readyPerf} (horloge de la page)`);
// Programmes créés après chaque changement de phase (ordre de création de renderer.info.programs).
for (let i = 0; i < progs.pc.length; i++) { const [ph, k] = progs.pc[i], k1 = i + 1 < progs.pc.length ? progs.pc[i + 1][1] : progs.names.length; if (k1 > k) console.log(`  nouveaux programmes (${ph}) : ${progs.names.slice(k, k1).join(', ')}`); }
// Détail des compilations tardives, regroupées par seconde.
const lateEv = ev.filter((x) => x[1] !== 'chargement' && x[2] === 'link'), bySec = new Map();
const byPh = new Map(); for (const x of lateEv) { if (!byPh.has(x[1])) byPh.set(x[1], []); byPh.get(x[1]).push(x[4]); }
for (const [ph, l] of byPh) console.log(`  shaders tardifs (${ph}) : ${l.join(' · ')}`);
if (process.env.UUID) console.log('  suivi ' + process.env.UUID + ' : ' + progs.mats.filter(([, d]) => d.startsWith(process.env.UUID)).map(([ph, d]) => ph + ' ' + d.slice(0, 40)).join(' · '));
const byPhM = new Map(); for (const [ph, d] of progs.mats) { if (!byPhM.has(ph)) byPhM.set(ph, []); byPhM.get(ph).push(d); }
const seenAt = new Map(); for (const [ph, d] of progs.mats) { const k = d.slice(0, 4); if (!seenAt.has(k)) seenAt.set(k, ph + ' ' + d.split(' ')[1]); }
T.readyPerf = T.readyPerf;
for (const [ph, l] of byPhM) console.log(`  matières compilées (${ph}) : ${l.map((d) => d + (seenAt.get(d.slice(0, 4)) && !seenAt.get(d.slice(0, 4)).startsWith(ph) ? ` [déjà : ${seenAt.get(d.slice(0, 4))}]` : '')).join(' · ')}`);
for (const x of lateEv) { const k = x[1] + ' @' + (x[0] / 1000).toFixed(0) + ' s'; bySec.set(k, (bySec.get(k) || 0) + 1); }
if (bySec.size) console.log('shaders tardifs : ' + [...bySec].map(([k, v]) => `${v} (${k})`).join(', '));
for (const e of errors) console.log('[pageerror]', e);
console.log(`TARDIFS ${late} ; ERRORS ${errors.length}`);
await browser.close();
