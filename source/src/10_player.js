/* ═══════════════════ JOUEUR LOCAL : commandes, déplacement, caméra, tir ═══════════════════ */

const INPUT = { keys: new Set(), fire: false, firePressed: false, ads: false, dx: 0, dy: 0, wheel: 0, locked: false, touchMove: { x: 0, y: 0 }, touchLook: { x: 0, y: 0 }, touchAds: false, interactHeld: false, jumpPressed: false };
const P = {
  id: 'me', name: 'SOLDAT', pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: true, crouch: 0, sprint: false, stamina: 1,
  hp: 100, maxHp: 100, regenT: 0, down: false, dead: false, bleed: 0, selfRevive: 0, perks: new Set(), weapons: [], slot: 0, grenades: 2,
  ads: 0, fireCd: 0, reload: null, cycleT: 0, switchT: 0, switchTo: -1, knifeT: 0, nadeT: 0, torch: true, bobT: 0, land: 0, bloom: 0,
  rec: { p: 0, y: 0 }, kick: 0, sway: { x: 0, y: 0 }, stepT: 0, breathT: 3, hurtT: 0, lastHurtDir: 0, shotsFired: 0,
  stats: { kills: 0, heads: 0, shots: 0, hits: 0, downs: 0 },
};
const VM = { root: null, parts: null, key: null, up: false, flash: null, knife: null, nade: null };

function resetLocalPlayer(spawn) {
  Object.assign(P, { frostT: 0, hp: DIFF().hp, maxHp: DIFF().hp, down: false, dead: false, bleed: 0, selfRevive: 0, perks: new Set(), weapons: [{ key: 'pistol', up: false, mag: 12, reserve: 60 }], slot: 0, grenades: 2, ads: 0, fireCd: 0, reload: null, cycleT: 0, switchT: 0, switchTo: -1, knifeT: 0, nadeT: 0, bloom: 0, stamina: 1, hurtT: 0, cherryCd: 0 });
  P.stats = { kills: 0, heads: 0, shots: 0, hits: 0, downs: 0 };
  P.pos.set(tcx(spawn[0]), 0, tcx(spawn[1])); P.vel.set(0, 0, 0); P.yaw = SPOTS.startYaw; P.pitch = 0;
  setViewmodel('pistol', false);
}
const curW = () => P.weapons[P.slot];
const curS = () => { const w = curW(); return w ? wstat(w.key, w.up) : WEAPONS.pistol; };
const maxWeapons = () => (P.perks.has('mule') ? 3 : 2);

/* ─── Entrées ─── */
function bindInput() {
  const canvas = $('game');
  addEventListener('keydown', (e) => {
    if (G.mode !== 'playing') return;
    if (e.code === 'Tab') { e.preventDefault(); UI.showTeam(true); return; }
    if (e.repeat) return;
    INPUT.keys.add(e.code);
    switch (e.code) {
      case 'KeyR': tryReload(); break;
      case 'Digit1': case 'Numpad1': switchWeapon(0); break;
      case 'Digit2': case 'Numpad2': switchWeapon(1); break;
      case 'Digit3': case 'Numpad3': switchWeapon(2); break;
      case 'KeyG': throwGrenade(); break;
      case 'KeyV': knife(); break;
      case 'KeyF': toggleTorch(); break;
      case 'Space': INPUT.jumpPressed = true; break;
      case 'KeyE': INPUT.interactPressed = true; break;
      case 'KeyP': pauseGame(); break;
      case 'KeyQ': doPing(); break;
    }
  });
  addEventListener('keyup', (e) => { INPUT.keys.delete(e.code); if (e.code === 'Tab') UI.showTeam(false); });
  canvas.addEventListener('mousedown', (e) => {
    if (G.mode !== 'playing') return;
    if (!INPUT.locked && !IS_TOUCH) { requestLock(); return; }
    if (e.button === 0) { INPUT.fire = true; INPUT.firePressed = true; }
    if (e.button === 2) INPUT.ads = true;
    if (e.button === 1 || e.button === 3) knife();
  });
  addEventListener('mouseup', (e) => { if (e.button === 0) INPUT.fire = false; if (e.button === 2) INPUT.ads = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('mousemove', (e) => { if (INPUT.locked) { INPUT.dx += e.movementX; INPUT.dy += e.movementY; } });
  addEventListener('wheel', (e) => { if (G.mode === 'playing' && INPUT.locked) cycleWeapon(e.deltaY < 0 ? -1 : 1); }, { passive: true });
  document.addEventListener('pointerlockchange', () => {
    INPUT.locked = document.pointerLockElement === canvas;
    if (INPUT.locked && G.mode !== 'playing') { G.ignoreUnlock = true; document.exitPointerLock(); return; } // verrou accordé trop tard
    if (!INPUT.locked && G.mode === 'playing' && !IS_TOUCH && !G.ignoreUnlock) pauseGame();
    G.ignoreUnlock = false;
  });
  addEventListener('blur', () => { INPUT.keys.clear(); INPUT.fire = false; INPUT.ads = false; });
  document.addEventListener('pointerlockerror', () => setTimeout(() => {
    if (G.mode === 'playing' && !IS_TOUCH && !INPUT.locked) { pauseGame(); $('pauseNote').textContent = 'Le navigateur a refusé de capturer la souris : cliquez sur « Reprendre ».'; }
  }, 350));
  bindTouch();
}
function requestLock() { const c = $('game'); try { const r = c.requestPointerLock({ unadjustedMovement: true }); if (r && r.catch) r.catch(() => { try { c.requestPointerLock(); } catch { /* refusé */ } }); } catch { try { c.requestPointerLock(); } catch { /* indisponible */ } } }

function bindTouch() {
  const base = $('joystickBase'), knob = $('joystickKnob');
  let moveId = null, lookId = null, ox = 0, oy = 0, lx = 0, ly = 0;
  $('moveZone').addEventListener('pointerdown', (e) => { moveId = e.pointerId; ox = e.clientX; oy = e.clientY; base.style.display = 'block'; base.style.left = ox + 'px'; base.style.top = oy + 'px'; e.target.setPointerCapture(e.pointerId); });
  $('moveZone').addEventListener('pointermove', (e) => { if (e.pointerId !== moveId) return; let dx = e.clientX - ox, dy = e.clientY - oy; const L = Math.hypot(dx, dy), M = 48; if (L > M) { dx *= M / L; dy *= M / L; } knob.style.transform = `translate(${dx}px,${dy}px)`; INPUT.touchMove.x = dx / M; INPUT.touchMove.y = dy / M; INPUT.touchSprint = L > M * 1.25 && dy < 0; });
  const endMove = (e) => { if (e.pointerId !== moveId) return; moveId = null; base.style.display = 'none'; knob.style.transform = ''; INPUT.touchMove.x = INPUT.touchMove.y = 0; INPUT.touchSprint = false; };
  $('moveZone').addEventListener('pointerup', endMove); $('moveZone').addEventListener('pointercancel', endMove);
  $('lookZone').addEventListener('pointerdown', (e) => { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; e.target.setPointerCapture(e.pointerId); });
  $('lookZone').addEventListener('pointermove', (e) => { if (e.pointerId !== lookId) return; INPUT.dx += (e.clientX - lx) * 1.6; INPUT.dy += (e.clientY - ly) * 1.6; lx = e.clientX; ly = e.clientY; });
  const endLook = (e) => { if (e.pointerId === lookId) lookId = null; };
  $('lookZone').addEventListener('pointerup', endLook); $('lookZone').addEventListener('pointercancel', endLook);
  const hold = (id, on, off) => { const el = $(id); el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.classList.add('active'); on(); }); const up = () => { el.classList.remove('active'); off && off(); }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up); };
  hold('fireButton', () => { INPUT.fire = true; INPUT.firePressed = true; }, () => { INPUT.fire = false; });
  hold('aimButton', () => { INPUT.touchAds = !INPUT.touchAds; });
  hold('jumpButton', () => { INPUT.jumpPressed = true; });
  hold('reloadButton', () => tryReload());
  hold('interactButton', () => { INPUT.interactPressed = true; INPUT.interactHeld = true; }, () => { INPUT.interactHeld = false; });
  hold('nadeButton', () => throwGrenade());
  hold('knifeButton', () => knife());
  hold('lightButton', () => toggleTorch());
  hold('pauseButtonTouch', () => pauseGame());
  hold('pingButton', () => doPing());
  document.querySelectorAll('.weapon-select button').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); switchWeapon(+b.dataset.slot); }));
}
const key = (c) => INPUT.keys.has(c);

