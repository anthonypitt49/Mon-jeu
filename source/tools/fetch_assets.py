#!/usr/bin/env python3
"""Télécharge et prépare les textures photo et l'éclairage (HDRI) d'une carte.

Toutes les ressources sont sous licence CC0 (Poly Haven) : libres, sans attribution obligatoire.
Usage : python3 tools/fetch_assets.py poste7   (depuis source/ ; écrit ../assets/<carte>/)
        python3 tools/fetch_assets.py cite --petit   (refait seulement les versions allégées, sans rien télécharger)
Chaque image existe en deux tailles : 1024 px, et une version allégée « _s » (512 px, rugosité 256) pour la qualité
« bas » (téléphones) : quatre fois moins de mémoire vidéo.
Outils : pip install pillow numpy opencv-python-headless
"""
import io, json, os, sys, urllib.request
import numpy as np
from PIL import Image

# Pour chaque matière : identifiant Poly Haven, taille réelle couverte par la texture (mètres),
# cartes à garder (c = couleur, n = relief « normal », r = rugosité) et définition (pixels).
SETS = {
    'poste7': {
        'planks':   {'id': 'weathered_brown_planks', 'maps': 'cnr', 'px': 1024},
        'mudwall':  {'id': 'brown_mud_02',           'maps': 'cnr', 'px': 1024},
        'mudfloor': {'id': 'brown_mud_03',           'maps': 'cnr', 'px': 1024},
        'snow':     {'id': 'snow_02',                'maps': 'cn',  'px': 1024},
        'burlap':   {'id': 'hessian_380',            'maps': 'cn',  'px': 1024, 'dirty': 'mudwall'},
        'tin':      {'id': 'worn_corrugated_iron',   'maps': 'cnr', 'px': 1024},
        'concrete': {'id': 'concrete_wall_003',      'maps': 'cnr', 'px': 1024},
    },
    # Cité Atomique (1957, village témoin d'un site d'essais) : pavillons à clins peints, bardeaux d'asphalte,
    # route fissurée, trottoirs en dalles, gazon, lac asséché du désert (terre craquelée), mesas striées.
    'cite': {
        'asphalt':  {'id': 'asphalt_02',               'maps': 'cnr', 'px': 1024},
        'sidewalk': {'id': 'concrete_pavement',        'maps': 'cnr', 'px': 1024},
        'grass':    {'id': 'leafy_grass',              'maps': 'cnr', 'px': 1024},
        'desert':   {'id': 'dry_ground_01',            'maps': 'cnr', 'px': 1024},
        'shingle':  {'id': 'grey_roof_01',             'maps': 'cnr', 'px': 1024},
        'brick':    {'id': 'brick_wall_02',            'maps': 'cnr', 'px': 1024},
        'plaster':  {'id': 'painted_plaster_wall',     'maps': 'cnr', 'px': 1024},
        'parquet':  {'id': 'old_wooden_floor_01',      'maps': 'cnr', 'px': 1024},
        'checker':  {'id': 'checkered_pavement_tiles', 'maps': 'cnr', 'px': 1024},
        'garage':   {'id': 'garage_floor',             'maps': 'cnr', 'px': 1024},
        'tiles':    {'id': 'long_white_tiles',         'maps': 'cnr', 'px': 1024},
        'concrete': {'id': 'concrete_wall_008',        'maps': 'cnr', 'px': 1024},
        'wood':     {'id': 'oak_wood_planks',          'maps': 'cnr', 'px': 1024},
        'rock':     {'id': 'cliff_side',               'maps': 'cnr', 'px': 1024},
        'paper':    {'id': 'decrepit_wallpaper',       'maps': 'nr',  'px': 1024},  # relief seul, sous le motif dessiné
    },
    # Le Pénitencier (1933, île-prison sous l'orage) : maçonnerie de moellons, béton crasseux, carrelage des douches,
    # peinture écaillée des cellules, quais en planches lavées par le sel, rochers du rivage.
    'penitencier': {
        'stone':    {'id': 'rough_block_wall',         'maps': 'cnr', 'px': 1024},
        'rock':     {'id': 'lichen_rock',              'maps': 'cnr', 'px': 1024},
        'floor':    {'id': 'dirty_concrete',           'maps': 'cnr', 'px': 1024},
        'tiles':    {'id': 'long_white_tiles',         'maps': 'cnr', 'px': 1024},
        'pier':     {'id': 'weathered_planks',         'maps': 'cnr', 'px': 1024},
        'panel':    {'id': 'old_planks_02',            'maps': 'cnr', 'px': 1024},
        'parquet':  {'id': 'old_wooden_floor_01',      'maps': 'cnr', 'px': 1024},
        'plaster':  {'id': 'painted_plaster_wall',     'maps': 'cnr', 'px': 1024},
        'paint':    {'id': 'painted_concrete',         'maps': 'nr',  'px': 1024},  # relief de peinture écaillée, sous les deux tons
        'concrete': {'id': 'concrete_wall_006',        'maps': 'cnr', 'px': 1024},
    },
    # Le Filon Maudit (1880, ville minière engloutie) : planches verticales délavées, trottoirs de bois, terre battue,
    # roche striée de la caverne, brique de la banque, parquet usé du saloon, bardeaux de bois.
    'filon': {
        'boards':   {'id': 'old_planks_02',            'maps': 'cnr', 'px': 1024},
        'dirt':     {'id': 'dirt_floor',               'maps': 'cnr', 'px': 1024},
        'rock':     {'id': 'cliff_side',               'maps': 'cnr', 'px': 1024},
        'walk':     {'id': 'weathered_brown_planks',   'maps': 'cnr', 'px': 1024},
        'floor':    {'id': 'old_wood_floor',           'maps': 'cnr', 'px': 1024},
        'brick':    {'id': 'brick_wall_02',            'maps': 'cnr', 'px': 1024},
        'plaster':  {'id': 'painted_plaster_wall',     'maps': 'cnr', 'px': 1024},
        'checker':  {'id': 'checkered_pavement_tiles', 'maps': 'cnr', 'px': 1024},
        'shingle':  {'id': 'roof_slates_02',           'maps': 'cnr', 'px': 1024},
        'stone':    {'id': 'rough_block_wall',         'maps': 'cnr', 'px': 1024},
        'paper':    {'id': 'decrepit_wallpaper',       'maps': 'nr',  'px': 1024},  # relief seul, sous le damas dessiné
    },
}
# Objets (meubles, véhicules, machines, accessoires) : photos communes aux quatre cartes, dans ../assets/objets/,
# chargées seulement pour les familles présentes sur la carte (PHOTO_SETS de 05p_photo.js). 512 px suffisent :
# un objet occupe peu de place à l'écran. gray : photo sans sa couleur (le jeu garde la teinte de chaque objet) ;
# renorm : carte de relief décentrée chez Poly Haven, recentrée ; diffuse : clé de la couleur quand ce n'est pas Diffuse.
SETS['objets'] = {
    'laine':     {'id': 'poly_wool_herringbone',     'maps': 'cnr', 'px': 512, 'gray': True},   # tweed d'ameublement, couvertures
    'velours':   {'id': 'velour_velvet',             'maps': 'nr',  'px': 512},                 # banquettes et rideaux du saloon
    'lin':       {'id': 'rough_linen',               'maps': 'cnr', 'px': 512, 'gray': True},   # toile : bâches, entoilage du biplan
    'cuir':      {'id': 'brown_leather',             'maps': 'cnr', 'px': 512},
    'skai':      {'id': 'leather_red_02',            'maps': 'nr',  'px': 512},                 # sellerie auto des années 50 (grain)
    'teck':      {'id': 'teak_veneer',               'maps': 'cnr', 'px': 512},                 # mobilier 1957
    'chene':     {'id': 'oak_veneer_01',             'maps': 'cnr', 'px': 512},                 # mobilier d'institution 1933
    'noyer':     {'id': 'black_walnut_veneer_02',    'maps': 'cnr', 'px': 512},                 # mobilier 1880
    'caisse':    {'id': 'wood_shutter',              'maps': 'cn',  'px': 512, 'sat': 0.55},    # caisses, tonneaux, barricades : bois brut usé
    'boispeint': {'id': 'distressed_painted_planks', 'maps': 'cnr', 'px': 512, 'gray': True},   # portes, volets, niche
    'peinture':  {'id': 'rusty_metal_02',            'maps': 'cnr', 'px': 512, 'gray': True, 'contrast': 0.4, 'renorm': True},  # tôle peinte, carrosseries
    'emaille':   {'id': 'beige_wall_001',            'maps': 'n',   'px': 512},                 # émail, porcelaine : ondulation seule
    'rouille':   {'id': 'rusty_metal_04',            'maps': 'cnr', 'px': 512},                 # épaves calcinées, fûts, fonte (relief)
    'acier':     {'id': 'rusty_metal_sheet',         'maps': 'cr',  'px': 512},
    'galva':     {'id': 'corrugated_iron',           'maps': 'cnr', 'px': 512},                 # poubelles en tôle galvanisée
    'olive':     {'id': 'green_metal_rust',          'maps': 'c',   'px': 512, 'gray': True},   # matériel militaire peint
    'ecorce':    {'id': 'bark_willow_02',            'maps': 'cnr', 'px': 512},
}

