/* ═══════════════════ ARMES : caractéristiques et modèles 3D ═══════════════════ */

const WEAPONS = {
  pistol: { name: 'PISTOLET', dmg: 42, head: 3, rpm: 400, mag: 12, reserve: 60, reload: 1.45, spread: 0.02, ads: 0.005, zoom: 1.12, recoil: 0.02, snd: 'pistol', pen: 1, move: 1, weight: 0,
    up: { name: 'PISTOLET « BLIZZARD »', dmg: 150, mag: 18, reserve: 126 } },
  bolt: { name: 'FUSIL À VERROU', dmg: 230, head: 3.5, rpm: 52, mag: 5, reserve: 50, reload: 2.6, cycle: 'bolt', spread: 0.035, ads: 0, zoom: 1.45, recoil: 0.055, snd: 'rifle', pen: 3, cost: 500, move: 0.96, weight: 1.2,
    up: { name: 'VERROU « AVALANCHE »', dmg: 650, mag: 8, reserve: 80 } },
  shotgun: { name: 'FUSIL À POMPE', dmg: 50, pellets: 8, head: 1.5, rpm: 72, mag: 6, reserve: 48, reload: 0.48, shell: true, cycle: 'pump', spread: 0.075, ads: 0.058, zoom: 1.08, recoil: 0.075, snd: 'shotgun', pen: 1, range: 24, cost: 1000, move: 0.96, weight: 1.4,
    up: { name: 'POMPE « CONGÈRE »', dmg: 105, pellets: 10, mag: 8, reserve: 64 } },
  smg: { name: 'MITRAILLETTE', dmg: 46, head: 2.5, rpm: 720, mag: 32, reserve: 192, reload: 2.1, auto: true, spread: 0.034, ads: 0.013, zoom: 1.18, recoil: 0.011, snd: 'smg', pen: 1, cost: 1200, move: 1.03, weight: 1.5,
    up: { name: 'MITRAILLETTE « GRÉSIL »', dmg: 98, mag: 48, reserve: 288 } },
  carbine: { name: 'CARABINE', dmg: 98, head: 3, rpm: 330, mag: 15, reserve: 120, reload: 2.0, spread: 0.024, ads: 0.003, zoom: 1.32, recoil: 0.025, snd: 'carbine', pen: 2, cost: 900, move: 1, weight: 1.3,
    up: { name: 'CARABINE « VERGLAS »', dmg: 210, mag: 20, reserve: 200 } },
  ar: { name: "FUSIL D'ASSAUT", dmg: 78, head: 2.8, rpm: 600, mag: 30, reserve: 210, reload: 2.3, auto: true, spread: 0.027, ads: 0.006, zoom: 1.3, recoil: 0.016, snd: 'ar', pen: 2, box: true, move: 0.98, weight: 2,
    up: { name: 'ASSAUT « TOUNDRA »', dmg: 160, mag: 40, reserve: 320 } },
  lmg: { name: 'FUSIL-MITRAILLEUR', dmg: 92, head: 2.5, rpm: 520, mag: 75, reserve: 300, reload: 4.2, auto: true, spread: 0.036, ads: 0.012, zoom: 1.22, recoil: 0.017, snd: 'lmg', pen: 2, box: true, move: 0.88, weight: 1.6,
    up: { name: 'MITRAILLEUR « BORÉAL »', dmg: 175, mag: 100, reserve: 450 } },
  revolver: { name: 'REVOLVER LOURD', dmg: 210, head: 3, rpm: 170, mag: 6, reserve: 48, reload: 2.8, spread: 0.02, ads: 0.004, zoom: 1.18, recoil: 0.065, snd: 'revolver', pen: 2, box: true, cost: 1100, move: 1.02, weight: 1.4,
    up: { name: 'REVOLVER « GIVRE NOIR »', dmg: 620, mag: 8, reserve: 72 } },
  sniper: { name: 'FUSIL DE PRÉCISION', dmg: 680, head: 4, rpm: 46, mag: 5, reserve: 40, reload: 3.0, cycle: 'bolt', spread: 0.06, ads: 0, zoom: 4, scope: true, recoil: 0.075, snd: 'sniper', pen: 5, box: true, move: 0.92, weight: 1.2,
    up: { name: 'PRÉCISION « POLAIRE »', dmg: 2100, mag: 8, reserve: 64 } },
  launcher: { name: 'LANCE-GRENADES', dmg: 750, splash: 5, rpm: 60, mag: 1, reserve: 20, reload: 2.2, projectile: true, spread: 0.01, ads: 0.004, zoom: 1.12, recoil: 0.085, snd: 'launcher', box: true, move: 0.95, weight: 1.1,
    up: { name: 'LANCE-GRENADES « FRIMAS »', dmg: 1500, mag: 3, reserve: 30 } },
  raygun: { name: 'RAYONNEUR', ray: true, dmg: 1150, splash: 2.4, head: 1.4, rpm: 180, mag: 20, reserve: 160, reload: 2.4, spread: 0.008, ads: 0.003, zoom: 1.15, recoil: 0.03, snd: 'ray', pen: 1, box: true, move: 1.04, weight: 0.55,
    up: { name: 'RAYONNEUR « AURORE BORÉALE »', dmg: 2100, mag: 40, reserve: 200, splash: 3.0 } },
  cryo: { name: 'PROTOTYPE CRYO « GIVRE-7 »', freeze: true, dmg: 900, rpm: 75, mag: 4, reserve: 24, reload: 3.0, spread: 0, ads: 0, zoom: 1.1, recoil: 0.05, snd: 'cryo', box: true, move: 1, cone: 13, weight: 0.45,
    up: { name: 'GIVRE-7 « ZÉRO ABSOLU »', mag: 8, reserve: 48, cone: 16 } },
};
const WALL_WEAPONS = ['bolt', 'shotgun', 'smg', 'carbine'];
function wstat(key, upgraded) { const w = WEAPONS[key]; return upgraded ? Object.assign({}, w, w.up) : w; }
function ammoCost(key, upgraded) { return upgraded ? 4500 : Math.round((WEAPONS[key].cost || 0) / 2); }