/* ─── Mise à jour du joueur ─── */
function updatePlayer(dt) {
  const sens = settings.sens * 0.0022;
  // Regard : souris, tactile, flèches (commande d'origine).
  let lookX = INPUT.dx * sens, lookY = INPUT.dy * sens * (settings.invertY ? -1 : 1); INPUT.dx = INPUT.dy = 0;
  const adsSlow = 1 - P.ads * (1 - 1 / curS().zoom) * 0.85;
  if (key('ArrowLeft')) lookX -= 2.4 * dt * settings.sens; if (key('ArrowRight')) lookX += 2.4 * dt * settings.sens;
  if (key('ArrowUp')) lookY -= 1.6 * dt * settings.sens; if (key('ArrowDown')) lookY += 1.6 * dt * settings.sens;
  P.yaw -= lookX * adsSlow; P.pitch = clamp(P.pitch - lookY * adsSlow, -1.45, 1.45);
  P.sway.x = damp(P.sway.x, clamp(lookX * 8, -0.06, 0.06), 10, dt); P.sway.y = damp(P.sway.y, clamp(lookY * 8, -0.06, 0.06), 10, dt);
  // Éliminé en co-op : caméra spectateur sur un camarade jusqu'à la manche suivante.
  if (P.dead && !G.solo && updateSpectator(dt)) return;
  if (SPEC.target) { SPEC.target = null; spectateLabel(null); }
  // Gelé par un Givreux : on avance au ralenti et l'écran se couvre de givre.
  if (P.frostT > 0) P.frostT = Math.max(0, P.frostT - dt);
  G.frostSlow = P.frostT > 0 ? 0.6 : 1;
  { const o = P.frostT > 0 ? Math.min(1, P.frostT / 1.2) : 0; if (Math.abs((UI.frostO || 0) - o) > 0.02 || (o === 0 && UI.frostO)) { UI.frostO = o; $('frostfx').style.opacity = o.toFixed(2); } }

  // Déplacement.
  let mf = (key('KeyW') ? 1 : 0) - (key('KeyS') ? 1 : 0) - INPUT.touchMove.y, ms = (key('KeyD') ? 1 : 0) - (key('KeyA') ? 1 : 0) + INPUT.touchMove.x;
  const ml = Math.hypot(mf, ms); if (ml > 1) { mf /= ml; ms /= ml; }
  const crouching = key('KeyC') || key('ControlLeft') || P.down;
  P.crouch = damp(P.crouch, crouching ? 1 : 0, 12, dt);
  const wantSprint = (key('ShiftLeft') || key('ShiftRight') || INPUT.touchSprint) && mf > 0.3 && !crouching && P.ads < 0.3 && !P.down;
  const hasSprintPerk = P.perks.has('sprint');
  P.sprint = wantSprint && (P.stamina > 0.05 || hasSprintPerk) && !P.reload?.blockSprint;
  if (P.sprint && !hasSprintPerk) P.stamina = Math.max(0, P.stamina - dt / 4.5); else P.stamina = Math.min(1, P.stamina + dt / (P.sprint ? 99 : 3));
  if (P.sprint && P.reload && !P.perks.has('reload')) { /* on peut sprinter en rechargeant */ }
  const S = curS();
  let speed = 4.35 * (S.move || 1) * lerp(1, 0.52, P.crouch) * (P.sprint ? (hasSprintPerk ? 1.72 : 1.5) : 1) * lerp(1, 0.62, P.ads) * (P.down ? 0.28 : 1) * (G.frostSlow || 1);
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  const wx = (-sy * mf + cy * ms) * speed, wz = (-cy * mf - sy * ms) * speed;
  const acc = P.onGround ? 11 : 2.2;
  P.vel.x = damp(P.vel.x, wx, acc, dt); P.vel.z = damp(P.vel.z, wz, acc, dt);
  if (INPUT.jumpPressed && P.onGround && !P.down && P.crouch < 0.5) { P.vel.y = 4.7; P.onGround = false; }
  INPUT.jumpPressed = false;
  P.vel.y -= GRAVITY * dt;
  P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt; P.pos.y += P.vel.y * dt;
  collideCircle(P.pos, P_RADIUS, pBlocked);
  collideProps(P.pos, P_RADIUS, P.pos.y, 0.3);
  const ground = propSupport(P.pos, P_RADIUS, P.pos.y, 0.3);
  if (P.pos.y <= ground) { if (!P.onGround && P.vel.y < -3) { P.land = Math.min(1, -P.vel.y / 9); stepSound(1.4); } P.pos.y = ground; P.vel.y = 0; P.onGround = true; } else if (P.pos.y > ground + 0.05) P.onGround = false;
  // Filet de sécurité : jamais hors des tranchées.
  if (!isTrench(tileOf(P.pos.x), tileOf(P.pos.z))) { const s = G.lastSafe || P.pos; P.pos.x = s.x; P.pos.z = s.z; } else G.lastSafe = P.pos.clone();

  // Pas et balancement.
  const hv = Math.hypot(P.vel.x, P.vel.z);
  if (P.onGround && hv > 0.5) { P.bobT += dt * hv * 1.9; P.stepT -= dt * hv; if (P.stepT <= 0) { P.stepT = P.sprint ? 1.45 : 1.25; stepSound(P.sprint ? 1.2 : P.crouch > 0.5 ? 0.5 : 0.9); } }
  P.land = Math.max(0, P.land - dt * 3);
  P.breathT -= dt; if (P.breathT <= 0) { P.breathT = rand(2.6, 4.2) * (P.sprint ? 0.5 : 1); if (!MAP.roof[ti(tileOf(P.pos.x), tileOf(P.pos.z))] || true) fxBreath(R.camera); }

  // Santé : régénération, à terre.
  if (!P.down) { P.regenT -= dt; if (P.regenT <= 0 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + dt * P.maxHp * 0.35); }
  else updateDowned(dt);
  P.hurtT = Math.max(0, P.hurtT - dt);

  updateWeapon(dt);
  updateCamera(dt);
  updateViewmodel(dt);
  updateInteraction(dt);
}
function stepSound(loud) {
  const i = ti(tileOf(P.pos.x), tileOf(P.pos.z)), st = MAP.style[i];
  const surf = M.stepSurface ? M.stepSurface(st) : st === STYLE_BUNKER ? 'concrete' : st === STYLE_DUGOUT ? 'wood' : (st === STYLE_YARD || st === STYLE_CRATER ? 'snow' : (Math.random() < 0.7 ? 'wood' : 'snow'));
  Sfx.step(surf, null, loud * (P.perks.has('sprint') ? 0.6 : 1));
  // Empreintes dans la neige (Poste 7) et la terre battue (Filon).
  // (Poste 7 : seulement les étendues de neige plates, ni les caillebotis des tranchées ni le relief bosselé du cratère.)
  const soft = MAP_ID === 'poste7' ? st === STYLE_YARD : MAP_ID === 'filon' && surf === 'snow';
  if (soft) { P.foot = -(P.foot || 1); addPrint(P.pos.x, P.pos.z, P.yaw, P.foot); }
}

