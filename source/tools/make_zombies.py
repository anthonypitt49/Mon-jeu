#!/usr/bin/env python3
"""Fabrique les infectés réalistes du jeu, une époque par carte, dans ../../assets/zombies/.

Corps, peaux, vêtements, cheveux : MakeHuman (CC0), assemblés par l'extension MPFB2 dans Blender lancé sans écran
(module Python bpy 4.2). Chaque personnage reçoit le squelette « game_engine » (53 os), est allégé, puis toutes ses
textures sont réunies en une seule image (un seul appel de dessin par infecté dans le jeu). La « zombification » est
peinte en 3D sur cette image : chaque texel connaît sa position sur le corps (peau grise et marbrée, veines, orbites
creuses, sang à la bouche, plaies, boue et sang sur les vêtements, teintes d'époque). Le relief est tiré de la couleur.

Installation (une fois) :
  python3 -m venv blender_env && blender_env/bin/pip install "bpy==4.2.*"
  puis installer MPFB2 (extensions.blender.org) et le pack makehuman_system_assets_cc0 dans les données de MPFB.
Usage : blender_env/bin/python make_zombies.py [époque ou identifiant…]   (sans argument : tout)
Sorties : <id>.glb (géométrie, squelette, et ses trois images : couleur 2048, relief 1024, découpe des cheveux et des
cils 512 rangée en « occlusion »), manifest.json, CREDITS.md.
"""
import os, sys, json, math, subprocess

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'zombies')