// Longueur des armes murales (m), comme avant (leur taille sur le mur ne change pas).
const WALL_LEN = { bolt: 1.04, shotgun: 1.04, smg: 0.83, carbine: 0.99, raygun: 0.62, revolver: 0.57 };

/* ─── Matériaux d'armes : voir gunMaterials() (08b_gunmodels.js) ─── */
const GM = {};

// Construit une arme orientée vers -Z, origine à la poignée.
function buildGunModel(key, upgraded = false, withHands = false) {
  if (GUN_MODELS[key]) return buildDetailedGun(key, upgraded, withHands); // modèles détaillés (08b_gunmodels.js)
  const g = new THREE.Group(), parts = { root: g };
  const S = upgraded ? GM.frost : GM.steel, W = upgraded ? GM.frostWood : GM.wood, D = GM.dark;
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m; };
  const cyl = (r, l, mat, x, y, z, parent) => add(new THREE.CylinderGeometry(r, r, l, 12), mat, x, y, z, Math.PI / 2, 0, 0, parent);
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const mag = new THREE.Group(); g.add(mag); parts.mag = mag;
  const bolt = new THREE.Group(); g.add(bolt); parts.bolt = bolt;
  let muzzleZ = -0.3, sightY = 0.06, grip = [0, 0, 0], fore = [0, 0, -0.2], ejectZ = -0.05;
  switch (key) {
    case 'pistol':
      add(B(0.034, 0.042, 0.19), S, 0, 0.055, -0.06); add(B(0.03, 0.03, 0.15), D, 0, 0.02, -0.05);
      add(B(0.03, 0.1, 0.045), D, 0, -0.03, 0.02, -0.25); cyl(0.009, 0.03, S, 0, 0.055, -0.165);
      add(B(0.006, 0.012, 0.01), S, 0, 0.082, -0.14); add(B(0.02, 0.01, 0.01), S, 0, 0.082, 0.02);
      add(B(0.028, 0.07, 0.03), D, 0, -0.04, 0.02, -0.25, 0, 0, mag);
      muzzleZ = -0.18; sightY = 0.088; grip = [0, -0.02, 0.02]; fore = [0.0, -0.03, -0.02]; ejectZ = -0.04;
      parts.slide = g.children[0];
      break;
    case 'revolver':
      add(B(0.034, 0.05, 0.1), S, 0, 0.04, -0.02); cyl(0.012, 0.22, S, 0, 0.055, -0.17);
      parts.cyl = cyl(0.026, 0.05, S, 0, 0.035, -0.035); add(B(0.03, 0.1, 0.045), W, 0, -0.03, 0.04, -0.35);
      add(B(0.006, 0.014, 0.01), S, 0, 0.074, -0.27);
      muzzleZ = -0.29; sightY = 0.08; grip = [0, -0.02, 0.04]; fore = [0, -0.03, 0.0];
      break;
    case 'bolt': case 'sniper':
      add(B(0.05, 0.06, 0.34), W, 0, -0.01, 0.2); add(B(0.045, 0.1, 0.12), W, 0, -0.045, 0.34, 0.2);
      add(B(0.04, 0.045, 0.5), W, 0, 0.005, -0.3); add(B(0.036, 0.04, 0.2), S, 0, 0.035, -0.02);
      cyl(0.011, 0.72, S, 0, 0.04, -0.45); add(B(0.006, 0.018, 0.012), S, 0, 0.06, -0.78);
      add(B(0.022, 0.03, 0.05), D, 0, -0.01, -0.02);
      { const h = add(B(0.012, 0.012, 0.06), S, 0.035, 0.045, 0.06, 0, 0, -0.4, bolt); add(new THREE.SphereGeometry(0.014, 8, 6), S, 0.06, 0.03, 0.06, 0, 0, 0, bolt); parts.boltHandle = h; }
      if (key === 'sniper') { cyl(0.018, 0.3, D, 0, 0.1, -0.05); add(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 14), D, 0, 0.1, -0.21, Math.PI / 2); add(new THREE.CylinderGeometry(0.02, 0.02, 0.005, 14), GM.lens, 0, 0.1, 0.1, Math.PI / 2); add(B(0.01, 0.06, 0.02), D, 0, 0.065, -0.1); add(B(0.01, 0.06, 0.02), D, 0, 0.065, 0.02); sightY = 0.1; }
      else sightY = 0.068;
      muzzleZ = -0.82; grip = [0, -0.02, 0.1]; fore = [0, -0.02, -0.3]; ejectZ = 0.02;
      break;
    case 'shotgun':
      add(B(0.05, 0.06, 0.32), W, 0, -0.01, 0.22); add(B(0.045, 0.1, 0.12), W, 0, -0.045, 0.36, 0.2);
      add(B(0.044, 0.06, 0.2), S, 0, 0.02, -0.02); cyl(0.015, 0.62, S, 0, 0.045, -0.42); cyl(0.012, 0.5, D, 0, 0.012, -0.36);
      { const pump = new THREE.Group(); g.add(pump); add(B(0.05, 0.045, 0.16), W, 0, 0.012, -0.3, 0, 0, 0, pump); parts.pump = pump; }
      add(new THREE.SphereGeometry(0.006, 6, 6), GM.brass, 0, 0.066, -0.72);
      muzzleZ = -0.74; sightY = 0.07; grip = [0, -0.02, 0.1]; fore = [0, -0.01, -0.3]; ejectZ = -0.02;
      break;
    case 'smg':
      cyl(0.024, 0.3, S, 0, 0.03, -0.1); cyl(0.028, 0.18, D, 0, 0.03, -0.32); cyl(0.009, 0.08, S, 0, 0.03, -0.44);
      add(B(0.04, 0.05, 0.22), W, 0, -0.01, 0.16); add(B(0.04, 0.08, 0.1), W, 0, -0.035, 0.28, 0.2);
      add(B(0.03, 0.08, 0.04), W, 0, -0.04, 0.02, -0.2);
      add(B(0.026, 0.2, 0.034), D, 0, -0.09, -0.13, 0.05, 0, 0, mag);
      add(B(0.006, 0.02, 0.01), S, 0, 0.062, -0.38); add(B(0.02, 0.018, 0.01), S, 0, 0.062, 0.02);
      muzzleZ = -0.49; sightY = 0.071; grip = [0, -0.03, 0.03]; fore = [0, -0.08, -0.13]; ejectZ = -0.1;
      break;
    case 'carbine':
      add(B(0.045, 0.055, 0.3), W, 0, -0.01, 0.2); add(B(0.042, 0.09, 0.1), W, 0, -0.04, 0.33, 0.2);
      add(B(0.04, 0.045, 0.38), W, 0, 0.005, -0.22); add(B(0.036, 0.04, 0.18), S, 0, 0.035, -0.01);
      cyl(0.01, 0.52, S, 0, 0.04, -0.34); add(B(0.024, 0.07, 0.05), D, 0, -0.04, -0.04, 0, 0, 0, mag);
      add(B(0.006, 0.016, 0.01), S, 0, 0.06, -0.58); add(B(0.02, 0.014, 0.01), S, 0, 0.066, 0.05);
      muzzleZ = -0.61; sightY = 0.073; grip = [0, -0.02, 0.1]; fore = [0, -0.02, -0.24];
      break;
    case 'ar':
      add(B(0.045, 0.06, 0.3), S, 0, 0.02, -0.05); add(B(0.04, 0.05, 0.26), W, 0, 0.01, -0.33);
      cyl(0.011, 0.3, S, 0, 0.035, -0.55); add(B(0.04, 0.06, 0.26), W, 0, 0.0, 0.22); add(B(0.04, 0.09, 0.1), W, 0, -0.035, 0.34, 0.15);
      add(B(0.03, 0.09, 0.04), D, 0, -0.05, 0.06, -0.25);
      for (let k = 0; k < 3; k++) add(B(0.026, 0.07, 0.04), D, 0, -0.05 - k * 0.055, -0.1 - k * 0.018, 0.25 + k * 0.1, 0, 0, mag);
      add(B(0.008, 0.03, 0.01), S, 0, 0.07, -0.64); add(B(0.02, 0.025, 0.02), S, 0, 0.06, 0.05);
      muzzleZ = -0.7; sightY = 0.08; grip = [0, -0.03, 0.06]; fore = [0, -0.02, -0.3];
      break;
    case 'lmg':
      add(B(0.055, 0.075, 0.36), S, 0, 0.02, -0.05); cyl(0.015, 0.6, S, 0, 0.03, -0.5);
      for (let k = 0; k < 7; k++) cyl(0.024, 0.012, D, 0, 0.03, -0.3 - k * 0.045);
      add(B(0.045, 0.07, 0.28), W, 0, 0.0, 0.26); add(B(0.03, 0.09, 0.04), D, 0, -0.05, 0.08, -0.25);
      { const pan = add(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 22), D, 0, 0.09, -0.04, 0, 0, 0, mag); parts.pan = pan; }
      add(B(0.008, 0.035, 0.01), S, 0, 0.068, -0.76); add(B(0.02, 0.03, 0.01), S, -0.03, 0.08, 0.1);
      muzzleZ = -0.82; sightY = 0.083; grip = [0, -0.03, 0.08]; fore = [0, -0.02, -0.28];
      break;
    case 'launcher':
      cyl(0.036, 0.42, S, 0, 0.04, -0.2); cyl(0.03, 0.02, D, 0, 0.04, -0.42);
      add(B(0.05, 0.06, 0.3), W, 0, -0.01, 0.16); add(B(0.045, 0.09, 0.1), W, 0, -0.04, 0.3, 0.2);
      add(B(0.03, 0.08, 0.04), D, 0, -0.04, 0.02, -0.2); add(B(0.03, 0.05, 0.004), S, 0, 0.1, -0.05);
      muzzleZ = -0.43; sightY = 0.1; grip = [0, -0.03, 0.03]; fore = [0, -0.0, -0.22];
      break;
    case 'raygun': {
      const red = upgraded ? GM.frost : new THREE.MeshStandardMaterial({ color: 0xb82a22, roughness: 0.35, metalness: 0.6 }), ring = new THREE.MeshStandardMaterial({ color: 0x40ff80, emissive: 0x30ff70, emissiveIntensity: 1.6, roughness: 0.3 });
      add(new THREE.CylinderGeometry(0.05, 0.035, 0.2, 14), red, 0, 0.045, -0.06, Math.PI / 2); add(new THREE.SphereGeometry(0.05, 14, 10), red, 0, 0.045, 0.04);
      for (let k = 0; k < 3; k++) add(new THREE.TorusGeometry(0.045 - k * 0.004, 0.009, 8, 18), ring, 0, 0.045, -0.02 - k * 0.05);
      add(new THREE.CylinderGeometry(0.012, 0.02, 0.1, 10), GM.steel, 0, 0.045, -0.2, Math.PI / 2); add(new THREE.CylinderGeometry(0.03, 0.03, 0.018, 16), GM.dark, 0, 0.045, -0.255, Math.PI / 2);
      add(B(0.03, 0.1, 0.045), GM.dark, 0, -0.03, 0.05, -0.3); add(B(0.008, 0.03, 0.08), red, 0, 0.1, 0.0);
      parts.glow = g.children[g.children.length - 5];
      muzzleZ = -0.27; sightY = 0.11; grip = [0, -0.02, 0.05]; fore = [0, -0.03, -0.02];
      break;
    }
    case 'cryo':
      add(B(0.07, 0.08, 0.34), upgraded ? GM.frost : GM.brass, 0, 0.02, -0.08); cyl(0.022, 0.3, S, 0, 0.03, -0.38);
      for (let k = 0; k < 5; k++) add(new THREE.TorusGeometry(0.03, 0.006, 6, 16), GM.brass, 0, 0.03, -0.28 - k * 0.05);
      { const tank = cyl(0.03, 0.18, GM.cryoGlass, 0, 0.1, -0.05); parts.glow = tank; }
      add(B(0.03, 0.1, 0.04), D, 0, -0.05, 0.04, -0.25); add(B(0.04, 0.05, 0.2), S, 0, 0.0, 0.18);
      add(B(0.01, 0.03, 0.01), S, 0, 0.13, -0.3);
      muzzleZ = -0.55; sightY = 0.14; grip = [0, -0.03, 0.04]; fore = [0, -0.02, -0.25];
      break;
  }
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, sightY - 0.035, muzzleZ); g.add(muzzle); parts.muzzle = muzzle;
  const eject = new THREE.Object3D(); eject.position.set(0.03, 0.04, ejectZ); g.add(eject); parts.eject = eject;
  parts.sightY = sightY; parts.len = -muzzleZ;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = !withHands; o.receiveShadow = !withHands; } });
  if (withHands) {
    // Gants et manches de capote.
    const hr = new THREE.Group(); hr.position.set(grip[0] + 0.005, grip[1] - 0.02, grip[2] + 0.02); g.add(hr);
    add(B(0.055, 0.075, 0.09), GM.glove, 0, 0, 0, 0.3, 0, 0, hr); add(new THREE.CylinderGeometry(0.045, 0.055, 0.34, 10), GM.sleeve, 0.04, -0.06, 0.2, 1.25, 0, -0.2, hr);
    const hl = new THREE.Group(); hl.position.set(fore[0] - 0.01, fore[1] - 0.035, fore[2]); g.add(hl);
    add(B(0.06, 0.05, 0.1), GM.glove, 0, 0, 0, 0.1, 0.3, 0, hl); add(new THREE.CylinderGeometry(0.045, 0.055, 0.42, 10), GM.sleeve, -0.1, -0.07, 0.22, 1.2, -0.45, 0.25, hl);
    parts.handL = hl; parts.handR = hr;
    if (key === 'shotgun' && parts.pump) { g.remove(hl); parts.pump.add(hl); hl.position.set(0, -0.025, -0.3); }
  }
  return parts;
}