function updateCamera(dt) {
  const cam = R.camera, S = curS();
  const eye = P.down ? 0.45 : lerp(EYE, EYE_CROUCH, P.crouch);
  const hv = Math.hypot(P.vel.x, P.vel.z), bobA = P.onGround ? clamp(hv / 4.3, 0, 1.6) * (1 - P.ads * 0.8) : 0;
  const bobY = Math.sin(P.bobT * 2) * 0.03 * bobA - P.land * 0.12, bobX = Math.cos(P.bobT) * 0.022 * bobA;
  const sh = FX.shake * 0.08;
  cam.position.set(P.pos.x + Math.cos(P.yaw) * bobX + rand(-sh, sh), P.pos.y + eye + bobY + rand(-sh, sh), P.pos.z - Math.sin(P.yaw) * bobX + rand(-sh, sh));
  P.rec.p = damp(P.rec.p, 0, 9, dt); P.rec.y = damp(P.rec.y, 0, 9, dt);
  const roll = (P.down ? 0.25 : 0) + Math.sin(P.bobT) * 0.004 * bobA + (G.deathCam || 0);
  cam.rotation.set(P.pitch + P.rec.p + FX.shake * rand(-0.02, 0.02), P.yaw + P.rec.y, roll);
  const fovT = settings.fov * (P.sprint ? 1.06 : 1) / (1 + (S.zoom - 1) * P.ads);
  if (Math.abs(cam.fov - fovT) > 0.05) { cam.fov = damp(cam.fov, fovT, 14, dt); cam.updateProjectionMatrix(); updateParticleScale(); }
  // Lampe torche.
  R.lights.torch.intensity = P.torch ? 5.5 : 0;
  // Réverbération selon l'endroit (bunker couvert = plus résonant).
  const roofed = MAP.roof[ti(tileOf(P.pos.x), tileOf(P.pos.z))];
  // Sous la montagne (Filon), la caverne résonne partout ; ailleurs, l'écho ne revient que dehors.
  Sfx.setReverb(roofed || MAP_ID === 'filon' ? 0.42 : 0.2, roofed ? 0 : 1);
  // Adaptation de l'œil : plus sombre sous abri.
  const L = R.lights; L.hemi.intensity = damp(L.hemi.intensity, (roofed ? M.env.hemiIn : M.env.hemiOut) + R.flash * (M.env.flashLight ?? 0.6), 2, dt);
  R.scene.environmentIntensity = damp(R.scene.environmentIntensity, roofed ? M.env.envIn : M.env.envOut, 2, dt);
  R.vHemi.intensity = L.hemi.intensity * 1.1;
  // Lumière renvoyée par le sol et les murs à l'intérieur : les plafonds ne sont plus des trous noirs.
  if (M.env.bounce) { R.inK = damp(R.inK || 0, roofed ? 1 : 0, 2, dt); L.hemi.groundColor.lerpColors(R.hemiG ||= new THREE.Color(M.env.hemi[1]), R.bounceC ||= new THREE.Color(M.env.bounce), R.inK); }
  // Ombres de la lune centrées sur le joueur (alignées sur la grille d'ombre pour éviter le scintillement).
  const m = L.moon, snap = 60 / Q.shadowSize || 0.1;
  const cx = Math.round(P.pos.x / snap) * snap, cz = Math.round(P.pos.z / snap) * snap;
  m.target.position.set(cx, 0, cz); m.position.set(cx + MOON_DIR.x * 60, MOON_DIR.y * 60, cz + MOON_DIR.z * 60);
  Sfx.setListener(cam);
}