# ─── Les infectés de chaque époque ───
# macro : réglages MakeHuman (0..1) ; skin : peau MakeHuman ; clothes : [vêtement, teinte (r, g, b) ou None] ;
# extra : pièces ajoutées (casque Adrian, képi, casquette de gardien) ; brute : gabarit lourd (plus grand dans le jeu).
H_BLUE, H_BLUE2, KHAKI = (0.46, 0.55, 0.64), (0.38, 0.46, 0.56), (0.55, 0.5, 0.34)
SPECS = [
    # Poste 7, 1917 : poilus en bleu horizon, casque Adrian, bandes molletières ; un tirailleur en kaki.
    dict(id='p7_a', era='1917', macro=dict(gender=1, age=0.5, muscle=0.5, weight=0.35, height=0.55), skin='young_caucasian_male',
         clothes=[('male_casualsuit01', H_BLUE), ('shoes03', (0.22, 0.16, 0.1))], extra=['adrian'], puttees=True),
    dict(id='p7_b', era='1917', macro=dict(gender=1, age=0.55, muscle=0.45, weight=0.3, height=0.45), skin='middleage_caucasian_male',
         clothes=[('male_casualsuit05', H_BLUE2), ('shoes03', (0.2, 0.15, 0.1))], extra=['adrian'], puttees=True),
    dict(id='p7_c', era='1917', macro=dict(gender=1, age=0.52, muscle=0.6, weight=0.35, height=0.6), skin='young_african_male',
         clothes=[('male_casualsuit01', KHAKI), ('shoes03', (0.2, 0.14, 0.09))], extra=['adrian_khaki'], puttees=True),
    dict(id='p7_d', era='1917', brute=True, macro=dict(gender=1, age=0.6, muscle=0.95, weight=0.75, height=0.7), skin='middleage_caucasian_male',
         clothes=[('male_casualsuit01', (0.3, 0.36, 0.42)), ('shoes03', (0.15, 0.12, 0.09))], extra=['adrian'], puttees=True),
    # Cité atomique, 1957 : civils du village témoin.
    dict(id='ci_a', era='1957', macro=dict(gender=1, age=0.5, muscle=0.5, weight=0.35, height=0.55), skin='young_caucasian_male', hair='short03',
         clothes=[('male_casualsuit06', None), ('shoes04', None)]),
    dict(id='ci_b', era='1957', macro=dict(gender=1, age=0.7, muscle=0.4, weight=0.55, height=0.5), skin='old_caucasian_male', hair='short04',
         clothes=[('male_elegantsuit01', (0.42, 0.4, 0.36)), ('shoes01', None)]),
    dict(id='ci_c', era='1957', macro=dict(gender=0, age=0.52, muscle=0.35, weight=0.4, height=0.45, cupsize=0.5), skin='middleage_caucasian_female', hair='bob01',
         clothes=[('female_elegantsuit01', None), ('shoes04', None)]),
    dict(id='ci_d', era='1957', macro=dict(gender=1, age=0.5, muscle=0.55, weight=0.45, height=0.5), skin='middleage_african_male', hair='short01',
         clothes=[('male_casualsuit03', None), ('shoes01', None)]),
    dict(id='ci_e', era='1957', brute=True, macro=dict(gender=1, age=0.5, muscle=1, weight=0.8, height=0.7), skin='middleage_caucasian_male', hair='short02',
         clothes=[('male_worksuit01', (0.3, 0.36, 0.5)), ('shoes02', None)]),
    # Pénitencier, 1933 : détenus en toile grise, gardiens en uniforme marine.
    dict(id='pe_a', era='1933', macro=dict(gender=1, age=0.5, muscle=0.5, weight=0.3, height=0.55), skin='young_caucasian_male', hair='short01',
         clothes=[('male_worksuit01', (0.5, 0.52, 0.5)), ('shoes04', None)]),
    dict(id='pe_b', era='1933', macro=dict(gender=1, age=0.6, muscle=0.45, weight=0.3, height=0.5), skin='middleage_african_male', hair='short02',
         clothes=[('male_casualsuit06', (0.62, 0.6, 0.55)), ('shoes04', None)]),
    dict(id='pe_c', era='1933', macro=dict(gender=1, age=0.5, muscle=0.55, weight=0.45, height=0.6), skin='middleage_caucasian_male', hair='short04',
         clothes=[('male_elegantsuit01', (0.16, 0.2, 0.3)), ('shoes04', None)], extra=['garde'], boss=True),  # le geôlier (boss) en est une version géante
    dict(id='pe_d', era='1933', brute=True, macro=dict(gender=1, age=0.5, muscle=1, weight=0.8, height=0.75), skin='middleage_asian_male', hair='short02',
         clothes=[('male_worksuit01', (0.42, 0.44, 0.44)), ('shoes03', None)]),
    # Filon maudit, 1880 : mineurs, gens de la ville.
    dict(id='fi_a', era='1880', macro=dict(gender=1, age=0.5, muscle=0.6, weight=0.35, height=0.55), skin='middleage_caucasian_male', hair='short04',
         clothes=[('male_worksuit01', (0.45, 0.36, 0.24)), ('shoes03', (0.2, 0.14, 0.09)), ('fedora01', (0.25, 0.2, 0.15))]),
    dict(id='fi_b', era='1880', macro=dict(gender=1, age=0.52, muscle=0.5, weight=0.3, height=0.5), skin='young_asian_male', hair='short02',
         clothes=[('male_casualsuit03', (0.5, 0.42, 0.32)), ('shoes03', (0.18, 0.13, 0.09))]),
    dict(id='fi_c', era='1880', macro=dict(gender=1, age=0.7, muscle=0.4, weight=0.5, height=0.5), skin='old_caucasian_male', hair='short04',
         clothes=[('male_elegantsuit01', (0.3, 0.22, 0.16)), ('shoes01', None), ('fedora_cocked', (0.15, 0.13, 0.12))]),
    dict(id='fi_d', era='1880', macro=dict(gender=0, age=0.5, muscle=0.35, weight=0.35, height=0.45, cupsize=0.55), skin='young_caucasian_female', hair='ponytail01',
         clothes=[('female_elegantsuit01', (0.45, 0.16, 0.18)), ('shoes04', None)]),
    dict(id='fi_e', era='1880', brute=True, macro=dict(gender=1, age=0.55, muscle=1, weight=0.75, height=0.75), skin='middleage_african_male', hair='short01',
         clothes=[('male_worksuit01', (0.36, 0.3, 0.22)), ('shoes03', (0.18, 0.13, 0.09))]),
]
ERA_OF_MAP = {'poste7': '1917', 'cite': '1957', 'penitencier': '1933', 'filon': '1880'}
# Budget de triangles par pièce (le corps garde le détail du visage).
BUDGET = {'body': 7000, 'clothes': 3800, 'shoes': 700, 'hair': 1400, 'teeth': 500, 'tongue': 120, 'hat': 700}