// Couteau de tranchée et grenade : buildKnife() et buildGrenadeModel() (08b_gunmodels.js).

// Modèles d'exposition (caisse mystère, établi) : construits une fois par arme et réutilisés. La caisse en change plusieurs
// fois par seconde quand elle tourne : sans cela, elle reconstruirait (et accumulerait) des milliers de triangles à chaque fois.
const GUN_SHOW = new Map();
function gunShow(key, up = false, slot = 'box') {
  const id = slot + ':' + key + (up ? '+' : ''); let o = GUN_SHOW.get(id);
  if (!o) { o = buildGunModel(key, up, false).root; GUN_SHOW.set(id, o); }
  o.rotation.set(0, Math.PI / 2, 0); o.position.set(0, 0, 0); return o;
}

// Accroche les armes réelles sur les silhouettes à la craie.
function mountWallWeapons() {
  // Surface visible du mur (mur fin, maçonnerie, paroi de tranchée) : le groupe y est posé, le contour 3 cm devant et l'arme
  // devant le contour ; avant, le contour était dans la surface d'un mur fin et scintillait selon l'angle de vue.
  R.scene.updateMatrixWorld(true);
  const solids = []; R.scene.traverse((o) => { if (o.isMesh && o.visible && !o.isSprite && o.material && !o.material.transparent && !o.material.isMeshBasicMaterial) solids.push(o); });
  const rc = new THREE.Raycaster(); rc.far = 1.6;
  for (const wb of WORLD.wallBuys) {
    const w = WEAPONS[wb.weapon], g = wb.group, d = wb.face, P0 = g.position.clone();
    let best = null; // rayon depuis la pièce vers le mur, au centre et aux deux bouts du contour : la surface la plus avancée
    for (const a of [-0.55, 0, 0.55]) for (const y of [-0.1, 0.15]) {
      const o = new THREE.Vector3(P0.x - d[0] * 0.8 + d[1] * a, P0.y + y, P0.z - d[1] * 0.8 - d[0] * a); rc.set(o, new THREE.Vector3(d[0], 0, d[1]));
      const h = rc.intersectObjects(solids, false)[0]; if (h && h.distance > 0.35 && (best === null || h.distance < best)) best = h.distance; // (plus de 45 cm devant le mur : un objet, pas le mur)
    }
    if (best !== null) g.position.set(P0.x - d[0] * (0.8 - best), P0.y, P0.z - d[1] * (0.8 - best));
    // Ce qui est posé devant (banquette de tir, parapet, meuble) ne doit cacher ni l'arme ni son prix : on remonte au besoin.
    const fy = groundAt(g.position.x - d[0] * 0.5, g.position.z - d[1] * 0.5); let top = fy;
    for (const a of [-0.5, 0, 0.5]) for (const k of [0.12, 0.35, 0.6, 0.9]) {
      rc.set(new THREE.Vector3(g.position.x - d[0] * k + d[1] * a, fy + 2.4, g.position.z - d[1] * k - d[0] * a), new THREE.Vector3(0, -1, 0));
      const h = rc.intersectObjects(solids, false)[0]; if (h && h.point.y < fy + 1.5) top = Math.max(top, h.point.y);
    }
    g.position.y = clamp(Math.max(g.position.y, top + 0.55), g.position.y, fy + 2.3);
    g.updateMatrixWorld(true);
    // Arme à sa taille d'exposition, centrée sur le groupe, canon vers +x, posée 4 cm devant le mur.
    const m = buildGunModel(wb.weapon, false, false).root; m.rotation.y = -Math.PI / 2; g.add(m); g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), bb = new THREE.Box3().setFromObject(m).applyMatrix4(inv);
    const k = clamp((WALL_LEN[wb.weapon] || 0.9) / Math.max(0.05, bb.max.x - bb.min.x), 0.4, 2.5); m.scale.setScalar(k);
    m.position.set(-((bb.min.x + bb.max.x) / 2) * k, -((bb.min.y + bb.max.y) / 2) * k, 0.04 - bb.min.z * k); g.updateMatrixWorld(true);
    // Contour lumineux qui fait le tour de l'arme en suivant sa forme, prix dessous (au-dessus du mur dans l'ordre de
    // profondeur, sans écrire la profondeur).
    const ol = gunOutline(m, inv, w.name, w.cost);
    const chalk = new THREE.Mesh(new THREE.PlaneGeometry(ol.w, ol.h), new THREE.MeshBasicMaterial({ map: ol.tex, transparent: true, depthWrite: false, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    chalk.position.set(ol.x, ol.y, 0.03); g.add(chalk);
    // Saillie du mur sous l'arme (cimaise, lambris épais) devant le contour ou le prix : on remonte le tout au-dessus.
    let lift = 0; const bot = ol.y - ol.h / 2, o = new THREE.Vector3(), q = new THREE.Vector3();
    for (let y = bot; y < 0; y += 0.02) for (const a of [-0.4, 0, 0.4]) {
      g.localToWorld(o.set(ol.x + a * ol.w, y, 0.8)); g.localToWorld(q.set(ol.x + a * ol.w, y, 0)); rc.set(o, q.sub(o).normalize());
      const h = rc.intersectObjects(solids, false)[0], p = h ? 0.8 - h.distance : 0; if (p > 0.028 && p < 0.35) lift = Math.max(lift, y + 0.025 - bot);
    }
    if (lift > 0) { g.position.y = Math.min(g.position.y + lift, fy + 2.3); g.updateMatrixWorld(true); }
    const ox0 = (bb.min.x - (bb.min.x + bb.max.x) / 2) * k, ox1 = -ox0, gy0 = -((bb.max.y - bb.min.y) / 2) * k;
    // Deux chevilles plantées dans le mur, sous l'arme.
    for (const o of [ox0 + (ox1 - ox0) * 0.2, ox0 + (ox1 - ox0) * 0.75]) { const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 6), MATS.iron); peg.rotation.x = Math.PI / 2; peg.position.set(o, gy0 - 0.005, 0.0); g.add(peg); }
  }
}