/* ─── Arme en main ─── */
function setViewmodel(key, up) {
  if (VM.root) R.viewScene.remove(VM.root);
  VM.parts = buildGunModel(key, up, true); VM.key = key; VM.up = up;
  VM.root = new THREE.Group(); VM.root.add(VM.parts.root); R.viewScene.add(VM.root);
  VM.parts.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  const fm = new THREE.MeshBasicMaterial({ map: TEX.sprites.muzzle, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: key === 'cryo' ? 0x9fe8ff : 0xffffff });
  VM.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), fm); VM.flash.visible = false; VM.parts.muzzle.add(VM.flash);
  VM.flashSide = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.14), fm); VM.flashSide.rotation.y = Math.PI / 2; VM.flashSide.position.z = -0.08; VM.flashSide.visible = false; VM.parts.muzzle.add(VM.flashSide);
  if (!VM.knife) { VM.knife = buildKnife(); VM.knife.visible = false; R.viewScene.add(VM.knife); VM.nade = buildGrenadeModel(true); VM.nade.visible = false; R.viewScene.add(VM.nade); }
  $('scope').style.opacity = 0;
  UI.weapon();
}
function updateViewmodel(dt) {
  if (!VM.root) return;
  const S = curS(), p = VM.parts, t = G.time;
  const hv = Math.hypot(P.vel.x, P.vel.z), bobA = P.onGround ? clamp(hv / 4.3, 0, 1.6) : 0;
  const adsK = smooth(P.ads);
  const hip = new THREE.Vector3(0.17, -0.2 - (p.sightY - 0.07) * 0.5, -0.4 + Math.max(0, p.len - 0.5) * 0.25), ads = new THREE.Vector3(0, -p.sightY, -0.26 + Math.max(0, p.len - 0.5) * 0.12);
  const pos = hip.lerp(ads, adsK);
  const idle = Math.sin(t * 1.4) * 0.004 * (1 - adsK);
  pos.x += Math.cos(P.bobT) * 0.012 * bobA * (1 - adsK * 0.8) - P.sway.x * 0.5;
  pos.y += Math.abs(Math.sin(P.bobT)) * -0.014 * bobA * (1 - adsK * 0.8) + idle + P.sway.y * 0.3 - P.land * 0.04;
  pos.z += P.kick * 0.06;
  let rx = P.kick * 0.09 + P.sway.y * 1.2, ry = P.sway.x * 1.5, rz = Math.cos(P.bobT) * 0.02 * bobA;
  // Sprint : arme inclinée vers le bas.
  VM.sprintK = damp(VM.sprintK || 0, P.sprint && !P.reload ? 1 : 0, 9, dt);
  pos.x += VM.sprintK * 0.04; pos.y -= VM.sprintK * 0.05; rx -= VM.sprintK * 0.35; ry += VM.sprintK * 0.7; rz += VM.sprintK * 0.25;
  // Rechargement : on baisse et incline l'arme, le chargeur descend puis remonte.
  if (P.reload) {
    const k = P.reload.shell ? 0.6 : Math.sin(clamp(P.reload.t / P.reload.dur, 0, 1) * Math.PI);
    rx += k * 0.35; rz += k * 0.5; pos.y -= k * 0.05;
    if (p.mag && !P.reload.shell) { const q = P.reload.t / P.reload.dur; const off = q < 0.35 ? smooth(q / 0.35) : q < 0.6 ? 1 : 1 - smooth((q - 0.6) / 0.3); p.mag.position.y = -off * 0.25; p.mag.visible = !(q > 0.33 && q < 0.5); }
    if (p.boltHandle && S.cycle === 'bolt') p.bolt.position.z = Math.sin(clamp(P.reload.t / P.reload.dur, 0, 1) * Math.PI) * 0.06;
  } else if (p.mag) { p.mag.position.y = 0; p.mag.visible = true; }
  // Cycle verrou/pompe après le tir.
  if (P.cycleT > 0) { const q = 1 - P.cycleT / P.cycleDur, k = Math.sin(clamp((q - 0.2) / 0.7, 0, 1) * Math.PI); if (p.bolt && S.cycle === 'bolt') { p.bolt.position.z = k * 0.07; p.bolt.rotation.z = k * 0.6; rz += k * 0.15; } if (p.pump) p.pump.position.z = k * 0.09; }
  else { if (p.pump) p.pump.position.z = 0; if (p.bolt && !P.reload) { p.bolt.position.z = 0; p.bolt.rotation.z = 0; } }
  if (p.cyl) p.cyl.rotation.y += P.kick * dt * 20;
  if (p.pan && P.kick > 0.5) p.pan.rotation.y += dt * 8;
  if (p.glow) p.glow.material.emissiveIntensity = 1.2 + Math.sin(t * 5) * 0.4;
  // Changement d'arme : l'arme sort par le bas.
  if (P.switchT > 0) { const q = P.switchT; pos.y -= Math.sin(clamp(q, 0, 1) * Math.PI / 2) * 0.35; rx -= q * 0.6; }
  // Couteau / grenade : l'arme s'écarte.
  const busy = Math.max(P.knifeT > 0 ? 1 : 0, P.nadeT > 0 ? 1 : 0);
  VM.busyK = damp(VM.busyK || 0, busy, 16, dt); pos.y -= VM.busyK * 0.3; rx -= VM.busyK * 0.5;
  if (P.down) { pos.y -= 0.03; rz += 0.2; }
  VM.root.position.copy(pos); VM.root.rotation.set(rx, ry, rz);
  // Lunette : masque plein écran.
  const scoped = S.scope && P.ads > 0.85 && !P.reload;
  VM.root.visible = !scoped; $('scope').style.opacity = scoped ? 1 : 0;
  // Couteau.
  if (P.knifeT > 0) { const q = 1 - P.knifeT / 0.55, k = Math.sin(clamp(q / 0.6, 0, 1) * Math.PI); VM.knife.visible = true; VM.knife.position.set(lerp(0.3, -0.05, k), -0.18 + k * 0.05, -0.35 - k * 0.12); VM.knife.rotation.set(-0.3 + k * 0.2, 0.6 - k * 1.3, -0.8 + k * 0.6); } else VM.knife.visible = false;
  if (P.nadeT > 0) { const q = 1 - P.nadeT / 0.8, k = q < 0.45 ? q / 0.45 : 1 - (q - 0.45) / 0.55; VM.nade.visible = q < 0.5; VM.nade.position.set(-0.12 - k * 0.05, -0.2 + k * 0.18, -0.35 + k * 0.1); VM.nade.rotation.set(k * 0.6, 0, 0); } else VM.nade.visible = false;
  // Éclair de bouche.
  if (VM.flashT > 0) { VM.flashT -= dt; VM.flash.visible = VM.flashSide.visible = true; VM.flash.rotation.z = rand(TAU); const s = rand(0.8, 1.3); VM.flash.scale.setScalar(s); VM.flashSide.scale.set(s, s, 1); R.vMuzzle.intensity = 6; }
  else { VM.flash.visible = VM.flashSide.visible = false; R.vMuzzle.intensity = 0; }
  R.lights.muzzle.intensity = VM.flashT > 0 ? 45 : 0;
  // Lumière d'ambiance chaude sur les mains près d'un feu.
  const fd = Math.hypot(P.pos.x - 44.2, P.pos.z - 15.2); R.vFill.intensity = clamp(1 - fd / 7, 0, 1) * 2.5 * (0.8 + Math.random() * 0.2);
  R.viewCam.position.set(0, 0, 0);
}

