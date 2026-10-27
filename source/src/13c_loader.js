/* ═══════════════════ ÉCRAN DE CHARGEMENT ET PRÉCHAUFFAGE ═══════════════════
   L'accueil ne s'affiche qu'une fois tout prêt : monde construit, photos des matières posées, infectés réalistes chargés,
   textures envoyées à la carte graphique et shaders compilés. Avant, ces travaux tombaient sur l'accueil et sur le début
   de partie (première arme en main, première grenade, premier infecté d'un modèle…) : chaque shader compilé à ce moment-là
   fige l'image de quelques dizaines à quelques centaines de millisecondes (mesure : source/dev/gels.mjs).
   Le préchauffage dessine une fois, sous l'écran de chargement, tout ce que la partie montrera plus tard. */

// À l'ouverture de la page : image commune (assets/cartes/accueil.jpg) ; après un choix de carte (switchMap, qui laisse la
// carte choisie dans sessionStorage), au lancement d'une partie et aux réglages : l'image de la carte.
const LOADER = { shown: false, p: 0, hideT: 0, mapBoot: (() => { try { const v = sessionStorage.getItem('sp_loadMap'); sessionStorage.removeItem('sp_loadMap'); sessionStorage.removeItem('sp_loadMapName'); return v; } catch { return null; } })() };
const LOADER_TIPS = [
  'Tirez dans la tête : un infecté tombe plus vite et rapporte plus.',
  'Reclouer une fenêtre rapporte des points et retient les infectés.',
  'Sans courant, pas d\'atouts ni d\'établi : cherchez les pièces du générateur.',
  'La caisse de ravitaillement donne une arme au hasard ; elle change parfois de place.',
  'Le couteau ne manque jamais de munitions.',
  'En co-op, Q (ou PING) signale un infecté, un objet ou un endroit à vos camarades.',
  'À terre, un camarade peut vous relever en maintenant E près de vous.',
];
// Écran de la carte : sa photo (assets/cartes/<carte>.jpg, sinon ses couleurs), son nom, la barre de progression.
// mode 'boot' : démarrage de la page ; 'start' : lancement d'une partie (court carton) ; 'quality' : réglages graphiques.
function loaderShow(mode = 'boot') {
  const el = $('loader'); if (!el) return;
  clearTimeout(LOADER.hideT); LOADER.shown = true; LOADER.p = 0;
  el.className = 'loader ' + mode;
  const [c0, c1] = M.card || ['#0b1219', '#4f6a80'];
  el.style.setProperty('--c0', c0); el.style.setProperty('--c1', c1);
  const common = mode === 'boot' && LOADER.mapBoot !== MAP_ID, key = common ? 'accueil' : MAP_ID, img = $('loaderImg');
  el.classList.toggle('common', common); if (common) new Image().src = `assets/cartes/${MAP_ID}.jpg`; // (préchargée pour le carton de lancement)
  // (Image posée directement : le navigateur l'affiche dès qu'elle est là, sans attendre le fil principal, souvent occupé
  // à ce moment ; celle de l'ouverture l'est déjà par la page, avant le moteur 3D : shell.html.)
  if (img.dataset.map !== key) { img.dataset.map = key; img.style.backgroundImage = `url("assets/cartes/${key}.jpg")`; img.classList.add('ready'); }
  $('loaderEyebrow').textContent = mode === 'start' ? 'DÉPLOIEMENT' : mode === 'quality' ? 'RÉGLAGES GRAPHIQUES' : 'CHARGEMENT';
  $('loaderName').textContent = common ? 'SNOWFALL PROTOCOL' : M.name; $('loaderSub').textContent = common ? `Carte : ${M.name}` : M.sub || '';
  $('loaderDesc').textContent = common ? 'Survivez aux infectés, seul ou jusqu\'à quatre en coopération.' : mode === 'start' ? (M.intro || []).slice(1).join(' — ') : M.info?.tagline?.replace(/<[^>]+>/g, '') || '';
  $('loaderTip').textContent = mode === 'boot' ? LOADER_TIPS[(Math.random() * LOADER_TIPS.length) | 0] : '';
  loaderStep(mode === 'start' ? 'MISE EN PLACE…' : 'GÉNÉRATION DU SECTEUR…', 0);
}
function loaderStep(label, p) {
  if (!LOADER.shown) return;
  if (label) $('loaderStep').textContent = label;
  if (p != null) { LOADER.p = Math.max(LOADER.p, clamp(p, 0, 1)); $('loaderFill').style.transform = `scaleX(${LOADER.p.toFixed(3)})`; }
}
function loaderHide() {
  const el = $('loader'); if (!el || !LOADER.shown) return;
  LOADER.shown = false; loaderStep(null, 1); el.classList.add('done');
  LOADER.hideT = setTimeout(() => el.classList.add('gone'), 700);
}
const nextFrame = () => new Promise((res) => { const t = setTimeout(res, 100); requestAnimationFrame(() => { clearTimeout(t); res(); }); });

