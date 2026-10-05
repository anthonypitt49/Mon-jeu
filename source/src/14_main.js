/* ═══════════════════ DÉMARRAGE ET BOUCLE PRINCIPALE ═══════════════════ */

const menuCam = { active: true, t: 0 };
function updateMenu(dt, time) {
  menuCam.t += dt;
  const t = menuCam.t, cam = R.camera, [x, y, z, tx, ty, tz] = M.menu(t);
  cam.position.set(x, y, z);
  cam.lookAt(tx, ty, tz);
  if (cam.fov !== 62) { cam.fov = 62; cam.updateProjectionMatrix(); updateParticleScale(); }
  R.lights.torch.intensity = 0;
  const sn = MOON_DIR; R.lights.moon.target.position.set(x, 0, z - 8); R.lights.moon.position.set(x + sn.x * 60, sn.y * 60, z - 8 + sn.z * 60);
  R.lights.hemi.intensity = M.env.hemiOut + R.flash * 0.6;
  Sfx.setListener(cam);
  // Infectés errants à l'extérieur (décor du menu).
  const MZ = M.menuZombies;
  for (const zb of ZOMBIES) {
    if (!zb.menu) continue;
    zb.pos.x += zb.vel.x * dt; zb.pos.z += zb.vel.z * dt;
    if (MZ.axis === 'z') { if (zb.pos.z > MZ.bounds[1] || zb.pos.z < MZ.bounds[0]) zb.vel.z *= -1; }
    else if (zb.pos.x > MZ.bounds[1] || zb.pos.x < MZ.bounds[0]) zb.vel.x *= -1;
    zb.pos.y = surfH(zb.pos.x, zb.pos.z); zb.yaw = Math.atan2(zb.vel.x, zb.vel.z); zb.rise = 1; zb.state = 'move';
    zb.syncMesh(dt);
  }
}
function spawnMenuZombies() {
  const MZ = M.menuZombies;
  for (let i = 0; i < MZ.n; i++) {
    const x = rand(MZ.x[0], MZ.x[1]), z = rand(MZ.z[0], MZ.z[1]), zb = new Zombie({ x, z, y: surfH(x, z), kind: 'walker', hp: 100, state: 'move', yaw: 0 });
    const v = rand(0.45, 0.8) * (Math.random() < 0.5 ? -1 : 1);
    zb.menu = true; if (MZ.axis === 'z') zb.vel.set(0, 0, v); else zb.vel.set(v, 0, 0); zb.time = rand(20);
  }
}

function applyQuality() {
  Q = QUALITY[clamp(settings.quality | 0, 0, 3)];
  const r = R.renderer, L = R.lights;
  r.shadowMap.enabled = Q.shadows; L.moon.castShadow = Q.shadows;
  if (Q.shadows) { L.moon.shadow.mapSize.set(Q.shadowSize, Q.shadowSize); L.moon.shadow.map?.dispose(); L.moon.shadow.map = null; }
  L.torch.castShadow = Q.flashShadow;
  R.dynScale = 1; buildComposer(); resize(); aoStart(); photoStart();
  if (R.snow) { R.scene.remove(R.snow); R.snow.geometry.dispose(); } buildSnow();
  R.scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true)); });
}

const step = (label) => new Promise((res) => { const l = $('loadingLine'); if (l && !window.__spReady) l.querySelector('span').textContent = label; setTimeout(res, 16); });
async function init() {
  try {
    await step('GÉNÉRATION DU SECTEUR…');
    buildMap();
    initRenderer();
    await step('PEINTURE DES MATIÈRES…');
    buildTextures(); gunMaterials();
    await step(M.loading || 'CONSTRUCTION DU SECTEUR…');
    buildLights(); buildSky(); buildWorld();
    await step('LEVÉE DES MORTS…');
    initFX(); buildZombieAssets(); mountWallWeapons(); if (!/nomerge/.test(location.search)) mergeStatic(); buildSnow(); photoStart(); aoStart();
    bindInput(); UI.init(); initBoard();
    NET.detect().then(() => UI.netStatus());
    G.reset();
    spawnMenuZombies();
    await step('PRÉCHAUFFAGE DES SHADERS…');
    try { R.renderer.compile(R.scene, R.camera); R.renderer.compile(R.viewScene, R.viewCam); } catch { /* compilation paresseuse */ }
    window.__spReady = true;
    $('loadingLine').classList.add('hidden');
    $('soloButton').disabled = false; $('joinButton').disabled = false; $('mapButton').disabled = false;
    checkVersion();
    autoJoin();
    requestAnimationFrame(frame);
  } catch (err) {
    console.error(err);
    window.__spFail && window.__spFail('Impossible de démarrer le jeu sur cet appareil (WebGL 2 requis). Détail : ' + (err?.message || err));
  }
}