function updateWeapon(dt) {
  const w = curW(); if (!w) return;
  const S = curS();
  P.fireCd -= dt; P.cycleT = Math.max(0, P.cycleT - dt); P.kick = damp(P.kick, 0, 14, dt); P.bloom = damp(P.bloom, 0, 4, dt);
  const wantAds = (INPUT.ads || INPUT.touchAds) && !P.sprint && P.switchT <= 0 && P.knifeT <= 0 && !(P.reload && !S.shell);
  P.ads = damp(P.ads, wantAds ? 1 : 0, 13, dt);
  if (P.switchT > 0) {
    P.switchT -= dt / 0.22;
    if (P.switchTo >= 0 && P.switchT <= 0.5) { P.slot = P.switchTo; P.switchTo = -1; const nw = curW(); setViewmodel(nw.key, nw.up); P.switchT = 0.5; P.switchIn = true; }
    if (P.switchT <= 0) P.switchT = 0;
  }
  if (P.knifeT > 0) { const before = P.knifeT; P.knifeT -= dt; if (before > 0.37 && P.knifeT <= 0.37) knifeHit(); }
  if (P.nadeT > 0) { const before = P.nadeT; P.nadeT -= dt; if (before > 0.45 && P.nadeT <= 0.45) releaseGrenade(); }
  // Rechargement en cours.
  if (P.reload) {
    const r = P.reload; r.t += dt;
    if (r.shell) {
      if (INPUT.firePressed && w.mag > 0) { P.reload = null; }
      else if (r.t >= r.dur) { const n = Math.min(1, w.reserve); w.mag += n; w.reserve -= n; Sfx.reloadSeq('shell', 0); r.t = 0; if (w.mag >= S.mag || w.reserve <= 0) { P.reload = null; Sfx.reloadSeq('pump', 0); } UI.ammo(); }
    } else if (r.t >= r.dur) { const need = S.mag - w.mag, n = Math.min(need, w.reserve); w.mag += n; w.reserve -= n; P.reload = null; UI.ammo(); }
  }
  // Tir.
  const trig = S.auto ? INPUT.fire : INPUT.firePressed;
  if (trig && P.fireCd <= 0 && P.switchT <= 0 && P.knifeT <= 0 && P.nadeT <= 0 && !P.reload && P.cycleT <= 0) {
    if (w.mag > 0) shoot(w, S);
    else if (INPUT.firePressed) { Sfx.dry(); P.fireCd = 0.25; if (w.reserve > 0) tryReload(); }
  }
  INPUT.firePressed = false;
}
function tryReload() {
  const w = curW(); if (!w || P.reload || P.switchT > 0) return;
  const S = curS(); if (w.mag >= S.mag || w.reserve <= 0) return;
  const k = P.perks.has('reload') ? 0.5 : 1;
  if (P.perks.has('cherry')) cherryBurst(1 - w.mag / S.mag);
  P.reload = { t: 0, dur: S.reload * k, shell: !!S.shell };
  if (!S.shell) Sfx.reloadSeq(S.cycle === 'bolt' ? 'bolt' : 'mag', S.reload * k); else Sfx.reloadSeq('pump', 0);
  NET.localAction('reload');
}
// Décharge : plus le chargeur est vide, plus l'onde électrique est large et puissante.
function cherryBurst(empty) {
  if ((P.cherryCd || 0) > G.time || P.down) return;
  P.cherryCd = G.time + 5;
  const rad = 2.4 + empty * 2.4, dmg = 250 + empty * (600 + G.round * 40);
  let n = 0;
  for (const z of ZOMBIES) {
    if (!z.alive) continue; const dx = z.pos.x - P.pos.x, dz = z.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d > rad || Math.abs(z.pos.y - P.pos.y) > 2.2) continue;
    const kill = G.hitZombie(z, dmg * (1 - 0.4 * d / rad), P.id, { dir: new THREE.Vector3(dx, 0, dz).normalize(), shock: true }); if (kill) n++;
    z.stun = Math.max(z.stun || 0, 1.2);
  }
  fxShockRing(P.pos, rad); Sfx.zap?.(P.pos);
  if (n) { UI.hitmarker(true); Sfx.hitTick(true); }
}
function switchWeapon(slot) {
  if (slot === P.slot || !P.weapons[slot] || P.switchT > 0 || P.down && P.weapons[slot].key !== 'pistol' && !P.weapons[slot].pistolLike) return;
  P.reload = null; P.switchTo = slot; P.switchT = 1; Sfx.click(1200, 0.2);
}
function cycleWeapon(dir = 1) { const n = P.weapons.length; if (n > 1) switchWeapon(((P.slot + dir) % n + n) % n); }
function toggleTorch() { P.torch = !P.torch; Sfx.click(2800, 0.25); }

