#!/usr/bin/env python3
"""Importe un personnage tout fait (Meshy, Sketchfab, Objaverse…) comme infecté réaliste du jeu, dans ../../assets/zombies/.

Le jeu attend le même genre de fichier que make_zombies.py : un seul maillage, une seule matière (couleur, relief), et un
squelette aux noms du squelette « game_engine » de MakeHuman (root, pelvis, spine_01, spine_03, neck_01, head,
clavicle_l, upperarm_l, lowerarm_l, hand_l, thigh_l, calf_l, foot_l et leurs _r), que le reciblage de 09b_zreal.js
recopie depuis le squelette procédural. Les modèles téléchargés sont souvent figés (Meshy) ou montés sur un autre
squelette : on retire tout squelette d'origine et on en pose un neuf.

Étapes : assemblage des morceaux, orientation (de face, pieds au sol, 1,80 m), allègement, atlas d'une seule texture
couleur (plus le relief s'il y en a), articulations placées d'après la forme du corps (entrejambe, chevilles, épaules,
bout des bras : pose en T, en A ou bras le long du corps), poids automatiques de Blender (repli : os le plus proche pour
les sommets sans poids), repères des yeux pour leur lueur. Sortie : <id>.glb et <id>.json (fiche lue par
make_zombies.py --fiches ou ajoutée à manifest.json avec --manifeste), plus un aperçu de contrôle (--apercu).

usage : blender_env/bin/python import_modeles.py <fichier .glb|.gltf|.zip> <id> [--epoque 1957] [--brute]
        [--demi-tour] [--triangles 16000] [--hauteur 1.8] [--credit "Auteur (licence, lien)"] [--manifeste] [--apercu]
        [--sortie dossier] (essais hors de assets/zombies) [--textures dossier --prefixe début] (textures livrées à part)
        [--tex "Matière=couleur.png;relief.png"] [--peau Body|*] [--lustre 0.5] [--eras 1917,1880]
        [--nouveau-squelette] (ignorer le squelette d'origine) [--pose-actuelle [--image n]] (la pose livrée devient le repos)
        [--objet début du nom] (un seul personnage d'un fichier qui en contient plusieurs) [--quart-de-tour] (livré de profil)
        [--sans-decoupe] (alpha des couleurs ignoré) [--os "Bone=pelvis,Bone.002=spine_01,…"] (squelette d'origine aux os sans noms parlants : correspondance à la main)
Les modèles importés n'ont pas de lueur aux yeux (glow: false dans la fiche ; demande du propriétaire).
"""
import os, sys, json, math, zipfile, tempfile, io

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'zombies')


def arg(name, default=None, flag=False):
    if flag: return name in sys.argv
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def game_names(names):
    """Os d'un squelette connu → noms du squelette « game_engine » utilisés par le jeu (os non cités : gardés, ils
    suivent leur parent). Familles : Mixamo (mixamorig:Hips…), « biped » de 3ds Max (… Pelvis, LArmUpperarm…), noms
    courts (hips, L_arm, L_elbow…)."""
    import re
    base = {n: re.sub(r'^(mixamorig\d*:|base ?human|bip0?1 ?|bip |cc_base_)', '', n.strip().lower()).replace(' ', '') for n in names}
    low = set(base.values()); out = {}
    if 'waist' in low and 'hip' in low:  # Character Creator (CC_Base_Hip, Waist, Spine01, Spine02, NeckTwist01, L_Upperarm…)
        tab = {'hip': 'pelvis', 'waist': 'spine_01', 'spine02': 'spine_03', 'necktwist01': 'neck_01', 'jawroot': 'jaw'}
        for sd in 'lr':
            tab.update({sd + '_clavicle': 'clavicle_' + sd, sd + '_upperarm': 'upperarm_' + sd, sd + '_forearm': 'lowerarm_' + sd, sd + '_hand': 'hand_' + sd,
                        sd + '_thigh': 'thigh_' + sd, sd + '_calf': 'calf_' + sd, sd + '_foot': 'foot_' + sd})
        tab['head'] = 'head'
        for n, b in base.items():
            if b in tab and tab[b] not in out.values(): out[n] = tab[b]
        return out
    if 'ribcage' in low: tab = {'pelvis': 'pelvis', 'spine1': 'spine_01', 'ribcage': 'spine_03'}
    elif 'chest' in low: tab = {'hips': 'pelvis', 'spine': 'spine_01', 'chest': 'spine_03'}
    else: tab = {'hips': 'pelvis', 'spine': 'spine_01', 'spine2': 'spine_03'}
    tab.update({'neck': 'neck_01', 'head': 'head', 'jaw': 'jaw', 'headjaw': 'jaw'})
    for sd, S in (('l', 'left'), ('r', 'right')):
        for keys, g in (((S + 'shoulder', sd + '_shoulder', sd + 'armcollarbone'), 'clavicle_'), ((S + 'arm', sd + '_arm', sd + 'armupperarm'), 'upperarm_'),
                        ((S + 'forearm', sd + '_elbow', sd + 'armforearm'), 'lowerarm_'), ((S + 'hand', sd + '_wrist', sd + 'armpalm'), 'hand_'),
                        ((S + 'upleg', sd + '_leg', sd + 'thigh', sd + 'legthigh'), 'thigh_'), ((S + 'leg', sd + '_knee', sd + 'calf', sd + 'legcalf'), 'calf_'),
                        ((S + 'foot', sd + '_ankle', sd + 'foot', sd + 'legankle', sd + 'legfoot'), 'foot_')):
            for k in keys: tab[k] = g + sd
    for n, b in base.items():
        if b in tab and tab[b] not in out.values(): out[n] = tab[b]
    return out