# Éclairage d'ambiance : Poste 7, nuit couverte ; Cité, coucher de soleil sur un désert ; Pénitencier, nuit brumeuse ;
# Filon, caverne de roche rousse.
HDRI = {'poste7': 'kloppenheim_07', 'cite': 'rogland_sunset', 'penitencier': 'kloppenheim_04', 'filon': 'drachenfels_cellar'}
KEYS = {'c': 'Diffuse', 'n': 'nor_gl', 'r': 'Rough'}  # relief au format OpenGL, celui de three.js
QUAL = {'c': 80, 'n': 88, 'r': 80}

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'snowfall-protocol-assets'})
    with urllib.request.urlopen(req, timeout=120) as r: return r.read()

def api(path): return json.loads(get('https://api.polyhaven.com/' + path))

def luminance(img):
    a = np.asarray(img.convert('RGB').resize((64, 64)), dtype=np.float32) / 255.0
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    return float((lin @ np.array([0.2126, 0.7152, 0.0722])).mean())

def dirty(out, key, mud_key):
    """Toile de sac de tranchée : trame accentuée, taches de boue (prises sur la photo de boue), fibres usées."""
    import cv2
    c = cv2.imread(os.path.join(out, f'{key}_c.jpg')).astype(np.float32) / 255
    mud = cv2.resize(cv2.imread(os.path.join(out, f'{mud_key}_c.jpg')), c.shape[1::-1]).astype(np.float32) / 255
    hp = c - cv2.GaussianBlur(c, (0, 0), 3)                       # trame : on double son contraste
    c = np.clip(c + hp * 1.6, 0, 1)
    g = cv2.cvtColor(c, cv2.COLOR_BGR2GRAY)[..., None]; c = c * 0.75 + g * 0.25   # un peu délavée
    rng = np.random.default_rng(1917); n = np.zeros(c.shape[:2], np.float32)
    H, W = c.shape[:2]
    for s, a in ((260, 0.45), (95, 0.6), (40, 0.4), (16, 0.2)):                # taches à plusieurs échelles, raccordables (bruit périodique)
        k = max(2, H // s); r = rng.random((k, k)).astype(np.float32)
        n += a * cv2.resize(np.tile(r, (3, 3)), (3 * W, 3 * H), interpolation=cv2.INTER_CUBIC)[H:2 * H, W:2 * W]
    n = (n - n.min()) / (n.max() - n.min()); m = np.clip((n - 0.52) / 0.22, 0, 1)[..., None]
    c = c * (1 - 0.7 * m) + mud * 1.4 * 0.7 * m                    # boue séchée sur la toile
    c = c * (0.82 + 0.18 * (1 - m))
    cv2.imwrite(os.path.join(out, f'{key}_c.jpg'), np.clip(c * 255, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 82])
    nm = cv2.imread(os.path.join(out, f'{key}_n.jpg')).astype(np.float32) / 127.5 - 1  # relief de la trame plus franc
    nm[..., 1:] *= 1.8; nm /= np.linalg.norm(nm, axis=2, keepdims=True)
    cv2.imwrite(os.path.join(out, f'{key}_n.jpg'), cv2.resize(((nm + 1) * 127.5).astype(np.uint8), (512, 512), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88])
    return round(luminance(Image.open(os.path.join(out, f'{key}_c.jpg'))), 4)

def gray(img, contrast=1.0):
    """Photo sans sa couleur (tissu, peinture) : le jeu garde la teinte de chaque objet et prend la trame, l'usure,
    les taches. Luminosité ramenée autour de 0,7 (en sRGB) pour que la teinte du jeu reste lisible."""
    a = np.asarray(img.convert('L'), dtype=np.float32)
    a = a.mean() + (a - a.mean()) * contrast  # contrast < 1 : usure plus discrète (peinture d'un village neuf)
    a = np.clip(a * (178.0 / max(1.0, a.mean())), 0, 255).astype(np.uint8)
    return Image.fromarray(a).convert('RGB')

def desat(img, sat):
    """Couleur ramenée vers le gris (sat = part de couleur gardée) : bois neuf trop orangé → bois usé, grisé."""
    a = np.asarray(img.convert('RGB'), dtype=np.float32); g = a @ np.array([0.299, 0.587, 0.114], np.float32)
    return Image.fromarray(np.clip(g[..., None] + (a - g[..., None]) * sat, 0, 255).astype(np.uint8))

def renorm(img):
    """Carte de relief dont la moyenne n'est pas la normale droite (128, 128) : toute la surface penchait."""
    a = np.asarray(img, dtype=np.float32) / 127.5 - 1
    a[..., :2] -= a[..., :2].mean(axis=(0, 1)); a[..., 2] = np.sqrt(np.clip(1 - (a[..., :2] ** 2).sum(axis=2), 0.05, 1))
    return Image.fromarray(np.clip((a + 1) * 127.5, 0, 255).astype(np.uint8))

def small(out, manifest):
    """Versions allégées pour la qualité « bas » : couleur 512 px, relief 512 px, rugosité 256 px."""
    for key, e in manifest.items():
        if key == 'env': continue
        for m in e['maps']:
            img = Image.open(os.path.join(out, f'{key}_{m}.jpg'))
            px = max(128, img.size[0] // 2)  # moitié de la définition (1024 → 512, rugosité 512 → 256)
            if img.size[0] > px: img = img.resize((px, px), Image.LANCZOS)
            img.save(os.path.join(out, f'{key}_{m}_s.jpg'), quality=QUAL[m] - 4, optimize=True, progressive=True)
        e['s'] = 1

def main(map_id, petit=False):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', map_id)
    os.makedirs(out, exist_ok=True)
    if petit:
        manifest = json.load(open(os.path.join(out, 'manifest.json'))); small(out, manifest)
        json.dump(manifest, open(os.path.join(out, 'manifest.json'), 'w'), indent=1); print('versions allégées', map_id); return
    info = api('assets?t=textures')
    manifest, credits = {}, []
    for key, s in SETS[map_id].items():
        files, meta = api('files/' + s['id']), info[s['id']]
        entry = {'m': round(meta['dimensions'][0] / 1000, 3), 'maps': s['maps']}
        for m in s['maps']:
            img = Image.open(io.BytesIO(get(files[KEYS[m]]['1k']['jpg']['url'])))
            img = img.convert('L' if m == 'r' else 'RGB')
            px = s['px'] if m != 'r' else min(512, s['px'])
            if img.size[0] != px: img = img.resize((px, px), Image.LANCZOS)
            if m == 'c' and s.get('gray'): img = gray(img, s.get('contrast', 1.0))
            if m == 'c' and 'sat' in s: img = desat(img, s['sat'])
            if m == 'n' and s.get('renorm'): img = renorm(img)
            img.save(os.path.join(out, f'{key}_{m}.jpg'), quality=QUAL[m], optimize=True, progressive=True)
            if m == 'c': entry['lum'] = round(luminance(img), 4)
            elif 'c' not in s['maps'] and m == 'n': entry['lum'] = 0.5
            if m == 'r': entry['rm'] = round(float(np.asarray(img, dtype=np.float32).mean() / 255), 3)  # rugosité moyenne
        if s.get('dirty'): entry['lum'] = dirty(out, key, s['dirty'])
        manifest[key] = entry
        credits.append(f"| `{key}` | [{meta['name']}](https://polyhaven.com/a/{s['id']}) | {', '.join(meta.get('authors', {}).keys())} |")
        print(key, entry)
    if map_id in HDRI:  # (objets : pas d'éclairage, seulement des matières communes aux quatre cartes)
        import cv2
        hid = HDRI[map_id]
        raw = get(api('files/' + hid)['hdri']['1k']['hdr']['url'])
        tmp = os.path.join(out, '_tmp.hdr'); open(tmp, 'wb').write(raw)
        hdr = cv2.imread(tmp, cv2.IMREAD_ANYDEPTH | cv2.IMREAD_COLOR); os.remove(tmp)
        W, H = 256, 128  # l'éclairage d'ambiance n'a pas besoin de plus
        rgb = cv2.resize(hdr, (W, H), interpolation=cv2.INTER_AREA)[..., ::-1].astype(np.float32)
        aligned = {}
        if map_id != 'poste7':  # (Poste 7 : ciel couvert sans soleil, réglé avant ; inchangé)
            # Le soleil photographié est écrêté (le jeu a déjà sa lumière directionnelle : sinon, deux soleils) et sa
            # direction notée (az, colonne de l'image) : le jeu tourne le ciel pour la faire coïncider avec la sienne.
            lum0 = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
            wl = np.cos((np.arange(H) + 0.5) / H * np.pi - np.pi / 2)[:, None]
            blur = cv2.GaussianBlur(lum0, (0, 0), 3)[: H // 2 + 4]  # au-dessus de l'horizon
            aligned['az'] = round(float((np.unravel_index(np.argmax(blur), blur.shape)[1] + 0.5) / W), 4)
            cap = 12 * float((lum0 * wl).sum() / (wl.sum() * W))
            rgb *= np.minimum(1.0, cap / np.maximum(lum0, 1e-9))[..., None]
        # Format RGBE (3 octets de couleur + 1 d'exposant, comme un .hdr) dans un JSON : servi partout, y compris sur claude.ai.
        mx = np.maximum(rgb.max(axis=2), 1e-32); e = np.floor(np.log2(mx)) + 1; sc = 256.0 / np.exp2(e)
        rgbe = np.zeros((H, W, 4), np.uint8); rgbe[..., :3] = np.clip(rgb * sc[..., None], 0, 255).astype(np.uint8); rgbe[..., 3] = np.clip(e + 128, 0, 255)
        rgbe[mx < 1e-32] = 0
        import base64
        json.dump({'w': W, 'h': H, 'rgbe': base64.b64encode(rgbe.tobytes()).decode()}, open(os.path.join(out, 'env.json'), 'w'))
        w = np.cos((np.arange(H) + 0.5) / H * np.pi - np.pi / 2)[:, None]  # moyenne pondérée par l'aire
        manifest['env'] = {'lum': round(float(((rgb @ np.array([0.2126, 0.7152, 0.0722])) * w).sum() / (w.sum() * W)), 5), **aligned}
        name = api('assets?t=hdris')[hid]['name']
        credits.append(f"| `env` (éclairage) | [{name}](https://polyhaven.com/a/{hid}) | {', '.join(api('assets?t=hdris')[hid].get('authors', {}).keys())} |")
        print('env', manifest['env'])
    small(out, manifest)
    json.dump(manifest, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
    with open(os.path.join(out, 'CREDITS.md'), 'w') as f:
        f.write(f'# Ressources photo : {map_id}\n\nToutes sous licence [CC0](https://polyhaven.com/license) (domaine public), via Poly Haven. Merci à leurs auteurs.\n\n| Fichier | Ressource | Auteur(s) |\n|---|---|---|\n')
        f.write('\n'.join(credits) + '\n')

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    main(args[0] if args else 'poste7', '--petit' in sys.argv)