// Mise à jour automatique (GitHub Pages) : si une version plus récente est en ligne, on la charge depuis le menu,
// pour que l'hôte et ses amis aient toujours le même jeu (des versions différentes ne se trouvent pas).
function checkVersion() {
  if (!/github\.io$/.test(location.hostname) && !new URLSearchParams(location.search).has('vcheck')) return;
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j || !j.v || j.v === GAME_VERSION || new URLSearchParams(location.search).get('v') === j.v) return;
    if (G.mode === 'menu' && !NET.active) { UI.joinStatus('Mise à jour du jeu…'); location.replace(location.pathname + '?v=' + encodeURIComponent(j.v) + location.hash); }
  }).catch(() => { /* hors ligne */ });
}
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  const time = now / 1000;
  if (G.mode === 'playing' || (G.mode === 'paused' && NET.active)) {
    G.update(dt);
    if (G.mode === 'playing') updatePlayer(dt);
    NET.clientTick(dt);
  } else if (G.mode === 'menu') updateMenu(dt, time);
  updatePings(dt); updateObjMarker();
  updateWeather(dt, time);
  if (M.anim && G.mode !== 'paused') M.anim(dt, time);
  updateFX(dt, time);
  Sfx.tickAmbience(dt, time);
  UI.tick(dt);
  dynamicResolution(dt);
  renderFrame(time);
}
addEventListener('beforeunload', () => NET.leave(true));
// Minuterie réseau indépendante de l'affichage. Onglet de l'hôte en arrière-plan : la partie continue
// (sans rendu) pour que les camarades ne restent pas figés.
setInterval(() => {
  NET.watch();
  if (!document.hidden || !NET.active || !NET.isHost || !NET.inGame) return;
  const now = performance.now(); let el = Math.min(1.5, (now - last) / 1000); last = now;
  while (el > 1e-3) { const dt = Math.min(0.05, el); G.update(dt); el -= dt; }
}, 250);
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'playing' && !NET.active) pauseGame(); });
window.SP = { PHOTO_SETS, KIT, buildGunModel, buildKnife, buildGrenadeModel, clipViewmodel, GM, PHOTO, MATS, GLOWB, SECRET, Sfx, tip, tipsTick, FX, PWR, pwrParts, RELAYS, RELAY, joinFailText, INTERACT_CUR: () => INTERACT.cur, ROBOT: () => ROBOT, rayWorld, FIL: () => FIL_STATE, PEN: () => PEN_STATE, CITE: () => CITE_STATE, M: () => M, MAP_ID: () => MAP_ID, MAPW: () => MAP_W, MAPS, FLOWD: (x, z) => (inMap(x, z) ? FLOW.dist[ti(x, z)] : -9), TCLASS: (x, z) => tClass(x, z), SUPPORT_T: () => [SUPPORT.t, SUPPORT.owner], Zombie, RTC, RELAY, WORLD, boxSpots: () => WORLD.boxSpots, PINGS, SPEC, THREE, pingNow: () => { pingCd = 0; doPing(); }, BOARD, QUEST, TRAPS, TUBE_SPOTS, spawnTestZombie: (x, z, kind = 'walker') => new Zombie({ x, z, y: 0, kind, hp: 1e6, state: 'move', round: 1, yaw: Math.PI / 2 }), G, P, R, NET, ZOMBIES, MAP, WEAPONS, FX, UI, INPUT, PROJ, WEATHER, beginGame, grantWeapon, settings, updatePlayer, renderFrame, throwGrenade, knife, tryReload, switchWeapon, pauseGame, resumeGame, backToMenu, applyQuality,
  sim(sec, dt = 0.05) { for (let t = 0; t < sec; t += dt) { if (G.mode === 'playing' || (G.mode === 'paused' && NET.active)) { G.update(dt); if (G.mode === 'playing') updatePlayer(dt); NET.clientTick(dt); } updateFX(dt, performance.now() / 1000 + t); } } };