// Contour d'une arme murale : silhouette de l'arme vue de face (ses triangles projetés sur le plan du mur), élargie de GAP ;
// on suit le bord de cette forme (tracé de Moore) et on le dessine en pointillés lumineux, nom et prix dessous.
// Rend { tex, w, h, x, y } : texture et plan (m) à placer dans le repère du groupe.
function gunOutline(m, inv, label, cost) {
  const PPM = 400, GAP = 0.04, MARG = GAP + 0.04, LH = 0.17, tri = [], M4 = new THREE.Matrix4(), v = new THREE.Vector3();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  m.traverse((o) => {
    const pa = o.isMesh && o.geometry?.attributes?.position; if (!pa) return;
    M4.multiplyMatrices(inv, o.matrixWorld); const ix = o.geometry.index, n = ix ? ix.count : pa.count, xy = new Float32Array(pa.count * 2);
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(M4); xy[i * 2] = v.x; xy[i * 2 + 1] = v.y; x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    for (let i = 0; i + 2 < n; i += 3) for (const q of [i, i + 1, i + 2]) { const a = ix ? ix.getX(q) : q; tri.push(xy[a * 2], xy[a * 2 + 1]); }
  });
  const fnt = font(44, 800), txt = `${label} · ${cost}`, meas = makeCanvas(8, 8).getContext('2d'); meas.font = fnt;
  const W = Math.ceil(Math.max((x1 - x0 + 2 * MARG) * PPM, meas.measureText(txt).width + 24)), HO = Math.ceil((y1 - y0 + 2 * MARG) * PPM), H = HO + Math.ceil(LH * PPM);
  const ox = (x0 + x1) / 2 - W / PPM / 2, oy = y1 + MARG, P = (x, y) => [(x - ox) * PPM, (oy - y) * PPM];
  // Silhouette élargie : chaque triangle rempli (tous remis dans le même sens) et tracé d'un trait de 2 × GAP aux joints ronds.
  const mc = makeCanvas(W, HO), mx = mc.getContext('2d'); mx.fillStyle = mx.strokeStyle = '#fff'; mx.lineWidth = 2 * GAP * PPM; mx.lineJoin = 'round'; mx.beginPath();
  for (let i = 0; i < tri.length; i += 6) {
    let [ax, ay] = P(tri[i], tri[i + 1]), [bx, by] = P(tri[i + 2], tri[i + 3]), [cx, cy] = P(tri[i + 4], tri[i + 5]);
    if ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax) < 0) [bx, by, cx, cy] = [cx, cy, bx, by];
    mx.moveTo(ax, ay); mx.lineTo(bx, by); mx.lineTo(cx, cy); mx.closePath();
  }
  mx.fill(); mx.stroke();
  const al = mx.getImageData(0, 0, W, HO).data, B = new Uint8Array(W * HO); for (let i = 0; i < W * HO; i++) B[i] = al[i * 4 + 3] > 127 ? 1 : 0;
  // Bords extérieurs de chaque morceau (une arme d'un seul tenant n'en a qu'un) ; chaque morceau suivi est ensuite effacé.
  const DX = [-1, -1, 0, 1, 1, 1, 0, -1], DY = [0, -1, -1, -1, 0, 1, 1, 1], dirOf = (dx, dy) => { for (let d = 0; d < 8; d++) if (DX[d] === dx && DY[d] === dy) return d; return 0; };
  const loops = [];
  for (let y = 1; y < HO - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!B[y * W + x]) continue;
    const pts = [[x, y]]; let px = x, py = y, bx = x - 1, by = y;
    while (pts.length < 40000) {
      const d0 = dirOf(bx - px, by - py); let moved = false;
      for (let k = 1; k <= 8; k++) { const d = (d0 + k) % 8, nx = px + DX[d], ny = py + DY[d]; if (B[ny * W + nx]) { const pd = (d0 + k - 1) % 8; bx = px + DX[pd]; by = py + DY[pd]; px = nx; py = ny; moved = true; break; } }
      if (!moved || (px === x && py === y)) break;
      pts.push([px, py]);
    }
    if (pts.length > 20) loops.push(pts);
    const st = [y * W + x]; B[y * W + x] = 0; // efface le morceau (remplissage par diffusion)
    while (st.length) { const i = st.pop(), cx = i % W, cy = (i / W) | 0; for (let d = 0; d < 8; d += 2) { const j = (cy + DY[d]) * W + cx + DX[d]; if (B[j]) { B[j] = 0; st.push(j); } } }
  }
  const tex = textTexture(W, H, (c) => {
    c.lineJoin = c.lineCap = 'round'; c.strokeStyle = 'rgba(248,248,240,.95)'; c.lineWidth = 0.011 * PPM; c.setLineDash([16, 5, 7, 4]);
    c.shadowColor = 'rgba(225,240,255,.9)'; c.shadowBlur = 9;
    for (const L of loops) {
      const n = L.length, R = 4; c.beginPath(); // trait lissé (moyenne glissante sur ±4 pixels du bord)
      for (let i = 0; i < n; i += 2) { let sx = 0, sy = 0; for (let k = -R; k <= R; k++) { const q = L[(i + k + n) % n]; sx += q[0]; sy += q[1]; } i ? c.lineTo(sx / (2 * R + 1), sy / (2 * R + 1)) : c.moveTo(sx / (2 * R + 1), sy / (2 * R + 1)); }
      c.closePath(); c.stroke(); c.stroke();
    }
    c.setLineDash([]); c.shadowBlur = 6; c.fillStyle = 'rgba(245,245,240,.92)'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = fnt; c.fillText(txt, W / 2, HO + LH * PPM * 0.45);
  });
  return { tex, w: W / PPM, h: H / PPM, x: ox + W / PPM / 2, y: oy - H / PPM / 2 };
}
