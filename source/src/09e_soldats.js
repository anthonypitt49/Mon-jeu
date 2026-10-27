/* ═══════════════════ SOLDATS : les personnages joués (modèles importés, assets/soldats/) ═══════════════════
   En coopération, chaque coéquipier prend le corps d'un soldat moderne (source/tools/import_modeles.py, même squelette
   que les infectés réalistes) : le squelette procédural de makeRig reste celui qu'on pose, caché, et le modèle le recopie
   (zrealPose, comme les infectés). Téléchargés à l'arrivée du premier coéquipier : rien à charger en solo.
   Chaque joueur a son soldat (rang dans la liste de l'hôte, rec.soldier) ; les couleurs de ses manches et de ses gants
   habillent les bras vus en vue subjective. */
const SOLDATS = [ // [modèle, manches, gants] (couleurs dominantes de sa tenue ; le premier est celui du joueur seul)
  ['s_s1', 0x4f5a3a, 0x2c2a27], ['s_mark', 0x4b4c3c, 0x34302b], ['s_a1', 0xa08b64, 0x5e5040], ['s_russe', 0x5c6a48, 0x2c2a27]];
const SREAL = { state: 'off', err: '', tpl: {} };
const SR_HIDE = new THREE.MeshBasicMaterial({ visible: false }); // corps procédural caché ; ses os restent (l'arme y est fixée)

async function srealStart() {
  if (!zrealWanted() || SREAL.state !== 'off') return;
  SREAL.state = 'loading'; const base = 'assets/soldats/';
  try {
    const man = await (await fetch(base + 'manifest.json', { cache: 'force-cache' })).json();
    const [{ GLTFLoader }, SU] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/utils/SkeletonUtils.js')]);
    ZREAL.clone ||= SU.clone;
    const gl = new GLTFLoader();
    await Promise.all(Object.keys(man.chars).map(async (id) => { const g = await zrealLoad(gl, base, id); SREAL.tpl[id] = zrealTemplate(g.scene, zrealMaterial(g.scene), man.chars[id]); }));
    // Shaders et textures préparés hors de l'écran avant la première apparition (pas de saccade quand un soldat surgit).
    const g = new THREE.Group(), inst = Object.values(SREAL.tpl).map((t) => zrealInstance(t)); for (const i of inst) g.add(i.root);
    g.position.set(0, -500, 0); R.scene.add(g);
    for (const t of Object.values(SREAL.tpl)) for (const k of ['map', 'normalMap', 'alphaMap']) if (t.mesh.material[k]) R.renderer.initTexture(t.mesh.material[k]);
    await R.renderer.compileAsync(g, R.camera, R.scene).catch(() => {}); R.scene.remove(g); for (const i of inst) i.mesh.skeleton.dispose();
    SREAL.state = 'on';
  } catch (e) { SREAL.state = 'failed'; SREAL.err = String(e?.message || e); }
}
function soldierTpl(i) { const s = SOLDATS[(i | 0) % SOLDATS.length]; return SREAL.tpl[s[0]] || Object.values(SREAL.tpl)[(i | 0) % Object.keys(SREAL.tpl).length]; }
// Bras en vue subjective aux couleurs du soldat du joueur (manches et gants : matières partagées par toutes les armes).
function soldierArms(i) {
  const s = SOLDATS[(i | 0) % SOLDATS.length]; if (!GM.sleeve) return;
  GM.sleeve.color.setHex(s[1]); GM.glove.color.setHex(s[2]); for (const [m, src] of VM.arms) m.color.copy(src.color); // (armes en main déjà construites : copies)
}