const _dir = new THREE.Vector3(), _org = new THREE.Vector3(), _right = new THREE.Vector3(), _up = new THREE.Vector3();
function shoot(w, S) {
  const rof = P.perks.has('rof') ? 1.33 : 1;
  P.fireCd = 60 / S.rpm / rof;
  if (S.cycle) { P.cycleDur = P.cycleT = P.fireCd * 0.9; }
  w.mag--; P.stats.shots++; P.shotsFired++;
  if (P.sprint) P.sprint = false;
  const cam = R.camera; cam.updateMatrixWorld();
  _org.copy(cam.position); cam.getWorldDirection(_dir); _right.setFromMatrixColumn(cam.matrixWorld, 0); _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const moving = Math.hypot(P.vel.x, P.vel.z) > 1 ? 1.6 : 1;
  const spread = lerp(S.spread, S.ads, P.ads) * (1 + P.bloom) * moving * (P.onGround ? 1 : 2.2) * lerp(1, 0.75, P.crouch) * (P.perks.has('deadshot') ? 0.65 : 1);
  // Vecteur propre : _v3 sert aussi aux impacts (traceShot), qui le réécrivaient (fumée et traçante partaient alors de l'infecté touché).
  const muzzleW = (_muzzleW ||= new THREE.Vector3()).copy(_org).addScaledVector(_dir, 0.6).addScaledVector(_right, 0.12 * (1 - P.ads)).addScaledVector(_up, -0.1);
  R.lights.muzzle.position.copy(muzzleW);
  if (S.freeze) { cryoBlast(S, _org, _dir); }
  else if (S.projectile) { launchProjectile(muzzleW.clone(), _dir.clone().multiplyScalar(36).add(_v2.set(0, 1.2, 0)), S, P.id, w.up); }
  else if (S.ray) {
    const r = _dir.clone(); if (spread > 0) { const a = rand(TAU), q = Math.sqrt(Math.random()) * spread; r.addScaledVector(_right, Math.cos(a) * q).addScaledVector(_up, Math.sin(a) * q).normalize(); }
    const res = raygunShot(S, w.up, _org, r, muzzleW.clone());
    if (res.hit) { UI.hitmarker(res.kill); Sfx.hitTick(res.kill); }
  }
  else {
    const n = S.pellets || 1; let anyHit = false, kill = false;
    for (let k = 0; k < n; k++) {
      const a = rand(TAU), r = Math.sqrt(Math.random()) * spread;
      const d = _v1.copy(_dir).addScaledVector(_right, Math.cos(a) * r).addScaledVector(_up, Math.sin(a) * r).normalize();
      const res = traceShot(_org, d, S, w.up);
      anyHit = anyHit || res.hit; kill = kill || res.kill;
      if (k === 0 && (S.auto ? P.shotsFired % 3 === 0 : S.pellets ? false : true) && res.end) fireTracer(muzzleW, res.end);
    }
    if (anyHit) { UI.hitmarker(kill); Sfx.hitTick(kill); }
  }
  // Recul, éclair, douille, son.
  const rk = S.recoil * lerp(1, 0.6, P.ads) * lerp(1, 0.8, P.crouch);
  P.rec.p += rk * rand(0.8, 1.2); P.rec.y += rk * rand(-0.5, 0.5); P.pitch += rk * 0.22; P.kick = 1; P.bloom = Math.min(2.5, P.bloom + (S.auto ? 0.22 : 0.5));
  VM.flashT = S.freeze ? 0.08 : 0.045;
  if (!S.freeze && !S.projectile && !S.ray) spawnCasing(_v2.copy(_org).addScaledVector(_right, 0.18).addScaledVector(_up, -0.12).addScaledVector(_dir, 0.35), _dir, _right, !!S.pellets);
  fxMuzzleSmoke(muzzleW, _dir, !!(S.pellets || S.cycle));
  Sfx.gun(S.snd, null, true);
  if (S.cycle) setTimeout(() => Sfx.reloadSeq(S.cycle === 'bolt' ? 'bolt' : 'pump', P.cycleDur), 120);
  P.shotN = (P.shotN || 0) + 1; P.shotSnd = S.snd;
  UI.ammo();
  if (w.mag === 0 && w.reserve > 0) setTimeout(() => { if (curW() === w && w.mag === 0) tryReload(); }, 220);
}
let _muzzleW = null;
// Tir à balle : mur, infectés traversés (pénétration), dégâts décroissants.
function traceShot(o, d, S, up) {
  const range = S.range ? S.range * 3 : 110;
  const wall = rayWorld(o, d, range), wallDist = wall ? wall.dist : range;
  const wallPoint = wall ? wall.point.clone() : null, wallN = wall ? wall.normal.clone() : null, wallMat = wall ? wall.mat : null, wallTag = wall && wall.prop ? wall.prop.tag : null;
  const hits = rayZombies(o, d, wallDist);
  let pen = S.pen || 1, hit = false, kill = false, end = wallPoint || _v2.copy(o).addScaledVector(d, range).clone();
  for (const h of hits) {
    if (pen <= 0) break;
    let dmg = S.dmg * (S.range ? clamp(1.25 - h.dist / S.range, 0.25, 1) : 1);
    const head = h.part === 'head';
    if (head) dmg *= (S.head || 2) * (P.perks.has('deadshot') ? 1.3 : 1); else if (h.part === 'limb') dmg *= 0.75;
    const point = _v3.copy(o).addScaledVector(d, h.dist);
    fxBlood(point, d, S.pellets ? 0.5 : 1);
    // Éclaboussure sur le mur juste derrière l'infecté (coulures vers le bas sur un mur, flaque sur un sol).
    const gap = wall ? wallDist - h.dist : 99;
    if (gap < 3.5 && Math.random() < (S.pellets ? 0.35 : 1) * (0.15 + 0.7 * (1 - gap / 3.5))) {
      const k = 1 - gap / 3.5, up = Math.abs(wallN.y) > 0.6;
      addDecal(up ? 'blood' : 'spatter', wallPoint.clone().add(new THREE.Vector3(rand(-0.12, 0.12), rand(-0.1, 0.1), rand(-0.12, 0.12))), wallN, (up ? 0.5 : 0.42) * (0.6 + 0.8 * k) * (head ? 1.25 : 1), 120, up ? rand(TAU) : rand(-0.2, 0.2));
    }
    Sfx.flesh(point, head);
    h.z.flinch(d, h.part);
    kill = G.hitZombie(h.z, dmg, P.id, { head, part: h.part, dir: d.clone(), weapon: VM.key, point: point.clone() }) || kill;
    hit = true; P.stats.hits++; pen--; dmg *= 0.7;
    if (pen <= 0) { end = point.clone(); break; }
  }
  if (pen > 0 && wall) { fxImpact(wallPoint, wallN, wallMat); if (wallTag) G.interact(P.id, 'shot', wallTag); } // objet marqué touché (propre à la carte)
  return { hit, kill, end };
}
// Rayonneur : un trait d'énergie qui touche le premier infecté puis éclabousse autour de l'impact.
function raygunShot(S, up, o, d, muzzle) {
  const range = 90, wall = rayWorld(o, d, range), wallDist = wall ? wall.dist : range;
  const h = rayZombies(o, d, wallDist)[0];
  const end = h ? o.clone().addScaledVector(d, h.dist) : wall ? wall.point.clone().addScaledVector(wall.normal, 0.05) : o.clone().addScaledVector(d, range);
  let hit = false, kill = false;
  if (h) {
    const head = h.part === 'head', dmg = S.dmg * (head ? (S.head || 1.4) * (P.perks.has('deadshot') ? 1.3 : 1) : 1);
    fxBlood(end, d, 0.6); h.z.flinch(d, h.part);
    kill = G.hitZombie(h.z, dmg, P.id, { head, part: h.part, explosive: true, dir: d.clone(), weapon: 'raygun', point: end.clone() });
    hit = true; P.stats.hits++;
  }
  const sp = S.splash || 2;
  for (const z of ZOMBIES) {
    if (!z.alive || (h && z === h.z)) continue;
    const dd = Math.hypot(z.pos.x - end.x, z.pos.z - end.z); if (dd > sp || Math.abs(z.pos.y + 0.9 - end.y) > 2) continue;
    const k = 1 - dd / sp; kill = G.hitZombie(z, S.dmg * (0.3 + 0.5 * k), P.id, { explosive: true, dir: new THREE.Vector3(z.pos.x - end.x, 0, z.pos.z - end.z).normalize(), crawl: k > 0.5 && Math.random() < 0.3 }) || kill; hit = true;
  }
  if (wall && !h && wall.prop && wall.prop.tag) G.interact(P.id, 'shot', wall.prop.tag);
  fxRay(muzzle, end, up); Sfx.impact?.(end, 'metal');
  // Tirer à bout portant brûle un peu (comme l'original).
  const pd = Math.hypot(P.pos.x - end.x, P.pos.z - end.z); if (pd < 1.7 && Math.abs(P.pos.y + 0.9 - end.y) < 1.8 && !P.down) localHurt(Math.round(22 * (1 - pd / 1.7)), end, true);
  return { hit, kill };
}
function cryoBlast(S, o, d) {
  const cone = S.cone || 13; let n = 0;
  for (const z of ZOMBIES) {
    if (!z.alive || z.state === 'frozen') continue;
    const hp = z.headPos(_v1); hp.y -= 0.5; const to = _v2.subVectors(hp, o), dist = to.length();
    if (dist > cone) continue; to.divideScalar(dist);
    if (to.dot(d) < Math.cos(0.32) || !lineClear(o, hp)) continue;
    G.hitZombie(z, S.dmg, P.id, { freeze: true, dir: d.clone() }); n++;
  }
  for (let i = 0; i < 40; i++) { const s = rand(4, 16); FX.glow.spawn(o.x + d.x * 0.8, o.y + d.y * 0.8 - 0.1, o.z + d.z * 0.8, d.x * s + rand(-1.5, 1.5), d.y * s + rand(-1, 1), d.z * s + rand(-1.5, 1.5), rand(0.3, 0.8), rand(0.05, 0.16), 0.6, 0.88, 1, 1, 0, 2, 0.4); }
  for (let i = 0; i < 12; i++) { const s = rand(2, 7); FX.soft.spawn(o.x + d.x, o.y + d.y - 0.1, o.z + d.z, d.x * s, d.y * s, d.z * s, rand(0.8, 1.4), rand(0.2, 0.4), 0.85, 0.93, 1, 0.5, 0, 2, 1.2); }
  if (n) { UI.hitmarker(true); Sfx.hitTick(true); }
}