def main():
    want = sys.argv[1:]
    todo = [s for s in SPECS if not want or s['id'] in want or s['era'] in want]
    os.makedirs(OUT, exist_ok=True)
    for s in todo:  # un processus par personnage : Blender repart d'une scène vide
        r = subprocess.run([sys.executable, os.path.abspath(__file__), '--one', s['id']], capture_output=True, text=True)
        line = [l for l in r.stdout.splitlines() if l.startswith('FAIT')]
        print(s['id'], line[0] if line else 'ÉCHEC\n' + r.stdout[-1500:] + r.stderr[-1500:])
    man_p = os.path.join(OUT, 'manifest.json')
    chars = json.load(open(man_p))['chars'] if os.path.exists(man_p) else {}
    for s in SPECS:  # fiches écrites par chaque personnage fabriqué
        p = os.path.join(OUT, s['id'] + '.json')
        if os.path.exists(p): chars[s['id']] = json.load(open(p)); os.remove(p)
    json.dump({'eras': ERA_OF_MAP, 'chars': {k: chars[k] for k in sorted(chars)}}, open(man_p, 'w'), indent=1)
    with open(os.path.join(OUT, 'CREDITS.md'), 'w') as f:
        f.write('# Infectés réalistes\n\nCorps, peaux, vêtements et cheveux : [MakeHuman](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html) '
                '(pack « makehuman_system_assets », CC0, domaine public), assemblés par [MPFB2](https://static.makehumancommunity.org/mpfb.html). '
                'Zombification, assemblage et textures : `source/tools/make_zombies.py`.\n')