def main():
    global OUT
    OUT = arg('--sortie', OUT)
    import bpy, numpy as np
    from mathutils import Vector, Matrix
    from PIL import Image
    src, cid = sys.argv[1], sys.argv[2]
    era, brute = arg('--epoque', '1957'), arg('--brute', flag=True)
    budget, H = int(arg('--triangles', 16000)), float(arg('--hauteur', 1.9 if brute else 1.8))
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)

    # 1. Lecture : glTF, FBX (binaire), OBJ, USD/USDZ, .blend, ou archive qui en contient un.
    if src.endswith('.zip'):
        tmp = tempfile.mkdtemp(); zipfile.ZipFile(src).extractall(tmp)
        cand = [os.path.join(d, f) for d, _, fs in os.walk(tmp) for f in fs if f.lower().endswith(('.gltf', '.glb', '.fbx', '.obj', '.usdz', '.usd', '.blend'))]
        src = min(cand, key=lambda f: ('@' in f or 'anim' in f.lower(), f.count(os.sep), f))  # (le modèle, pas un fichier d'animation)
    ext = src.lower().rsplit('.', 1)[-1]
    if ext in ('gltf', 'glb'): bpy.ops.import_scene.gltf(filepath=src)
    elif ext == 'fbx': bpy.ops.import_scene.fbx(filepath=src)
    elif ext == 'obj': bpy.ops.wm.obj_import(filepath=src)
    elif ext in ('usdz', 'usd', 'usdc', 'usda'): bpy.ops.wm.usd_import(filepath=src)
    elif ext == 'blend':
        with bpy.data.libraries.load(src) as (a_, b_): b_.objects = a_.objects
        for o in b_.objects:
            if o and o.type in ('MESH', 'ARMATURE'): bpy.context.collection.objects.link(o)
    # Squelette d'origine gardé quand ses os se reconnaissent (Mixamo, « biped » de 3ds Max, noms courts) : ses poids,
    # faits par un artiste, valent mieux que les nôtres (bras le long du corps surtout). Sinon (modèle figé, os
    # inconnus, --nouveau-squelette) : on en pose un plus bas.
    rigs = sorted([o for o in bpy.data.objects if o.type == 'ARMATURE'], key=lambda a: -len(a.data.bones))
    keep, REN = None, {}
    # --os "Bone=pelvis,Bone.002=spine_01,…" : correspondance donnée à la main (os sans noms parlants, reconnus à leur
    # place dans la hiérarchie).
    ren_of = lambda r: dict(kv.split('=') for kv in arg('--os').split(',')) if arg('--os') else game_names([b.name for b in r.data.bones])
    if rigs and not arg('--nouveau-squelette', flag=True):
        REN = ren_of(rigs[0])
        if len(REN) >= 19: keep = rigs[0]
        else: print('os reconnus :', len(REN), sorted(REN.values()), '— exemples :', [b.name for b in rigs[0].data.bones][:12])
    # (le cube de la scène par défaut de Blender, resté dans certains .blend, fausserait la taille)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and not (o.name.startswith('Cube') and len(o.data.vertices) <= 8)]
    if arg('--objet'):  # fichier à plusieurs personnages : garder celui-là (et son squelette)
        meshes = [o for o in meshes if o.name.startswith(arg('--objet'))]
        own = {m.object for o in meshes for m in o.modifiers if m.type == 'ARMATURE' and m.object} | {o.parent for o in meshes if o.parent and o.parent.type == 'ARMATURE'}
        rigs = sorted([r for r in rigs if r in own], key=lambda a: -len(a.data.bones))
        keep = rigs[0] if keep and rigs and len(ren_of(rigs[0])) >= 19 else None
        if keep: REN = ren_of(keep)
    if keep:
        meshes = [o for o in meshes if any(m.type == 'ARMATURE' and m.object == keep for m in o.modifiers)] or meshes
        if arg('--pose-actuelle', flag=True):
            # Repos du squelette faux dans le fichier (maillage déformé en vrac) : la pose livrée devient le repos (maillage
            # figé dans cette pose, puis squelette remis au repos sur elle).
            bpy.context.scene.frame_set(int(arg('--image', 1)))
            for o in meshes:
                for m in list(o.modifiers):
                    if m.type == 'ARMATURE' and m.object == keep:
                        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=m.name)
                        mm = o.modifiers.new('squelette', 'ARMATURE'); mm.object = keep
            keep.animation_data_clear()
            for o in bpy.data.objects: o.select_set(o is keep)
            bpy.context.view_layer.objects.active = keep; bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode='OBJECT')
        keep.animation_data_clear()
        for pb in keep.pose.bones: pb.matrix_basis.identity()
    print('squelette :', 'gardé (%d os reconnus sur %d)' % (len(REN), len(keep.data.bones)) if keep else 'nouveau')
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and o not in meshes]: bpy.data.objects.remove(o, do_unlink=True)
    # Pose de repos figée, formes appliquées, transformations appliquées (squelette compris s'il est gardé).
    bpy.context.view_layer.update()  # (objets d'un .blend : matrices monde pas encore calculées)
    for o in meshes:
        if o.data.users > 1: o.data = o.data.copy()  # (maillage partagé entre personnages : Blender refuserait d'y appliquer la rotation)
        for m in list(o.modifiers):
            if not (keep and m.type == 'ARMATURE'): o.modifiers.remove(m)
        if o.data.shape_keys: o.shape_key_clear()
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    if keep: mw = keep.matrix_world.copy(); keep.parent = None; keep.matrix_world = mw
    for o in [o for o in bpy.data.objects if o.type != 'MESH' and o is not keep]: bpy.data.objects.remove(o, do_unlink=True)
    for o in bpy.data.objects: o.select_set(o in meshes)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1: bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active; body.name = cid
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=1e-5)
    bpy.ops.object.mode_set(mode='OBJECT')
    def apply_rig(M=None):  # même transformation pour le squelette gardé, appliquée à ses os
        if not keep: return
        if M is not None: keep.matrix_world = M @ keep.matrix_world
        for o in bpy.data.objects: o.select_set(o is keep)
        bpy.context.view_layer.objects.active = keep; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        for m in body.modifiers:
            if m.type == 'ARMATURE': m.object = keep
        bpy.context.view_layer.objects.active = body
    apply_rig()

    def verts():
        a = np.empty(len(body.data.vertices) * 3, 'f'); body.data.vertices.foreach_get('co', a); return a.reshape(-1, 3)

    # 2. Orientation et taille : pieds au sol, 1,80 m, centré ; de face vers -Y (le +Z du glTF). Les pieds dépassent
    # vers l'avant des chevilles : s'ils pointent vers +Y, demi-tour (ou --demi-tour pour forcer).
    if arg('--quart-de-tour', flag=True):  # (modèle livré de profil, regard vers ±X)
        body.data.transform(Matrix.Rotation(math.pi / 2, 4, 'Z')); apply_rig(Matrix.Rotation(math.pi / 2, 4, 'Z'))
    V = verts(); lo, hi = V.min(0), V.max(0); s = H / (hi[2] - lo[2])
    T = Matrix.Scale(s, 4) @ Matrix.Translation(Vector((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])))
    body.data.transform(T); apply_rig(T); V = verts()
    feet = V[V[:, 2] < 0.035 * H]; shins = V[(V[:, 2] > 0.1 * H) & (V[:, 2] < 0.2 * H)]
    turn = feet[:, 1].mean() > shins[:, 1].mean()
    if arg('--demi-tour', flag=True): turn = not turn
    if turn: body.data.transform(Matrix.Rotation(math.pi, 4, 'Z')); apply_rig(Matrix.Rotation(math.pi, 4, 'Z')); V = verts()
    print('orientation :', 'demi-tour' if turn else 'telle quelle')

    # 3. Allègement.
    body.data.calc_loop_triangles(); n = len(body.data.loop_triangles)
    if n > budget:
        m = body.modifiers.new('allege', 'DECIMATE'); m.ratio = budget / n
        for o in bpy.data.objects: o.select_set(o is body)
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.modifier_move_to_index(modifier=m.name, index=0); bpy.ops.object.modifier_apply(modifier=m.name)
    body.data.calc_loop_triangles(); tris = len(body.data.loop_triangles); V = verts()
    print('triangles :', n, '→', tris)

    # 4. Atlas : une case par matière (couleur et relief), UV ramenées dans leur case.
    def img_of(mat, socket):
        if not mat or not mat.use_nodes: return None
        bs = next((nd for nd in mat.node_tree.nodes if nd.type == 'BSDF_PRINCIPLED'), None)
        if not bs: return None
        def up(s):
            for l in s.links:
                nd = l.from_node
                if nd.type == 'TEX_IMAGE': return nd.image
                for i in nd.inputs:
                    r = up(i)
                    if r: return r
            return None
        return up(bs.inputs[socket])
    # Textures livrées à part (OBJ sans .mtl) : --textures <dossier> --prefixe <début du nom> ; pour la matière M,
    # <prefixe>M_diffuse.png et <prefixe>M_normal.png.
    tdir, tpre = arg('--textures'), arg('--prefixe', '')
    def by_name(mat, kind):
        if not tdir or not mat: return None
        for ext_ in ('png', 'jpg', 'jpeg', 'tga'):
            f = os.path.join(tdir, '%s%s_%s.%s' % (tpre, mat.name.split('.')[0], kind, ext_))
            if os.path.exists(f): return bpy.data.images.load(f)
        return None
    # --tex "Matière=couleur.png[;relief.png]" (répétable) : textures imposées, la matière étant reconnue par le début
    # de son nom (fichiers cherchés dans --textures).
    TEX = {}
    for i_, a_ in enumerate(sys.argv):
        if a_ == '--tex': k_, v_ = sys.argv[i_ + 1].split('=', 1); TEX[k_] = v_.split(';')
    def forced(mat, k):
        if not mat: return None
        for pre_, fs_ in TEX.items():
            if mat.name.startswith(pre_) and len(fs_) > k and fs_[k]: return bpy.data.images.load(os.path.join(tdir or '.', fs_[k]))
        return None
    def found(im):  # image d'origine introuvable sur le disque : même nom dans --textures
        if im is None or im.packed_file or os.path.exists(bpy.path.abspath(im.filepath)): return im
        f = os.path.join(tdir or '.', os.path.basename(bpy.path.abspath(im.filepath).replace('\\', '/')))
        return bpy.data.images.load(f) if tdir and os.path.exists(f) else None
    def pil(im, size, fill, mode='RGB'):
        im = found(im)
        if im is None: return Image.new(mode, (size, size), fill if mode == 'RGB' else 255)
        if im.packed_file: p = Image.open(io.BytesIO(im.packed_file.data))
        else: p = Image.open(bpy.path.abspath(im.filepath))
        if mode == 'L': p = p.getchannel('A') if 'A' in p.getbands() else Image.new('L', p.size, 255)
        return p.convert(mode).resize((size, size), Image.LANCZOS)
    mats = list(body.data.materials); g = max(1, math.ceil(math.sqrt(len(mats)))); AT = 2048; cell = AT // g
    cells = []
    col = Image.new('RGB', (AT, AT)); nor = Image.new('RGB', (AT, AT), (128, 128, 255)); alp = Image.new('L', (AT, AT), 255); has_n = has_a = False
    for i, mat in enumerate(mats):
        cx, cy = (i % g) * cell, (i // g) * cell
        bc = mat.node_tree.nodes.get('Principled BSDF') if mat and mat.use_nodes else None
        base = tuple(int(255 * c) for c in (bc.inputs['Base Color'].default_value[:3] if bc else (0.5, 0.5, 0.5)))
        ci = forced(mat, 0) or found(img_of(mat, 'Base Color')) or by_name(mat, 'diffuse')
        col.paste(pil(ci, cell, base), (cx, cy))
        a_ = pil(ci, cell, 255, 'L')
        # (cheveux, cils : découpe ; --sans-decoupe quand la couche alpha des couleurs sert à autre chose, Mixamo par exemple)
        if np.asarray(a_).mean() < 250 and not arg('--sans-decoupe', flag=True): alp.paste(a_, (cx, cy)); has_a = True
        ni = forced(mat, 1) or found(img_of(mat, 'Normal')) or by_name(mat, 'normal')
        if ni: nor.paste(pil(ni, cell, (128, 128, 255)), (cx, cy)); has_n = True
        cells.append((mat.name if mat else '', cx, cy))
    uv = body.data.uv_layers.active or body.data.uv_layers.new(name='UVMap')
    a = np.empty(len(body.data.loops) * 2, 'f'); uv.data.foreach_get('uv', a); a = a.reshape(-1, 2)
    P = body.data.polygons; mi = np.empty(len(P), 'i'); P.foreach_get('material_index', mi)
    lt = np.empty(len(P), 'i'); P.foreach_get('loop_total', lt); lm = np.repeat(mi, lt)
    out_of = float(((a < -0.01) | (a > 1.01)).any(1).mean())
    if out_of > 0.02: print('attention : %.0f %% des UV hors de [0, 1] (texture répétée), ramenées dans la case' % (out_of * 100))
    for i in range(len(mats)):
        sel = lm == i; cx, cy = (i % g), (i // g); pad = 2 / AT
        u = np.clip(a[sel, 0] % 1.0000001, 0, 1); v = np.clip(a[sel, 1] % 1.0000001, 0, 1)
        a[sel, 0] = cx / g + pad + u * (1 / g - 2 * pad); a[sel, 1] = 1 - (cy / g + pad + (1 - v) * (1 / g - 2 * pad))
    uv.data.foreach_set('uv', a.ravel())
    # Peau : --peau <matières, séparées par des virgules, ou *> grisée, marbrée et froide comme nos infectés (le sang et
    # les plaies d'origine gardés) ; --lustre k : reflets peints dans la peau adoucis (k < 1).
    peau, lustre = arg('--peau'), float(arg('--lustre', 1))
    if peau or lustre < 1:
        A = np.asarray(col, np.float32) / 255; zone = np.zeros(A.shape[:2], bool)
        for nm_, cx_, cy_ in cells:
            if peau == '*' or (peau and any(nm_.startswith(x) for x in peau.split(','))) or (not peau): zone[cy_:cy_ + cell, cx_:cx_ + cell] = True
        mx, mn = A.max(-1), A.min(-1); sat = (mx - mn) / (mx + 1e-4)
        hue = np.where(mx == A[..., 0], ((A[..., 1] - A[..., 2]) / (mx - mn + 1e-4)) % 6, np.where(mx == A[..., 1], (A[..., 2] - A[..., 0]) / (mx - mn + 1e-4) + 2, (A[..., 0] - A[..., 1]) / (mx - mn + 1e-4) + 4)) * 60
        blood = (A[..., 0] > 1.7 * A[..., 1]) & (sat > 0.5)
        skin = zone & ~blood & (mx > 0.18) & (((hue < 50) | (hue > 340)) & (sat > 0.08) & (sat < 0.75))
        from scipy import ndimage
        m = ndimage.gaussian_filter(skin.astype(np.float32), 2)[..., None]
        if peau:
            yy, xx = np.mgrid[0:AT, 0:AT] / AT
            nz = sum(ndimage.zoom(np.random.default_rng(7 + k).random((4 * 2 ** k, 4 * 2 ** k)).astype(np.float32), AT / (4 * 2 ** k), order=1)[:AT, :AT] * 0.5 ** k for k in range(4)) / 1.875
            lum = A @ np.array([0.299, 0.587, 0.114], np.float32)
            z = (lum[..., None] * 0.75 + A * 0.25) * np.array([0.6, 0.66, 0.63], np.float32) * 1.25 + 0.02
            z *= (0.84 + 0.28 * nz)[..., None]
            br = np.clip((nz - 0.62) * 6, 0, 1)[..., None] * 0.45; z = z * (1 - br) + np.array([0.3, 0.2, 0.27], np.float32) * br
            A = A * (1 - m) + z * m
        if lustre < 1:
            v = A.max(-1, keepdims=True); k_ = np.where(v > 0.62, (0.62 + (v - 0.62) * lustre) / np.maximum(v, 1e-4), 1)
            A = A * (1 - m) + A * k_ * m
        col = Image.fromarray((np.clip(A, 0, 1) * 255).astype(np.uint8))
        print('peau : %.0f %% de l\'atlas ; matières :' % (skin.mean() * 100), [c[0] for c in cells])
    os.makedirs(OUT, exist_ok=True); tmpd = os.path.join(OUT, '_' + cid); os.makedirs(tmpd, exist_ok=True)
    col.save(tmpd + '/c.jpg', quality=82, optimize=True, progressive=True)
    if has_n: nor.resize((1024, 1024), Image.LANCZOS).save(tmpd + '/n.jpg', quality=88, optimize=True)
    if has_a: alp.resize((AT // 4, AT // 4), Image.LANCZOS).convert('RGB').save(tmpd + '/a.jpg', quality=85, optimize=True)
    body.data.materials.clear()
    mat = bpy.data.materials.new(cid); mat.use_nodes = True; nt = mat.node_tree; bs = nt.nodes['Principled BSDF']
    bs.inputs['Roughness'].default_value = 0.8; bs.inputs['Metallic'].default_value = 0
    tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = bpy.data.images.load(tmpd + '/c.jpg'); tc.image.pack(); nt.links.new(tc.outputs['Color'], bs.inputs['Base Color'])
    if has_n:
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(tmpd + '/n.jpg'); tn.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bs.inputs['Normal'])
    if has_a:  # découpe rangée dans la case « occlusion » du glTF, comme make_zombies.py (le jeu la remet en découpe)
        ta = nt.nodes.new('ShaderNodeTexImage'); ta.image = bpy.data.images.load(tmpd + '/a.jpg'); ta.image.colorspace_settings.name = 'Non-Color'
        ng = bpy.data.node_groups.get('glTF Material Output') or bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        if 'Occlusion' not in [i.name for i in ng.interface.items_tree]: ng.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
        gn = nt.nodes.new('ShaderNodeGroup'); gn.node_tree = ng; nt.links.new(ta.outputs['Color'], gn.inputs['Occlusion'])
    body.data.materials.append(mat)

    if keep:
        # Squelette gardé : os renommés comme le jeu les attend, un os « root » au-dessus du bassin (09b_zreal.js place
        # le bassin dans le repère de l'os racine).
        rig = keep; arm_d = keep.data
        for old, new in REN.items():
            if old != new: arm_d.bones[old].name = new
        bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
        eb = arm_d.edit_bones; tops = [b for b in eb if b.parent is None]
        if 'root' in eb and eb['root'] not in tops: eb['root'].name = 'root_ancien'
        r = eb.new('root'); r.head = (0, 0, 0); r.tail = (0, 0, 0.1 * H)
        for b in tops: b.parent = r
        eb['pelvis'].use_connect = False; eb['pelvis'].parent = r
        bpy.ops.object.mode_set(mode='OBJECT'); arm_d.bones['root'].use_deform = False
        miss = [n for n in ('pelvis', 'head', 'upperarm_l', 'thigh_r') if n not in body.vertex_groups]
        if miss: print('attention : groupes de sommets non renommés', miss)
        hip_y = float(np.array(arm_d.bones['pelvis'].head_local)[1])
        for o in bpy.data.objects: o.select_set(o in (body, rig))
        bpy.context.view_layer.objects.active = rig; bpy.ops.object.parent_set(type='OBJECT', keep_transform=True)
    else:
        # 5. Articulations d'après la forme (Blender : Z en haut, -Y devant, gauche du personnage en +X).
        def sl(z0, z1, xmin=-9, xmax=9):
            return V[(V[:, 2] >= z0 * H) & (V[:, 2] < z1 * H) & (V[:, 0] >= xmin * H) & (V[:, 0] <= xmax * H)]
        # Entrejambe : la plus haute coupe horizontale où aucun triangle ne traverse le milieu (x = 0) près du bassin
        # (jambes séparées) ; robe, capote, rien trouvé : 0,47.
        body.data.calc_loop_triangles(); TV = np.empty(len(body.data.loop_triangles) * 3, 'i'); body.data.loop_triangles.foreach_get('vertices', TV)
        TR = V[TV.reshape(-1, 3)]
        def crosses(z):
            a = TR[:, :, 2] - z; m = (a.min(1) < 0) & (a.max(1) > 0); t = TR[m]; az = a[m]; pts = []
            for i, j in ((0, 1), (1, 2), (2, 0)):
                e = (az[:, i] * az[:, j]) < 0; f = az[e, i] / (az[e, i] - az[e, j]); pts.append((np.flatnonzero(e), t[e, i] + (t[e, j] - t[e, i]) * f[:, None]))
            x0 = np.full(len(t), np.nan); x1 = np.full(len(t), np.nan)
            for idx, pp in pts:
                for k, q in zip(idx, pp):
                    if np.isnan(x0[k]): x0[k] = q[0]
                    else: x1[k] = q[0]
            ok = ~np.isnan(x1) & (np.abs(t[:, :, 0]).min(1) < 0.15 * H)
            return bool(((x0[ok] * x1[ok]) <= 0).any())
        crotch = None
        for z in np.arange(0.56, 0.30, -0.005):
            if not crosses(z * H): crotch = z; break
        crotch = 0.47 if crotch is None or crotch < 0.38 else crotch
        yc = lambda z0, z1: float(sl(z0, z1, -0.14, 0.14)[:, 1].mean())
        leg = lambda z0, z1, sgn: sl(z0, z1, *((0.005, 0.2) if sgn > 0 else (-0.2, -0.005))).mean(0)
        # Coupe horizontale à la hauteur z : morceaux séparés le long de x (intervalles occupés par les triangles coupés).
        def pieces(z):
            a = TR[:, :, 2] - z; m = (a.min(1) < 0) & (a.max(1) > 0); t = TR[m]; az = a[m]
            if not len(t): return []
            xs, ys = [], []
            for i, j in ((0, 1), (1, 2), (2, 0)):
                e = (az[:, i] * az[:, j]) < 0; f = az[e, i] / (az[e, i] - az[e, j]); q = t[e, i] + (t[e, j] - t[e, i]) * f[:, None]
                xs.append(q[:, 0]); ys.append(q[:, 1])
            X = np.concatenate(xs); Y = np.concatenate(ys); b = 0.006 * H
            o = np.argsort(X); X, Y = X[o], Y[o]; out = []; s0 = 0
            for k in range(1, len(X) + 1):
                if k == len(X) or X[k] - X[k - 1] > b: out.append((X[s0], X[k - 1], float(Y[s0:k].mean()))); s0 = k
            return out
        inner = {1: [], -1: []}  # (hauteur, bord intérieur du bras) le long du tracé
        def arm_path(sgn):
            pts = []; inner[sgn].clear(); miss = 0
            # Sous la poitrine (plus haut, un décolleté ou un vêtement coupe aussi le buste en deux) ; un bras est un morceau
            # étroit, loin du milieu, qui se déplace peu d'une tranche à l'autre ; on s'arrête quand il rejoint la hanche
            # (quelques tranches ratées tolérées).
            for z in np.arange(0.70, 0.30, -0.01):
                pc = pieces(z * H); ok = len(pc) >= 2
                if ok: out = pc[-1] if sgn > 0 else pc[0]; mid = (out[0] + out[1]) / 2; edge = out[0] if sgn > 0 else out[1]
                ok = ok and sgn * mid > 0.09 * H and out[1] - out[0] < 0.13 * H and (not pts or abs(mid - pts[-1][0]) < 0.035 * H)
                ok = ok and (not inner[sgn] or sgn * (edge - inner[sgn][-1][1]) > -0.02 * H)  # (le bord intérieur qui rentre : la main rejoint la cuisse)
                if not ok:
                    miss += 1
                    if pts and miss > 4: break
                    continue
                miss = 0; pts.append((mid, out[2], z * H)); inner[sgn].append((z * H, edge))
            return pts
        ARMS = {}  # bras suivis : (signe, bord intérieur par hauteur, bas de la main) pour séparer leurs poids du torse
        J = {}
        J['root'] = (Vector((0, yc(0.4, 0.6), 0)), Vector((0, yc(0.4, 0.6), 0.1 * H)))
        hip_y = yc(crotch, crotch + 0.06)
        J['pelvis'] = (Vector((0, hip_y, (crotch + 0.04) * H)), Vector((0, yc(0.58, 0.62), 0.6 * H)))
        J['spine_01'] = (J['pelvis'][1], Vector((0, yc(0.68, 0.72), 0.7 * H)))
        J['spine_03'] = (J['spine_01'][1], Vector((0, yc(0.82, 0.85), 0.835 * H)))
        J['neck_01'] = (J['spine_03'][1], Vector((0, yc(0.86, 0.88), 0.875 * H)))
        J['head'] = (J['neck_01'][1], Vector((0, yc(0.86, 0.88), 0.99 * H)))
        for side, sgn in (('l', 1), ('r', -1)):
            hp = leg(crotch - 0.08, crotch - 0.03, sgn); kn = leg(0.26, 0.30, sgn); an = leg(0.04, 0.07, sgn)
            ft = sl(0, 0.03, *((0, 0.25) if sgn > 0 else (-0.25, 0)))
            if not len(ft): print('pieds introuvables : sommets de', V.min(0).round(3), 'à', V.max(0).round(3), '; bas :', V[V[:, 2] < 0.03 * H][:8].round(3))
            toe = ft[np.argmin(ft[:, 1])]
            hipj = Vector((hp[0] * 0.95, hip_y, (crotch - 0.01) * H))
            J['thigh_' + side] = (hipj, Vector((kn[0], kn[1], 0.285 * H)))
            J['calf_' + side] = (J['thigh_' + side][1], Vector((an[0], an[1], 0.05 * H)))
            J['foot_' + side] = (J['calf_' + side][1], Vector((toe[0], toe[1], 0.015 * H)))
            # Bras. Bras en A ou le long du corps : suivi tranche par tranche, là où le bras est un morceau séparé du torse
            # (coupe horizontale : morceau le plus à l'extérieur) ; le coude et le poignet sont pris sur ce tracé. Bras en T
            # (aucune tranche ne les sépare sous les épaules) : bout le plus éloigné de l'épaule.
            sh = Vector((sgn * 0.1 * H, yc(0.78, 0.82), 0.815 * H))
            if arg('--debug', flag=True):
                for zz in (0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4):
                    print('coupe %.2f :' % zz, [(round(p_[0] / H, 3), round(p_[1] / H, 3)) for p_ in pieces(zz * H)])
                print('tracé', side, [(round(q[0] / H, 3), round(q[2] / H, 2)) for q in arm_path(sgn)])
            far = V[(V[:, 2] > 0.4 * H) & (V[:, 0] * sgn > 0.12 * H)]
            spread = len(far) and abs(far[np.argmax(np.linalg.norm(far - np.array(sh), axis=1)), 0]) > 0.25 * H  # bras écartés (T, A large)
            path = [] if spread else [q for q in arm_path(sgn) if (Vector(q) - sh).length < 0.42 * H]  # (au-delà, la main touche la cuisse : on suivrait la jambe)
            if len(path) >= 6:
                tip = Vector(path[-1]); tip.z -= 0.05 * H  # (la main dépasse sous la dernière tranche séparée)
                at = lambda f: Vector(min(path, key=lambda q: abs(q[2] - (sh.z + (tip.z - sh.z) * f))))
                el, wr = at(0.42), at(0.80)
                L = (tip - sh).length
            else:
                arm = V[(V[:, 2] > 0.4 * H) & (V[:, 0] * sgn > 0.12 * H)]
                if len(arm):
                    d = np.linalg.norm(arm - np.array(sh), axis=1); tip = Vector(arm[np.argmax(d)])
                    if (tip - sh).length < 0.3 * H: tip = sh + Vector((sgn * 0.05 * H, 0, -0.44 * H))
                else: tip = sh + Vector((sgn * 0.05 * H, 0, -0.44 * H))
                dv = (tip - sh); L = dv.length; dv.normalize()
                el = sh + dv * L * 0.39; wr = sh + dv * L * 0.74
            print('bras %s : %s (%d tranches)' % (side, 'suivi' if len(path) >= 6 else 'bout le plus loin', len(path)))
            if len(path) >= 6: ARMS[side] = (sgn, [q for q in inner[sgn] if q[0] >= path[-1][2] - 1e-6], tip.z)
            J['clavicle_' + side] = (Vector((sgn * 0.02 * H, sh.y, 0.82 * H)), sh)
            J['upperarm_' + side] = (sh, el); J['lowerarm_' + side] = (el, wr); J['hand_' + side] = (wr, tip)
        print('entrejambe %.2f ; bout des bras g/d %s / %s' % (crotch, tuple(round(v / H, 2) for v in J['hand_l'][1]), tuple(round(v / H, 2) for v in J['hand_r'][1])))
        PARENT = {'pelvis': 'root', 'spine_01': 'pelvis', 'spine_03': 'spine_01', 'neck_01': 'spine_03', 'head': 'neck_01'}
        for sd in 'lr':
            PARENT.update({'clavicle_' + sd: 'spine_03', 'upperarm_' + sd: 'clavicle_' + sd, 'lowerarm_' + sd: 'upperarm_' + sd, 'hand_' + sd: 'lowerarm_' + sd,
                           'thigh_' + sd: 'pelvis', 'calf_' + sd: 'thigh_' + sd, 'foot_' + sd: 'calf_' + sd})
        arm_d = bpy.data.armatures.new(cid + '_squelette'); rig = bpy.data.objects.new('squelette', arm_d); bpy.context.collection.objects.link(rig)
        bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
        for nme, (h, t) in J.items():
            eb = arm_d.edit_bones.new(nme); eb.head = h; eb.tail = t if (t - h).length > 1e-3 else h + Vector((0, 0, 0.05))
        for nme, p in PARENT.items(): arm_d.edit_bones[nme].parent = arm_d.edit_bones[p]
        bpy.ops.object.mode_set(mode='OBJECT')
        arm_d.bones['root'].use_deform = False

        # 6. Poids. Les poids automatiques de Blender (diffusion de chaleur) échouent sur les maillages en morceaux ou
        # troués : on les calcule sur une copie refaite en volume (maillage fermé et propre, voxels de 1 cm), puis on les
        # reporte sur le vrai maillage (sommet → face la plus proche de la copie). Repli : os le plus proche.
        proxy = body.copy(); proxy.data = body.data.copy(); proxy.name = 'copie_volume'; bpy.context.collection.objects.link(proxy)
        for o in bpy.data.objects: o.select_set(o is proxy)
        bpy.context.view_layer.objects.active = proxy
        rm = proxy.modifiers.new('volume', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.01 * H / 1.8; bpy.ops.object.modifier_apply(modifier=rm.name)
        dc = proxy.modifiers.new('allege', 'DECIMATE'); dc.ratio = min(1, 30000 / max(1, len(proxy.data.polygons))); bpy.ops.object.modifier_apply(modifier=dc.name)
        for o in bpy.data.objects: o.select_set(o in (proxy, rig))
        bpy.context.view_layer.objects.active = rig
        for o in (proxy, rig): o.scale = (10, 10, 10)  # (la diffusion de chaleur échoue à l'échelle du mètre : calcul à ×10)
        bpy.context.view_layer.update()
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        for o in (proxy, rig): o.scale = (1, 1, 1)
        proxy.parent = None; proxy.matrix_world = Matrix.Identity(4)  # (sinon la copie reste réduite par l'inverse du parent)
        bpy.context.view_layer.update()
        if arg('--debug', flag=True):
            cnt = {g.name: 0 for g in proxy.vertex_groups}
            for v in proxy.data.vertices:
                for e in v.groups:
                    if e.weight > 0.01: cnt[proxy.vertex_groups[e.group].name] += 1
            print('copie : %d sommets ; poids par os :' % len(proxy.data.vertices), cnt)
        for b in arm_d.bones:
            if b.use_deform and b.name not in body.vertex_groups: body.vertex_groups.new(name=b.name)
        for o in bpy.data.objects: o.select_set(o is body)
        bpy.context.view_layer.objects.active = body
        dt = body.modifiers.new('poids', 'DATA_TRANSFER'); dt.object = proxy; dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}
        dt.vert_mapping = 'POLYINTERP_NEAREST'; dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
        bpy.ops.object.modifier_apply(modifier=dt.name)
        if arg('--debug', flag=True):
            for nm_, ob_ in (('copie', proxy), ('corps', body)):
                acc = {}
                for v in ob_.data.vertices:
                    for e in v.groups:
                        if e.weight > 0.5: acc.setdefault(ob_.vertex_groups[e.group].name, []).append(v.co[:])
                print(nm_, {k: tuple(round(x, 2) for x in np.mean(v_, 0)) for k, v_ in acc.items() if k in ('upperarm_l', 'thigh_l', 'head', 'calf_r')})
        bpy.data.objects.remove(proxy, do_unlink=True)
        bpy.ops.object.vertex_group_limit_total(limit=4); bpy.ops.object.vertex_group_normalize_all(lock_active=False)
        for o in bpy.data.objects: o.select_set(o in (body, rig))
        bpy.context.view_layer.objects.active = rig
        bpy.ops.object.parent_set(type='ARMATURE')  # (lien au squelette, poids gardés)
        names = [b.name for b in arm_d.bones if b.use_deform]
        segs = {b.name: (np.array(b.head_local), np.array(b.tail_local)) for b in arm_d.bones if b.use_deform}
        orphan = [v.index for v in body.data.vertices if sum(e.weight for e in v.groups) < 1e-3]
        if orphan:
            Vo = verts()[orphan]; best = None; dist = np.full(len(orphan), 9e9)
            for nme, (a0, a1) in segs.items():
                ab = a1 - a0; t = np.clip(((Vo - a0) @ ab) / max(ab @ ab, 1e-9), 0, 1); d = np.linalg.norm(Vo - (a0 + t[:, None] * ab), axis=1)
                better = d < dist; dist[better] = d[better]; best = np.where(better, names.index(nme), best if best is not None else 0)
            for k, vi in enumerate(orphan): (body.vertex_groups.get(names[best[k]]) or body.vertex_groups.new(name=names[best[k]])).add([vi], 1.0, 'REPLACE')
        print('sommets sans poids après Blender :', len(orphan), 'sur', len(body.data.vertices))
        # Bras le long du corps : la copie en volume les soude aux hanches, la chaleur déborde. Sous l'épaule, un sommet
        # au-delà du bord intérieur du bras (coupe à sa hauteur) ne garde que les os du bras, les autres les perdent.
        if ARMS:
            Vb = verts(); gi = {g.name: g.index for g in body.vertex_groups}; fixed = 0
            def seg_d(p_, names_):  # distance d'un point au plus proche des os nommés
                out_ = 9e9
                for n_ in names_:
                    b_ = arm_d.bones[n_]; a0, a1 = np.array(b_.head_local), np.array(b_.tail_local); ab = a1 - a0
                    t_ = np.clip((p_ - a0) @ ab / max(ab @ ab, 1e-9), 0, 1); out_ = min(out_, float(np.linalg.norm(p_ - (a0 + t_ * ab))))
                return out_
            for side, (sgn, edge, zlow) in ARMS.items():
                armb = {gi[n] for n in ('upperarm_' + side, 'lowerarm_' + side, 'hand_' + side) if n in gi}
                zs = np.array([q[0] for q in edge]); xs = np.array([q[1] for q in edge]); o = np.argsort(zs); zs, xs = zs[o], xs[o]
                ztop = zs.max() - 0.03 * H
                for v in body.data.vertices:
                    z = Vb[v.index, 2]
                    if z > ztop or z < zlow - 0.02 * H: continue
                    xin = float(np.interp(z, zs, xs)); is_arm = sgn * Vb[v.index, 0] >= sgn * xin - 0.004 * H
                    if z < zs.min() + 0.01 * H:  # (main contre la cuisse : bras seulement nettement au-delà du bord)
                        is_arm = sgn * Vb[v.index, 0] >= sgn * xin + 0.012 * H
                    ws = [(e.group, e.weight) for e in v.groups]
                    keep = [(g, w) for g, w in ws if (g in armb) == is_arm and w > 1e-4]
                    if len(keep) == len([1 for _, w in ws if w > 1e-4]): continue
                    tot = sum(w for _, w in keep); fixed += 1
                    for g, w in ws: body.vertex_groups[g].remove([v.index])
                    if tot <= 1e-4:  # plus rien : os du bras le plus proche, ou le buste
                        keep = [(gi['lowerarm_' + side] if is_arm else gi['spine_01'], 1.0)]; tot = 1.0
                    for g, w in keep: body.vertex_groups[g].add([v.index], w / tot, 'REPLACE')
            print('bras séparés du corps :', fixed, 'sommets corrigés')
            # Bras soudés au corps dans le modèle (fréquent sur les modèles faits par IA) : sous l'aisselle, les faces qui
            # relient un sommet du bras à un sommet du corps s'étireraient en voile ; on les coupe.
            import bmesh
            armset = {gi[n] for sd in ARMS for n in ('upperarm_' + sd, 'lowerarm_' + sd, 'hand_' + sd) if n in gi}
            dom = np.zeros(len(body.data.vertices), bool)
            for v in body.data.vertices:
                if v.groups: dom[v.index] = max(v.groups, key=lambda e: e.weight).group in armset
            zcut = min(np.array([q[0] for q in ed]).max() for _, ed, _ in ARMS.values()) - 0.03 * H  # (sous l'aisselle : seules les soudures mêlent bras et corps)
            bm = bmesh.new(); bm.from_mesh(body.data)
            cut = [f for f in bm.faces if all(Vb[v.index, 2] < zcut for v in f.verts) and len({dom[v.index] for v in f.verts}) > 1]
            bmesh.ops.delete(bm, geom=cut, context='FACES_ONLY'); bm.to_mesh(body.data); bm.free()
            print('faces de jonction bras-corps coupées :', len(cut))

    # 7. Yeux : profil du visage au milieu (avant le plus avancé par tranche de hauteur) ; le bout du nez est le point le
    # plus avancé entre 88,5 et 93,5 % de la taille (au-dessus, la visière d'un casque avancerait plus) ; les yeux sont
    # 3,6 cm plus haut et 2,5 cm plus en arrière, écartés de 3,2 cm du milieu.
    prof = []
    for z in np.arange(0.885, 0.935, 0.003):
        t = V[(np.abs(V[:, 2] - z * H) < 0.003 * H) & (np.abs(V[:, 0]) < 0.012 * H)]
        if len(t): prof.append((float(t[:, 1].min()), z * H))
    ny, nz = min(prof) if prof else (hip_y - 0.06 * H, 0.91 * H)
    ze, ye = nz + 0.02 * H, ny + 0.014 * H
    eyes = [(0.018 * H, ye, ze), (-0.018 * H, ye, ze)]
    print('nez à %.3f m (avance %.3f) ; yeux à %.3f m' % (nz, -ny, ze))
    gl = lambda v: [round(float(v[0]), 4), round(float(v[2]), 4), round(float(-v[1]), 4)]

    # 8. Export.
    tag = os.path.join(OUT, cid)
    for o in bpy.data.objects: o.select_set(o in (body, rig))
    bpy.ops.export_scene.gltf(filepath=tag + '.glb', export_format='GLB', use_selection=True, export_skins=True, export_animations=False,
                              export_materials='EXPORT', export_image_format='AUTO', export_morph=False, export_all_influences=False)
    for f in ('c', 'n', 'a'):
        if os.path.exists(f'{tmpd}/{f}.jpg'): os.remove(f'{tmpd}/{f}.jpg')
    os.rmdir(tmpd)
    eras = arg('--eras')  # (modèle partagé entre plusieurs cartes : --eras 1917,1880)
    info = dict(era=era, **({'eras': eras.split(',')} if eras else {}), glow=False, brute=brute, boss=False, tris=tris, eyes=[gl(e) for e in eyes], top=round(H, 3), bytes=os.path.getsize(tag + '.glb'),
                source=os.path.basename(sys.argv[1]), credit=arg('--credit', ''))
    json.dump(info, open(tag + '.json', 'w'))
    if arg('--manifeste', flag=True):
        mp = os.path.join(OUT, 'manifest.json'); man = json.load(open(mp)); man['chars'][cid] = info
        man['chars'] = {k: man['chars'][k] for k in sorted(man['chars'])}; json.dump(man, open(mp, 'w'), indent=1); os.remove(tag + '.json')
    print('FAIT', cid, tris, 'triangles', info['bytes'], 'octets')

    # 9. Aperçu de contrôle : de face au repos, puis bras tendus devant et genou plié (les poids se voient).
    if arg('--apercu', flag=True): apercu(bpy, rig, body, H, tag + '_apercu.png')


def apercu(bpy, rig, body, H, path):
    from mathutils import Vector, Euler
    import numpy as np
    from PIL import Image
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 8; sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 300, 420; sc.render.film_transparent = False
    sc.world = sc.world or bpy.data.worlds.new('w'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.2
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.collection.objects.link(cam); sc.camera = cam
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3; sun.rotation_euler = (0.8, 0.2, 0.3); bpy.context.collection.objects.link(sun)
    shots = []
    for k, (yaw, pose) in enumerate(((0, False), (0, True), (1.2, True))):
        pb = rig.pose.bones
        for b in pb: b.rotation_mode = 'XYZ'; b.rotation_euler = (0, 0, 0)
        if pose:  # bras tendus devant (rotation vers -Y), avant-bras fléchis, genou gauche plié
            for sd, sg in (('l', 1), ('r', -1)):
                ua = pb['upperarm_' + sd]; m = ua.bone.matrix_local.to_3x3(); tgt = Vector((0, -1, 0))
                cur = (rig.data.bones['lowerarm_' + sd].head_local - ua.bone.head_local).normalized(); q = cur.rotation_difference(tgt)  # (direction réelle du bras, quel que soit l'axe de l'os)
                ua.rotation_mode = 'QUATERNION'; ua.rotation_quaternion = m.inverted().to_quaternion() @ q @ m.to_quaternion()  # (repère de l'os)
            pb['calf_l'].rotation_euler = (0.9, 0, 0)
        bpy.context.view_layer.update()
        if '--debug' in sys.argv:
            ev = body.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh(); import numpy as _n
            c = _n.array([v.co[:] for v in ev.vertices]); print('pose', k, 'étendue', c.min(0).round(2), c.max(0).round(2), 'modifs', [m.type for m in body.modifiers], 'parent', body.parent and body.parent.name,
                  'ua_l', [round(x, 2) for x in pb['upperarm_l'].matrix.to_translation()], [round(x, 2) for x in pb['upperarm_l'].rotation_quaternion] if pb['upperarm_l'].rotation_mode == 'QUATERNION' else '')
        d = 3.2; cam.location = (math.sin(yaw) * d, -math.cos(yaw) * d, 0.55 * H); cam.rotation_euler = (math.radians(88), 0, yaw)
        sc.render.filepath = path.replace('.png', '_%d.png' % k); bpy.ops.render.render(write_still=True); shots.append(sc.render.filepath)
    ims = [Image.open(p) for p in shots]; o = Image.new('RGB', (300 * len(ims), 420))
    for i, im in enumerate(ims): o.paste(im.convert('RGB'), (300 * i, 0)); os.remove(shots[i])
    o.save(path); print('aperçu :', path)


if __name__ == '__main__':
    main()
