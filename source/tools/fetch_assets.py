#!/usr/bin/env python3
"""Télécharge et prépare les textures photo et l'éclairage (HDRI) d'une carte.

Toutes les ressources sont sous licence CC0 (Poly Haven) : libres, sans attribution obligatoire.
Usage : python3 tools/fetch_assets.py poste7   (depuis source/ ; écrit ../assets/<carte>/)
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
}
HDRI = {'poste7': 'kloppenheim_07'}  # nuit couverte, lumière naturelle diffuse
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

def main(map_id):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', map_id)
    os.makedirs(out, exist_ok=True)
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
            img.save(os.path.join(out, f'{key}_{m}.jpg'), quality=QUAL[m], optimize=True, progressive=True)
            if m == 'c': entry['lum'] = round(luminance(img), 4)
        if s.get('dirty'): entry['lum'] = dirty(out, key, s['dirty'])
        manifest[key] = entry
        credits.append(f"| `{key}` | [{meta['name']}](https://polyhaven.com/a/{s['id']}) | {', '.join(meta.get('authors', {}).keys())} |")
        print(key, entry)
    if map_id in HDRI:
        import cv2
        hid = HDRI[map_id]
        raw = get(api('files/' + hid)['hdri']['1k']['hdr']['url'])
        tmp = os.path.join(out, '_tmp.hdr'); open(tmp, 'wb').write(raw)
        hdr = cv2.imread(tmp, cv2.IMREAD_ANYDEPTH | cv2.IMREAD_COLOR); os.remove(tmp)
        W, H = 256, 128  # l'éclairage d'ambiance n'a pas besoin de plus
        rgb = cv2.resize(hdr, (W, H), interpolation=cv2.INTER_AREA)[..., ::-1].astype(np.float32)
        # Format RGBE (3 octets de couleur + 1 d'exposant, comme un .hdr) dans un JSON : servi partout, y compris sur claude.ai.
        mx = np.maximum(rgb.max(axis=2), 1e-32); e = np.floor(np.log2(mx)) + 1; sc = 256.0 / np.exp2(e)
        rgbe = np.zeros((H, W, 4), np.uint8); rgbe[..., :3] = np.clip(rgb * sc[..., None], 0, 255).astype(np.uint8); rgbe[..., 3] = np.clip(e + 128, 0, 255)
        rgbe[mx < 1e-32] = 0
        import base64
        json.dump({'w': W, 'h': H, 'rgbe': base64.b64encode(rgbe.tobytes()).decode()}, open(os.path.join(out, 'env.json'), 'w'))
        w = np.cos((np.arange(H) + 0.5) / H * np.pi - np.pi / 2)[:, None]  # moyenne pondérée par l'aire
        manifest['env'] = {'lum': round(float(((rgb @ np.array([0.2126, 0.7152, 0.0722])) * w).sum() / (w.sum() * W)), 5)}
        name = api('assets?t=hdris')[hid]['name']
        credits.append(f"| `env` (éclairage) | [{name}](https://polyhaven.com/a/{hid}) | {', '.join(api('assets?t=hdris')[hid].get('authors', {}).keys())} |")
        print('env', manifest['env'])
    json.dump(manifest, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
    with open(os.path.join(out, 'CREDITS.md'), 'w') as f:
        f.write(f'# Ressources photo : {map_id}\n\nToutes sous licence [CC0](https://polyhaven.com/license) (domaine public), via Poly Haven. Merci à leurs auteurs.\n\n| Fichier | Ressource | Auteur(s) |\n|---|---|---|\n')
        f.write('\n'.join(credits) + '\n')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'poste7')