/* ─── Couteau et grenades ─── */
function knife() {
  if (P.knifeT > 0 || P.nadeT > 0 || P.switchT > 0 || G.mode !== 'playing') return;
  P.knifeT = 0.55; P.reload = null; Sfx.whoosh(null, 0.5);
  // Fente vers l'avant si un infecté est proche.
  const fwd = _v1.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
  for (const z of ZOMBIES) { if (!z.alive) continue; const dx = z.pos.x - P.pos.x, dz = z.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d < 3 && d > 0.8 && (dx * fwd.x + dz * fwd.z) / d > 0.8) { P.vel.x += fwd.x * 6; P.vel.z += fwd.z * 6; break; } }
}
function knifeHit() {
  const fwd = _v1.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
  let best = null, bd = 1.9;
  for (const z of ZOMBIES) { if (!z.alive || z.state === 'rise') continue; const dx = z.pos.x - P.pos.x, dz = z.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d < bd && d > 0.01 && (dx * fwd.x + dz * fwd.z) / d > 0.45 && Math.abs(z.pos.y - P.pos.y) < 1.4) { bd = d; best = z; } }
  if (!best) return;
  const p = best.headPos(_v2).clone(); p.y -= 0.45;
  fxBlood(p, fwd, 1.2); Sfx.flesh(p, false);
  const kill = G.hitZombie(best, 160, P.id, { melee: true, dir: fwd.clone() });
  UI.hitmarker(kill); Sfx.hitTick(kill);
}
function throwGrenade() { if (P.grenades <= 0 || P.nadeT > 0 || P.knifeT > 0 || P.down || G.mode !== 'playing') return; P.nadeT = 0.8; P.grenades--; P.reload = null; Sfx.click(3000, 0.3); UI.grenades(); }
function releaseGrenade() {
  const cam = R.camera; cam.getWorldDirection(_dir);
  const o = cam.position.clone().addScaledVector(_dir, 0.4); o.y -= 0.1;
  const v = _dir.clone().multiplyScalar(15).add(_v2.set(0, 3.2, 0)).add(_v1.set(P.vel.x * 0.5, 0, P.vel.z * 0.5));
  spawnGrenade(o, v, P.id); NET.localGrenade(o, v); Sfx.whoosh(null, 0.4);
}