# ─────────────────────────── Un personnage (dans Blender) ───────────────────────────
def one(cid):
    import bpy, addon_utils, numpy as np
    from PIL import Image
    spec = next(s for s in SPECS if s['id'] == cid)
    rng = np.random.default_rng(sum(map(ord, cid)) * 7919)
    addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
    from bl_ext.user_default.mpfb.services.humanservice import HumanService
    from bl_ext.user_default.mpfb.services.locationservice import LocationService
    from bl_ext.user_default.mpfb.services.exportservice import ExportService
    D = LocationService.get_user_data
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)

    # 1. Corps, peau, squelette, parties du visage, vêtements.
    macro = {'gender': 0.5, 'age': 0.5, 'muscle': 0.5, 'weight': 0.5, 'proportions': 0.5, 'height': 0.5, 'cupsize': 0.5, 'firmness': 0.5,
             'race': {'asian': 0.0, 'caucasian': 0.0, 'african': 0.0}}
    macro.update({k: v for k, v in spec['macro'].items()})
    race = next(r for r in ('african', 'asian', 'caucasian') if r in spec['skin']); macro['race'][race] = 1.0
    base = HumanService.create_human(macro_detail_dict=macro)
    HumanService.set_character_skin(D(f"skins/{spec['skin']}/{spec['skin']}.mhmat"), base, skin_type='MAKESKIN')
    HumanService.add_builtin_rig(base, 'game_engine')
    parts = [('eyes', 'low-poly'), ('eyebrows', 'eyebrow00' + str(1 + rng.integers(9))), ('eyelashes', 'eyelashes01'), ('teeth', 'teeth_base'), ('tongue', 'tongue01')]
    if spec.get('hair'): parts.append(('hair', spec['hair']))
    tint = {}
    for name, col in spec['clothes']: parts.append(('clothes', name)); tint[name] = col
    for kind, name in parts:
        HumanService.add_mhclo_asset(D(f'{kind}/{name}/{name}.mhclo'), base, asset_type='Clothes' if kind == 'clothes' else kind, subdiv_levels=0, material_type='MAKESKIN')
    rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    ExportService.bake_modifiers_remove_helpers(base, bake_masks=True, bake_subdiv=False, remove_helpers=True, also_proxy=True)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']

    def bake_shapes(o):
        sk = o.data.shape_keys
        if not sk: return
        kb = sk.key_blocks; n = len(o.data.vertices); b0 = np.empty(n * 3, 'f'); kb[0].data.foreach_get('co', b0); res = b0.copy()
        for k in kb[1:]:
            if k.value and not k.mute: a = np.empty(n * 3, 'f'); k.data.foreach_get('co', a); res += k.value * (a - b0)
        o.shape_key_clear(); o.data.vertices.foreach_set('co', res); o.data.update()

    def kind_of(o):
        n = o.name.lower()
        if o == base: return 'body'
        for k in ('teeth', 'tongue', 'eyebrow', 'eyelash', 'low-poly'):
            if k in n: return k
        if 'shoes' in n: return 'shoes'
        if 'fedora' in n: return 'hat'
        if spec.get('hair') and spec['hair'] in n: return 'hair'
        return 'clothes'

    for o in meshes: bake_shapes(o)  # silhouette (âge, carrure, taille) figée avant toute mesure
    # Pièces ajoutées (casques, casquette) : primitives liées à l'os de la tête, peintes d'une couleur unie bruitée.
    head_top = max((base.matrix_world @ v.co).z for v in base.data.vertices)
    cr = np.array([tuple(base.matrix_world @ v.co) for v in base.data.vertices if (base.matrix_world @ v.co).z > head_top - 0.09])
    hx, hyc = float(cr[:, 0].mean()), float(cr[:, 1].mean())  # centre du crâne (la tête est en avant de l'axe du corps)
    extras = []
    for ex in spec.get('extra', []):
        col = {'adrian': (0.36, 0.42, 0.46), 'adrian_khaki': (0.4, 0.38, 0.28), 'garde': (0.13, 0.15, 0.22)}[ex]
        hy = head_top - (0.093 if ex.startswith('adrian') else 0.05)
        if ex.startswith('adrian'):  # bombe, cimier, bord étroit sur les côtés, visière devant, couvre-nuque derrière (Adrian 1915)
            bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=10, radius=0.122, location=(hx, hyc, hy))
            dome = bpy.context.object; bm_cut(dome, hy - 0.002); dome.scale = (1, 1.15, 1.0)
            bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=0.135, depth=0.008, location=(hx, hyc + 0.004, hy - 0.006)); brim = bpy.context.object; brim.scale = (0.97, 1.32, 1)
            bpy.ops.mesh.primitive_cube_add(size=1, location=(hx, hyc, hy + 0.118)); crest = bpy.context.object; crest.scale = (0.01, 0.2, 0.028)
            pieces = [dome, brim, crest]
        else:  # casquette plate à visière de gardien
            bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.11, depth=0.07, location=(hx, hyc, hy + 0.02)); cap = bpy.context.object
            bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.12, depth=0.02, location=(hx, hyc - 0.08, hy - 0.01)); visor = bpy.context.object; visor.scale = (0.9, 0.55, 1)
            pieces = [cap, visor]
        for p in pieces: bpy.context.view_layer.objects.active = p; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        img = solid_image(f'extra_{ex}', col, rng)
        for p in pieces:
            p.name = 'extra_' + ex; mat = bpy.data.materials.new('extra_' + ex); mat.use_nodes = True
            t = mat.node_tree.nodes.new('ShaderNodeTexImage'); t.name = 'diffuseTexture'; t.image = img; p.data.materials.append(mat)
            vg = p.vertex_groups.new(name='head'); vg.add(list(range(len(p.data.vertices))), 1.0, 'REPLACE')
            md = p.modifiers.new('rig', 'ARMATURE'); md.object = rig; p.parent = rig
            if not p.data.uv_layers: p.data.uv_layers.new(name='UVMap')
            extras.append(p)
    meshes += extras

    # 2. Allègement.
    for o in meshes:
        bake_shapes(o)
        o.data.calc_loop_triangles(); n = len(o.data.loop_triangles)
        k = kind_of(o); goal = BUDGET.get(k) if not o.name.startswith('extra') else None
        if goal and n > goal:
            m = o.modifiers.new('allege', 'DECIMATE'); m.ratio = goal / n; m.use_symmetry = True; m.symmetry_axis = 'X'
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_move_to_index(modifier=m.name, index=0); bpy.ops.object.modifier_apply(modifier=m.name)  # avant le squelette

    # 3. Atlas : une case par image source, UV ramenées dans leur case.
    def diffuse_of(mat):
        for nd in mat.node_tree.nodes:
            if nd.type == 'TEX_IMAGE' and nd.image and (nd.name == 'diffuseTexture' or 'diffuse' in nd.name.lower()): return nd.image
        return None
    SIZE = {'body': 1024, 'clothes': 1024, 'hair': 512, 'shoes': 512, 'hat': 256, 'low-poly': 128, 'teeth': 128, 'tongue': 64, 'eyebrow': 128, 'eyelash': 128}
    slots = {}  # chemin d'image → (taille, genre)
    for o in meshes:
        k = kind_of(o) if not o.name.startswith('extra') else 'hat'
        for s in o.material_slots:
            im = diffuse_of(s.material) if s.material else None
            key = bpy.path.abspath(im.filepath) if im and im.filepath else (im.name if im else 'none')
            sz = SIZE.get(k, 256)
            if key not in slots or slots[key][0] < sz: slots[key] = (sz, k, im)
    AT = 2048; G = AT // 64; occ = np.zeros((G, G), bool); rect = {}
    for key, (sz, k, im) in sorted(slots.items(), key=lambda kv: -kv[1][0]):
        c = sz // 64; done = False
        for gy in range(0, G - c + 1, c):
            for gx in range(0, G - c + 1, c):
                if not occ[gy:gy + c, gx:gx + c].any(): occ[gy:gy + c, gx:gx + c] = True; rect[key] = (gx * 64, gy * 64, sz, k, im); done = True; break
            if done: break
        if not done: raise RuntimeError('atlas plein')
    for o in meshes:
        uv = o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap'); uv.name = 'UVMap'
        n = len(o.data.loops); a = np.empty(n * 2, 'f'); uv.data.foreach_get('uv', a); a = a.reshape(-1, 2)
        polys = o.data.polygons; mi = np.empty(len(polys), 'i'); polys.foreach_get('material_index', mi)
        ls = np.empty(len(polys), 'i'); polys.foreach_get('loop_start', ls); lt = np.empty(len(polys), 'i'); polys.foreach_get('loop_total', lt)
        loop_mat = np.repeat(mi, lt)
        for si, s in enumerate(o.material_slots):
            im = diffuse_of(s.material) if s.material else None
            key = bpy.path.abspath(im.filepath) if im and im.filepath else (im.name if im else 'none')
            x, y, sz, _, _ = rect[key]; sel = loop_mat == si
            pad = 2 / AT; u = np.clip(a[sel, 0], 0, 1); v = np.clip(a[sel, 1], 0, 1)
            a[sel, 0] = (x / AT + pad) + u * (sz / AT - 2 * pad); a[sel, 1] = 1 - ((y / AT + pad) + (1 - v) * (sz / AT - 2 * pad))
        uv.data.foreach_set('uv', a.ravel())
    # Images d'atlas : couleur (avec teintes d'époque), découpe (alpha).
    col = np.zeros((AT, AT, 3), np.float32); alpha = np.ones((AT, AT), np.float32); region = np.zeros((AT, AT), np.uint8)
    REG = {'body': 1, 'clothes': 2, 'shoes': 2, 'hat': 2, 'hair': 3, 'low-poly': 4, 'teeth': 5, 'tongue': 5, 'eyebrow': 3, 'eyelash': 3}
    for key, (x, y, sz, k, im) in rect.items():
        src = bpy.path.abspath(im.filepath) if im is not None and im.filepath else ''
        if src and os.path.exists(src): img = Image.open(src).convert('RGBA')
        elif im is not None:  # image faite ici (pièces ajoutées) : lue dans Blender (lignes de bas en haut)
            img = Image.fromarray((np.array(im.pixels[:], np.float32).reshape(im.size[1], im.size[0], 4)[::-1] * 255).astype(np.uint8))
        else: img = Image.new('RGBA', (sz, sz), (128, 128, 128, 255))
        img = img.resize((sz, sz), Image.LANCZOS); px = np.asarray(img, np.float32) / 255
        c = px[..., :3]
        name = next((nm for nm, _ in spec['clothes'] if nm in key), None)
        if name and tint.get(name):  # teinte d'époque : la photo garde son tissage et ses plis, prend la couleur
            lum = c @ np.array([0.299, 0.587, 0.114], np.float32); m = lum.mean() + 1e-3
            c = np.clip(np.clip(lum / m, 0.15, 1.35)[..., None] * np.array(tint[name], np.float32) * 1.05, 0, 1)
        col[y:y + sz, x:x + sz] = c; alpha[y:y + sz, x:x + sz] = px[..., 3]; region[y:y + sz, x:x + sz] = REG.get(k, 2)

    # 4. Positions 3D de chaque texel (rasterisation des triangles dans l'espace UV, à la définition de l'atlas).
    R = AT; P3 = np.zeros((R, R, 3), np.float32); C3 = np.zeros((R, R), bool)
    for o in meshes:
        me = o.data; me.calc_loop_triangles(); uvl = me.uv_layers['UVMap'].data
        vco = np.empty(len(me.vertices) * 3, 'f'); me.vertices.foreach_get('co', vco); vco = vco.reshape(-1, 3)
        mw = np.array(o.matrix_world); vco = vco @ mw[:3, :3].T + mw[:3, 3]
        luv = np.empty(len(me.loops) * 2, 'f'); uvl.foreach_get('uv', luv); luv = luv.reshape(-1, 2)
        tl = np.empty(len(me.loop_triangles) * 3, 'i'); me.loop_triangles.foreach_get('loops', tl); tl = tl.reshape(-1, 3)
        tv = np.empty(len(me.loop_triangles) * 3, 'i'); me.loop_triangles.foreach_get('vertices', tv); tv = tv.reshape(-1, 3)
        P = luv[tl] * [R, R]; P[..., 1] = R - P[..., 1]
        for t in range(len(tl)):
            p = P[t]; x0, y0 = np.floor(p.min(0)).astype(int); x1, y1 = np.ceil(p.max(0)).astype(int)
            x0, y0 = max(x0 - 1, 0), max(y0 - 1, 0); x1, y1 = min(x1 + 1, R - 1), min(y1 + 1, R - 1)
            if x1 < x0 or y1 < y0: continue
            xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            (ax, ay), (bx, by), (cx, cy) = p; den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
            if abs(den) < 1e-9: continue
            w0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / den; w1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / den; w2 = 1 - w0 - w1
            ins = (w0 >= -0.05) & (w1 >= -0.05) & (w2 >= -0.05)  # un peu au-delà du bord : pas de liseré aux coutures
            if not ins.any(): continue
            W = np.stack([w0[ins], w1[ins], w2[ins]], 1); yy = (ys[ins] - 0.5).astype(int); xx = (xs[ins] - 0.5).astype(int)
            P3[yy, xx] = W @ vco[tv[t]]; C3[yy, xx] = True
    # Repères du visage (Blender : Z en haut, -Y devant).
    eyes = [o for o in meshes if kind_of(o) == 'low-poly'][0]
    ev = np.array([eyes.matrix_world @ v.co for v in eyes.data.vertices]); eyeL = ev[ev[:, 0] > 0].mean(0); eyeR = ev[ev[:, 0] < 0].mean(0)
    teeth = [o for o in meshes if kind_of(o) == 'teeth'][0]
    tv_ = np.array([teeth.matrix_world @ v.co for v in teeth.data.vertices]); mouth = np.array([0, tv_[:, 1].min(), tv_[:, 2].mean()])

    # 5. Zombification, peinte en 3D.
    def noise3(p, f, seed=0):  # bruit de valeur 3D lissé, en coordonnées du corps (mètres)
        q = p * f + seed * 17.13; i = np.floor(q); fr = q - i; fr = fr * fr * (3 - 2 * fr); out = 0
        for dz in (0, 1):
            for dy in (0, 1):
                for dx in (0, 1):
                    h = np.sin((i[..., 0] + dx) * 127.1 + (i[..., 1] + dy) * 311.7 + (i[..., 2] + dz) * 74.7 + seed) * 43758.5453; h -= np.floor(h)
                    out = out + h * np.where(dx, fr[..., 0], 1 - fr[..., 0]) * np.where(dy, fr[..., 1], 1 - fr[..., 1]) * np.where(dz, fr[..., 2], 1 - fr[..., 2])
        return out.astype(np.float32)
    def fbm(p, f, n=4, seed=0): return sum(noise3(p, f * 2 ** k, seed + k) * 0.5 ** k for k in range(n)) / (2 - 0.5 ** (n - 1))
    sstep = lambda a, b, x: np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))
    reg = region; X, Yf, Z = P3[..., 0], P3[..., 1], P3[..., 2]
    skin = (reg == 1) & C3; cloth = (reg == 2) & C3; hair = (reg == 3)
    lum = col @ np.array([0.299, 0.587, 0.114], np.float32)
    # Peau : grise et froide, à peine verdâtre, marbrée ; veines fines ; ecchymoses ; orbites creuses ; bouche en sang.
    n1 = fbm(P3, 5, 4, 1); n2 = fbm(P3, 20, 3, 2)
    dead = np.array([0.6, 0.66, 0.63], np.float32) if race != 'african' else np.array([0.52, 0.52, 0.5], np.float32)
    s = (lum[..., None] * 0.75 + col * 0.25) * dead * 1.25 + (0.07 if race == 'african' else 0.02)  # (peau sombre : traits encore lisibles)
    s *= (0.86 + 0.24 * n1)[..., None]
    bruise = sstep(0.6, 0.75, fbm(P3, 7, 3, 4)) * 0.5; s = s * (1 - bruise[..., None]) + np.array([0.3, 0.2, 0.27], np.float32) * bruise[..., None]
    rid = 1 - np.abs(2 * fbm(P3, 26, 3, 3) - 1); veins = sstep(0.9, 0.97, rid) * sstep(0.45, 0.6, fbm(P3, 4, 2, 13)) * sstep(0.85, 1.05, Z)  # haut du corps seulement (sur des jambes nues : on aurait dit des tatouages)
    s *= (1 - 0.4 * veins)[..., None] * (1 - (1 - np.array([0.75, 0.8, 0.95], np.float32)) * veins[..., None])
    for e in (eyeL, eyeR):
        d = np.linalg.norm((P3 - e) * [1, 1.6, 1.25], axis=-1); k = sstep(0.05, 0.012, d)
        s = s * (1 - 0.8 * k)[..., None] + np.array([0.28, 0.04, 0.03], np.float32) * (k * (1 - k) * 1.2)[..., None]
    front = Yf < mouth[1] + 0.04
    dm = np.linalg.norm((P3 - mouth) * [1, 1.5, 1.4], axis=-1)
    streak = sstep(0.5, 0.62, fbm(P3 * [1, 0.15, 0.08], 60, 2, 9)) * (Z < mouth[2]) * (Z > mouth[2] - 0.075 - 0.05 * fbm(P3, 30, 2, 4)) * (np.abs(X) < 0.055) * front
    blood_m = np.clip(sstep(0.042, 0.018, dm) + streak, 0, 1)
    # Plaies : morsures et chairs à vif, tirées au sort sur la peau (jamais sur le visage).
    wound = np.zeros(lum.shape, np.float32)
    sk_idx = np.argwhere(skin[::16, ::16]) * 16
    for _ in range(int(rng.integers(2, 5))):
        if not len(sk_idx): break
        cy, cx = sk_idx[rng.integers(len(sk_idx))]; c0 = P3[cy, cx]
        if c0[2] > eyeL[2] - 0.12: continue
        d = np.linalg.norm(P3 - c0, axis=-1); r = rng.uniform(0.025, 0.05)
        wound = np.maximum(wound, sstep(1.0, 0.55, d / (r * (0.6 + 0.8 * fbm(P3, 45, 3, 11)))))
    flesh = np.array([0.36, 0.05, 0.04], np.float32) * (0.65 + 0.5 * n2)[..., None]; rim = np.array([0.5, 0.36, 0.26], np.float32)
    w = wound[..., None]; s = s * (1 - w) + np.where(w > 0.6, flesh, rim * 0.7) * w
    b = blood_m[..., None] * 0.9; s = s * (1 - b) + np.array([0.24, 0.02, 0.02], np.float32) * b
    hands = sstep(0.95, 0.75, Z) * (np.abs(X) > 0.3)  # mains sales et ensanglantées
    s = s * (1 - 0.35 * hands)[..., None]
    col = np.where(skin[..., None], s, col)
    # Vêtements : boue qui monte du bas, crasse, sang séché (poitrine, coulures du col), accrocs sombres.
    c = col.copy(); g1 = fbm(P3, 8, 4, 6)
    mud = np.clip((0.5 - Z) * 2.4 + (fbm(P3, 5, 3, 5) - 0.5) * 1.3, 0, 1) * 0.6
    c = c * (1 - mud)[..., None] + np.array([0.23, 0.18, 0.12], np.float32) * mud[..., None]
    c *= (0.8 + 0.3 * g1)[..., None]
    chest = sstep(0.32, 0.05, np.linalg.norm((P3 - (mouth + [0, 0.0, -0.28])) * [1.1, 1.6, 0.55], axis=-1)) * front
    spl = sstep(0.42, 0.62, fbm(P3, 16, 3, 7)) * chest + sstep(0.72, 0.8, fbm(P3, 22, 3, 8)) * 0.8
    c = c * (1 - spl * 0.8)[..., None] + np.array([0.21, 0.03, 0.025], np.float32) * (spl * 0.8)[..., None]
    tear = sstep(0.76, 0.84, fbm(P3 * [1.6, 1.6, 0.5], 14, 3, 12))
    c = c * (1 - tear * 0.7)[..., None] + np.array([0.08, 0.05, 0.04], np.float32) * (tear * 0.7)[..., None]
    if spec.get('puttees'):  # bandes molletières : spirale kaki sur le bas du pantalon
        leg = (Z < 0.42) & (Z > 0.1); spiral = np.sin(Z * 150 + np.arctan2(Yf, np.abs(X) - 0.1) * 1.5) > 0
        pc = np.array([0.4, 0.36, 0.26], np.float32) * np.where(spiral, 1, 0.8)[..., None] * (0.82 + 0.25 * g1)[..., None]
        c = np.where((leg & cloth)[..., None], pc * (1 - mud * 0.6)[..., None], c)
    col = np.where(cloth[..., None], c, col)
    col = np.where(hair[..., None], col * 0.8, col)
    # Yeux : laiteux, jaunis (le jeu y ajoute leur lueur) ; dents jaunies.
    col = np.where((reg == 4)[..., None], (lum[..., None] * 0.35 + 0.5) * np.array([1, 0.93, 0.72], np.float32), col)
    col = np.where((reg == 5)[..., None], col * np.array([0.72, 0.6, 0.45], np.float32), col)

    # 6. Relief : détail fin de la couleur (trame, pores, plis), plaies creusées ; pas les grandes taches.
    from scipy import ndimage
    hgt = (col @ np.array([0.3, 0.59, 0.11], np.float32)); hgt = hgt - ndimage.gaussian_filter(hgt, 2.5)
    hgt = hgt - ndimage.gaussian_filter(wound, 3) * 0.25
    hs = ndimage.zoom(hgt, 0.5, order=1); k = np.where(ndimage.zoom((reg == 1).astype(np.float32), 0.5, order=0) > 0, 2.5, 3.5)
    gx = ndimage.sobel(hs, 1) * k; gy = ndimage.sobel(hs, 0) * k
    nn = np.stack([-gx, gy, np.ones_like(gx)], -1); nn /= np.linalg.norm(nn, axis=-1, keepdims=True)

    # 7. Un seul fichier GLB : maillage unique, squelette, et ses trois images en JPEG (couleur 2048, relief 1024,
    # découpe des cheveux et des cils 512, rangée dans la case « occlusion » du glTF ; le jeu la remet en découpe).
    os.makedirs(OUT, exist_ok=True); tag = os.path.join(OUT, cid); tmp = os.path.join(OUT, '_' + cid); os.makedirs(tmp, exist_ok=True)
    Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8)).save(tmp + '/c.jpg', quality=84, optimize=True, progressive=True)
    Image.fromarray(((nn + 1) * 127.5).astype(np.uint8)).save(tmp + '/n.jpg', quality=88, optimize=True)
    Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8)).resize((AT // 4, AT // 4), Image.LANCZOS).convert('RGB').save(tmp + '/a.jpg', quality=85, optimize=True)
    for o in bpy.data.objects: o.select_set(False)
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = base; bpy.ops.object.join()
    base.data.materials.clear(); base.name = cid
    mat = bpy.data.materials.new(cid); mat.use_nodes = True; nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.8; bsdf.inputs['Metallic'].default_value = 0.0
    tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = bpy.data.images.load(tmp + '/c.jpg'); nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(tmp + '/n.jpg'); tn.image.colorspace_settings.name = 'Non-Color'
    nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    ta = nt.nodes.new('ShaderNodeTexImage'); ta.image = bpy.data.images.load(tmp + '/a.jpg'); ta.image.colorspace_settings.name = 'Non-Color'
    ng = bpy.data.node_groups.get('glTF Material Output') or bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    if 'Occlusion' not in [i.name for i in ng.interface.items_tree]: ng.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    gn = nt.nodes.new('ShaderNodeGroup'); gn.node_tree = ng; nt.links.new(ta.outputs['Color'], gn.inputs['Occlusion'])
    base.data.materials.append(mat)
    base.data.calc_loop_triangles(); tris = len(base.data.loop_triangles)
    for o in bpy.data.objects: o.select_set(o in (base, rig))
    bpy.ops.export_scene.gltf(filepath=tag + '.glb', export_format='GLB', use_selection=True, export_skins=True, export_animations=False,
                              export_materials='EXPORT', export_image_format='AUTO', export_morph=False, export_all_influences=False)
    for f in ('c', 'n', 'a'): os.remove(f'{tmp}/{f}.jpg')
    os.rmdir(tmp)
    # Repères pour le jeu (Y en haut, +Z devant dans glTF) : yeux, haut du crâne.
    g = lambda v: [round(float(v[0]), 4), round(float(v[2]), 4), round(float(-v[1]), 4)]
    info = dict(era=spec['era'], brute=bool(spec.get('brute')), boss=bool(spec.get('boss')), tris=tris, eyes=[g(eyeL), g(eyeR)], top=round(float(head_top), 3),
                bytes=os.path.getsize(tag + '.glb'))
    json.dump(info, open(tag + '.json', 'w'))
    print('FAIT', cid, tris, 'triangles', info['bytes'], 'octets')


def bm_cut(obj, z):
    """Garde seulement le haut d'une sphère (bombe du casque)."""
    import bmesh
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if (obj.matrix_world @ v.co).z < z - 0.0], context='VERTS')
    bm.to_mesh(obj.data); bm.free()


def solid_image(name, col, rng):
    import bpy, numpy as np
    n = 64; im = bpy.data.images.new(name, n, n); a = np.ones((n, n, 4), np.float32)
    a[..., :3] = np.array(col, np.float32) * (0.85 + 0.3 * rng.random((n, n, 1)))
    im.pixels.foreach_set(a.ravel()); return im


if __name__ == '__main__':
    if '--one' in sys.argv: one(sys.argv[sys.argv.index('--one') + 1])
    else: main()