// Chargements en arrière-plan (photos, infectés réalistes, ombrage d'ambiance) : on les attend, plafonnés à `limit` ms
// (connexion lente : l'accueil s'ouvre quand même, le reste arrive ensuite comme avant).
async function loaderWait(jobs, limit = 90000, p0 = 0.35, p1 = 0.82) {
  const t0 = performance.now(); let done = false; Promise.allSettled(jobs).then(() => (done = true));
  while (!done && performance.now() - t0 < limit) {
    const ph = PHOTO.total ? PHOTO.files / PHOTO.total : PHOTO.state === 'loading' ? 0 : 1, zr = ZREAL.state === 'loading' ? 0 : 1;
    loaderStep(PHOTO.state === 'loading' ? `TEXTURES PHOTO… ${PHOTO.files}/${PHOTO.total || '…'}` : ZREAL.state === 'loading' ? 'LEVÉE DES MORTS…' : 'OMBRAGE D\'AMBIANCE…', lerp(p0, p1, ph * 0.75 + zr * 0.25));
    await new Promise((r) => setTimeout(r, 100));
  }
}

// Préchauffage : tout ce que la partie dessinera plus tard (armes en main, couteau, grenade, chaque modèle d'infecté,
// infecté gelé, yeux, moignons, objets ramassables, armes de la caisse et sa lumière, objets cachés du décor) est dessiné
// une fois maintenant, devant la caméra et sous l'écran de chargement, puis rangé. Les armes en main restent en cache
// (setViewmodel les reprend : changer d'arme ne construit plus rien).
async function warmUp() {
  const r = R.renderer, scene = R.scene, vs = R.viewScene, flipped = [], temp = [];
  if (G.mode === 'menu') updateMenu(0, 0);
  R.camera.updateMatrixWorld(true);
  const cam = R.camera, fwd = cam.getWorldDirection(new THREE.Vector3());
  const g = new THREE.Group(); g.position.copy(cam.position).addScaledVector(fwd, 4); g.lookAt(cam.position); scene.add(g);
  const put = (o, x, y, z = 0) => { o.position.set(x, y, z); g.add(o); temp.push(o); return o; };
  // Monde : infectés (un par modèle, plus un gelé), yeux, moignon, grenade lancée, objets ramassables.
  if (ZREAL.state === 'on') {
    const tpls = [...new Set([...ZREAL.list, ZREAL.brute, ZREAL.boss].filter(Boolean))];
    tpls.forEach((t, i) => put(zrealInstance(t).root, (i - tpls.length / 2) * 0.7, -1.2));
    const zf = zrealInstance(tpls[0]); zf.mesh.material = ZMAT_FROZEN; put(zf.root, 2.2, -1.2);
  }
  put(new THREE.Mesh(ZEYE_GEO, eyeMaterial(new THREE.Color(EYE_COL[MAP_ID] ?? 0xffb040))), 0, 0.5); // (même matière qu'en jeu, sans brouillard)
  goreAssets(); put(new THREE.Mesh(GORE.capGeo, GORE.capMat), 0.3, 0.5); // (moignons et éclats de chair : textures de chair)
  put(buildGrenadeModel(false), -0.3, 0.5);
  for (const type of Object.keys(DROP_TYPES)) put(new THREE.Sprite(new THREE.SpriteMaterial({ map: dropTexture(type), depthWrite: false, transparent: true })), rand(-1, 1), 0.8);
  put(new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0x3dff7a, blending: THREE.AdditiveBlending, depthWrite: false })), 0, 1);
  // Caisse : chaque arme qu'elle peut montrer (gardée en cache par boxGun) et ses rayons verts.
  if (typeof boxGun === 'function') for (const k of Object.keys(WEAPONS)) put(boxGun(k), rand(-1, 1), rand(0, 1));
  if (BOX_FX?.rays) { BOX_FX.rays.visible = true; put(BOX_FX.rays, 0, -0.5); }
  // Arme en main : toutes, normales et améliorées, avec leur éclair de bouche ; couteau et grenade en main.
  const vg = new THREE.Group(); vg.position.set(0, -0.15, -0.7); vs.add(vg);
  const holders = [];
  for (const k of Object.keys(WEAPONS)) for (const up of [false, true]) {
    const p = (VM.cache[k + (up ? '+' : '')] ||= viewmodelParts(k, up)); if (p.holder.parent) continue;
    p.flash.visible = p.flashSide.visible = true; vg.add(p.holder); holders.push(p);
  }
  if (!VM.knife) { VM.knife = buildKnife(); VM.knife.visible = false; R.viewScene.add(VM.knife); VM.nade = buildGrenadeModel(true); VM.nade.visible = false; R.viewScene.add(VM.nade); } // (cachés hors usage, comme dans setViewmodel)
  const kv = [VM.knife.visible, VM.nade.visible]; VM.knife.visible = VM.nade.visible = true;
  // Objets cachés du décor (lueurs, effets, objets de quête…) : rendus visibles le temps du préchauffage. Jamais les lumières :
  // leur nombre entre dans chaque shader, en allumer une compilerait tout pour un éclairage que le jeu n'aura pas.
  for (const root of [scene, vs]) root.traverse((o) => { if (!o.visible && !o.isLight && !o.isCamera) { o.visible = true; flipped.push(o); } });
  // Textures envoyées à la carte graphique (une par une, entre deux images : la page reste animée).
  const texs = new Set(), keys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'emissiveMap', 'aoMap', 'bumpMap'];
  for (const root of [scene, vs]) root.traverse((o) => { for (const m of [].concat(o.material || [])) { for (const k of keys) if (m[k]?.isTexture) texs.add(m[k]); for (const u of Object.values(m.uniforms || {})) if (u?.value?.isTexture) texs.add(u.value); } });
  let n = 0; const tl = [...texs];
  for (const t of tl) { if (t.image || t.isRenderTargetTexture) try { r.initTexture(t); } catch { /* texture sans image prête */ } if (++n % 12 === 0) { loaderStep(`TEXTURES… ${n}/${tl.length}`, lerp(0.82, 0.9, n / tl.length)); await nextFrame(); } }
  // Shaders : compilation en parallèle quand le navigateur le permet (KHR_parallel_shader_compile), puis deux images
  // dessinées pour tout le reste (ombres, passes d'image).
  loaderStep('PRÉPARATION DES EFFETS…', 0.9);
  // (Avec la chaîne d'effets d'image, la scène est dessinée dans une image intermédiaire et non à l'écran : three.js en tire
  // une autre variante de shader, sans mappage des tons. On compile donc dans la même cible que le vrai rendu.)
  const rt = R.composer ? R.composer.readBuffer : null, prevRt = r.getRenderTarget(); r.setRenderTarget(rt);
  const par = r.extensions.has('KHR_parallel_shader_compile'); // (sinon three.js se plaint dans la console et compile d'un bloc)
  try { if (par) { await r.compileAsync(scene, cam); await r.compileAsync(vs, R.viewCam); } else { r.compile(scene, cam); r.compile(vs, R.viewCam); } } catch { /* compilation paresseuse */ }
  r.setRenderTarget(prevRt);
  // Ombres : le cadre de la lune est élargi à toute la carte le temps de ces images, pour que chaque objet qui porte une
  // ombre ait sa variante d'ombre compilée (sinon elle l'était quand la caméra du menu passait près de lui).
  const moon = R.lights.moon, sc = Q.shadows && moon.shadow?.camera, bak = sc && { l: sc.left, r: sc.right, t: sc.top, b: sc.bottom, f: sc.far, p: moon.position.clone(), q: moon.target.position.clone() };
  if (sc) { const e = (Math.max(MAP_W, MAP_D) / 2 + 30) * TILE, cx = (MAP_W * TILE) / 2, cz = (MAP_D * TILE) / 2; Object.assign(sc, { left: -e, right: e, top: e, bottom: -e, far: 600 }); sc.updateProjectionMatrix(); moon.target.position.set(cx, 0, cz); moon.position.set(cx + MOON_DIR.x * 250, MOON_DIR.y * 250, cz + MOON_DIR.z * 250); }
  for (let i = 0; i < 2; i++) { renderFrame(performance.now() / 1000); loaderStep(null, 0.95 + i * 0.02); await nextFrame(); }
  if (sc) { Object.assign(sc, { left: bak.l, right: bak.r, top: bak.t, bottom: bak.b, far: bak.f }); sc.updateProjectionMatrix(); moon.position.copy(bak.p); moon.target.position.copy(bak.q); }
  // Rangement.
  for (const o of flipped) o.visible = false;
  for (const o of temp) o.removeFromParent();
  if (BOX_FX?.rays) BOX_FX.rays.visible = false;
  for (const p of holders) { p.flash.visible = p.flashSide.visible = false; vg.remove(p.holder); }
  vs.remove(vg); [VM.knife.visible, VM.nade.visible] = kv;
  g.removeFromParent();
}