/* ─── Projectiles (grenades à main et lance-grenades) ─── */
const PROJ = [];
let nadeGeo = null;
function spawnGrenade(o, v, owner, fuse = 2.4) {
  if (!nadeGeo) nadeGeo = buildGrenadeModel(false);
  const m = nadeGeo.clone(); m.scale.setScalar(1.3); R.scene.add(m);
  PROJ.push({ m, p: o.clone(), v: v.clone(), fuse, owner, bounce: true, dmg: 650, radius: 5.5, spin: rand(-12, 12) });
}
function launchProjectile(o, v, S, owner, up) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8), MATS.olive); m.rotation.x = Math.PI / 2; R.scene.add(m);
  PROJ.push({ m, p: o.clone(), v: v.clone(), fuse: 6, owner, bounce: false, dmg: S.dmg, radius: S.splash, impact: true, trail: true });
}
function updateProjectiles(dt) {
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const q = PROJ[i]; q.fuse -= dt;
    q.v.y -= (q.impact ? 4 : 11) * dt;
    const L = q.v.length() * dt, dir = _v1.copy(q.v).normalize();
    const hit = rayWorld(q.p, dir, L + 0.05);
    let zHit = null; if (q.impact) { for (const z of ZOMBIES) if (z.alive) z.updateHitboxes?.(); const zh = rayZombies(q.p, dir, L + 0.1); if (zh.length) zHit = zh[0]; }
    if (zHit || (hit && q.impact)) { if (zHit) q.p.addScaledVector(dir, zHit.dist); else q.p.copy(hit.point); q.fuse = 0; }
    else if (hit) {
      q.p.copy(hit.point).addScaledVector(hit.normal, 0.03);
      const vn = q.v.dot(hit.normal); q.v.addScaledVector(hit.normal, -1.45 * vn); q.v.multiplyScalar(0.55);
      if (Math.abs(vn) > 2) Sfx.click(1800 + rand(800), 0.25, 0, q.p);
    } else q.p.addScaledVector(q.v, dt);
    q.m.position.copy(q.p); q.m.rotation.x += (q.spin || 0) * dt;
    if (q.trail && Math.random() < 0.8) FX.soft.spawn(q.p.x, q.p.y, q.p.z, 0, 0.2, 0, 0.8, 0.12, 0.7, 0.7, 0.72, 0.4, 0, 1, 0.3);
    if (q.fuse <= 0) { explode(q.p, q.dmg, q.radius, q.owner); R.scene.remove(q.m); PROJ.splice(i, 1); }
  }
}
function explode(p, dmg, radius, owner) {
  fxExplosion(p, radius);
  if (owner === P.id || (G.authority && !G.players.get(owner)?.isLocal && false)) {
    for (const z of ZOMBIES) {
      if (!z.alive) continue; const d = z.pos.distanceTo(p); if (d > radius) continue;
      const k = 1 - d / radius; const kill = G.hitZombie(z, dmg * (0.35 + 0.65 * k), owner, { explosive: true, dir: _v2.subVectors(z.pos, p).normalize().clone(), crawl: k > 0.35 && Math.random() < 0.4 });
      if (kill) UI.hitmarker(true);
    }
  }
  // Dégâts à soi-même (limités).
  const pd = P.pos.distanceTo(p);
  if (pd < 3.2 && !P.down && owner === P.id) localHurt(Math.round(55 * (1 - pd / 3.2)), p, true);
}

/* ─── Blessures, à terre, réanimation ─── */
function localHurt(amount, from, self) {
  if (P.down || P.dead || G.mode !== 'playing') return;
  // Bouclier de fortune : il encaisse l'essentiel des coups jusqu'à se briser.
  if (P.shield > 0 && !self) { const a = Math.min(P.shield, amount * 0.75); P.shield -= a; amount -= a; Sfx.impact?.(P.pos, 'metal'); if (P.shield <= 0) { P.shield = 0; UI.message('BOUCLIER BRISÉ', ''); NET.localAction?.('inv'); } }
  P.hp -= amount; P.regenT = P.perks.has('armor') ? 3 : 4; P.hurtT = 1;
  Sfx.hurt(P.hp < P.maxHp * 0.4);
  if (from) { const a = Math.atan2(from.x - P.pos.x, from.z - P.pos.z); UI.damageDir(angDiff(P.yaw + Math.PI, a)); }
  FX.shake = Math.max(FX.shake, self ? 0.9 : 0.45);
  if (P.hp <= 0) goDown();
}
function goDown() {
  P.hp = 0; P.down = true; P.bleed = 30; P.stats.downs++; P.reload = null; P.ads = 0;
  // En solo avec Second Souffle : on se relève seul.
  if (G.solo && P.perks.has('revive')) { P.selfRevive = 4; }
  // À terre : pistolet uniquement (on se souvient de l'arme en main pour la reprendre en se relevant).
  P.preDownSlot = P.slot;
  const pi = P.weapons.findIndex((w) => w.key === 'pistol' || w.key === 'revolver');
  if (pi >= 0 && pi !== P.slot) { P.slot = pi; const w = curW(); setViewmodel(w.key, w.up); }
  if (pi < 0) { P.lastStand = { key: 'pistol', up: false, mag: 12, reserve: 24 }; P.weapons.push(P.lastStand); P.slot = P.weapons.length - 1; setViewmodel('pistol', false); }
  G.localDown();
}
function updateDowned(dt) {
  if (P.selfRevive > 0) { P.selfRevive -= dt; UI.progress(1 - P.selfRevive / 4); if (P.selfRevive <= 0) { UI.progress(-1); G.localRevived(true); } return; }
  if (G.solo) return;
  P.bleed -= dt * (P.reviving ? 0 : 1);
  $('downedSub').textContent = P.reviving ? 'Un camarade vous relève…' : `Un camarade peut vous relever · ${Math.ceil(Math.max(0, P.bleed))} s`;
  if (P.bleed <= 0) G.localBledOut();
}
function standUp() {
  P.down = false; P.hp = P.maxHp * 0.5; P.regenT = 1; P.selfRevive = 0; P.reviving = false;
  if (P.lastStand) { const i = P.weapons.indexOf(P.lastStand); if (i >= 0) P.weapons.splice(i, 1); P.lastStand = null; }
  const back = clamp(P.preDownSlot ?? 0, 0, Math.max(0, P.weapons.length - 1));
  if (P.weapons.length && (back !== P.slot || !P.weapons[P.slot])) { P.slot = back; const w = curW(); setViewmodel(w.key, w.up); }
  UI.ammo();
}
