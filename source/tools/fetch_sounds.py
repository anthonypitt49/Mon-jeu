#!/usr/bin/env python3
"""Cherche et télécharge de vrais sons (Freesound, licence CC0 uniquement) pour remplacer les sons synthétisés.

La clé se lit dans la variable d'environnement FREESOUND_API_KEY (réglages de l'environnement cloud,
ou `export FREESOUND_API_KEY=...` sur un ordinateur). Elle n'est jamais écrite dans un fichier.

Usage (depuis source/) :
  python3 tools/fetch_sounds.py            → 4 candidats par son, dans ../assets/sounds/candidats/
  python3 tools/fetch_sounds.py tir_fusil  → seulement ce son
Les candidats s'écoutent dans ../assets/sounds/candidats/index.html ; le choix final se fait à l'oreille.
On télécharge les aperçus haute qualité (OGG ~ 128 kb/s) : l'original demande une connexion OAuth2, inutile pour un jeu web.
"""
import json, os, sys, time, urllib.parse, urllib.request

API = 'https://freesound.org/apiv2/'
# Son du jeu → recherche, durée acceptable (secondes). Mots-clés en anglais : la base est surtout anglophone.
WANT = {
    'tir_pistolet':    ('pistol gunshot single', (0.3, 3)),
    'tir_fusil':       ('rifle gunshot single shot', (0.4, 4)),
    'tir_pompe':       ('shotgun shot', (0.4, 4)),
    'tir_auto':        ('assault rifle single shot', (0.2, 3)),
    'tir_lointain':    ('distant gunfire', (1, 12)),
    'recharge_chargeur': ('magazine reload rifle', (0.5, 4)),
    'culasse':         ('bolt action rifle cycling', (0.4, 3)),
    'pompe':           ('shotgun pump', (0.3, 2.5)),
    'douille':         ('bullet casing drop', (0.1, 2)),
    'impact_bois':     ('bullet impact wood', (0.1, 2)),
    'impact_terre':    ('bullet impact dirt', (0.1, 2)),
    'impact_metal':    ('bullet ricochet metal', (0.1, 2.5)),
    'impact_chair':    ('flesh impact hit', (0.1, 1.5)),
    'pas_neige':       ('footsteps snow', (1, 15)),
    'pas_boue':        ('footsteps mud', (1, 15)),
    'pas_bois':        ('footsteps wood boards', (1, 15)),
    'zombie_grogne':   ('zombie groan', (0.5, 6)),
    'zombie_cri':      ('zombie scream', (0.5, 5)),
    'zombie_attaque':  ('zombie attack growl', (0.3, 3)),
    'explosion':       ('explosion grenade', (1, 8)),
    'planche_arrachee': ('wood plank break', (0.2, 3)),
    'marteau_clou':    ('hammer nail wood', (0.2, 3)),
    'vent_neige':      ('winter wind howling', (10, 120)),
    'artillerie_loin': ('distant artillery explosions', (5, 120)),
}
PER = 4

def key():
    k = os.environ.get('FREESOUND_API_KEY', '').strip()
    if not k: sys.exit("FREESOUND_API_KEY absente : ajoutez-la dans les variables d'environnement, puis ouvrez une nouvelle session.")
    return k

def get(url, k, raw=False):
    req = urllib.request.Request(url, headers={'Authorization': 'Token ' + k, 'User-Agent': 'snowfall-protocol-sounds'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r: data = r.read(); return data if raw else json.loads(data)
        except urllib.error.HTTPError as e:
            if e.code == 401: sys.exit('Clé refusée par Freesound (401) : vérifiez FREESOUND_API_KEY.')
            if e.code == 429: time.sleep(10 * (attempt + 1)); continue  # limite de requêtes : on patiente
            raise
    raise RuntimeError('Freesound ne répond plus (limite de requêtes ?)')

def search(k, q, dur):
    p = {'query': q, 'filter': f'license:"Creative Commons 0" duration:[{dur[0]} TO {dur[1]}]',
         'fields': 'id,name,username,license,duration,previews,avg_rating,num_ratings,num_downloads,url,tags',
         'sort': 'score', 'page_size': 30}
    res = get(API + 'search/text/?' + urllib.parse.urlencode(p), k)['results']
    # Pertinence d'abord, puis préférence aux sons notés et téléchargés (signe de qualité d'enregistrement).
    res.sort(key=lambda s: -(s.get('avg_rating', 0) * min(1, s.get('num_ratings', 0) / 3) + min(2, s.get('num_downloads', 0) / 2000)))
    return res[:PER]

def main(only):
    k = key(); out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'sounds', 'candidats')
    os.makedirs(out, exist_ok=True); meta = {}
    path = os.path.join(out, 'candidats.json')
    if os.path.exists(path): meta = json.load(open(path))
    for name, (q, dur) in WANT.items():
        if only and name not in only: continue
        meta[name] = []
        for s in search(k, q, dur):
            f = f"{name}_{s['id']}.ogg"
            open(os.path.join(out, f), 'wb').write(get(s['previews']['preview-hq-ogg'], k, raw=True))
            meta[name].append({'file': f, 'id': s['id'], 'name': s['name'], 'auteur': s['username'], 'url': s['url'], 'licence': s['license'],
                               'duree': round(s['duration'], 2), 'note': round(s.get('avg_rating', 0), 2), 'telechargements': s.get('num_downloads', 0)})
        print(name, [c['id'] for c in meta[name]])
        time.sleep(1)  # Freesound limite le nombre de requêtes par minute
    json.dump(meta, open(path, 'w'), ensure_ascii=False, indent=1)
    # Page d'écoute : chaque candidat avec son lecteur, pour choisir à l'oreille.
    rows = ''.join(f"<h2>{n}</h2>" + ''.join(f"<p><audio controls preload=none src='{c['file']}'></audio> {c['name']} · {c['auteur']} · {c['duree']} s · note {c['note']} · <a href='{c['url']}'>fiche</a></p>" for c in cs) for n, cs in meta.items())
    open(os.path.join(out, 'index.html'), 'w').write(f"<!doctype html><meta charset=utf-8><title>Sons candidats</title><body style='font:15px system-ui;background:#111;color:#ddd;max-width:900px;margin:auto;padding:16px'><h1>Sons candidats (CC0)</h1>{rows}")

if __name__ == '__main__':
    main(set(sys.argv[1:]))
