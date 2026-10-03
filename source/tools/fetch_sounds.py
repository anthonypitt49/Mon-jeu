#!/usr/bin/env python3
"""Cherche et télécharge de vrais sons (Freesound, licence CC0 uniquement) pour remplacer les sons synthétisés.

La clé se lit dans la variable d'environnement FREESOUND_API_KEY (réglages de l'environnement cloud,
ou `export FREESOUND_API_KEY=...` sur un ordinateur). Elle n'est jamais écrite dans un fichier.

Usage (depuis source/) :
  python3 tools/fetch_sounds.py            → 4 candidats par son, dans ../assets/sounds/candidats/
  python3 tools/fetch_sounds.py tir_fusil  → seulement ce son
Les candidats s'écoutent dans ../assets/sounds/candidats/index.html ; le choix final se fait à l'oreille.
La page fabrique la ligne de commande de tools/keep_sounds.py, qui prépare les sons choisis pour le jeu.
On télécharge les aperçus haute qualité (OGG ~ 128 kb/s) : l'original demande une connexion OAuth2, inutile pour un jeu web.
"""
import html, json, os, re, sys, time, urllib.parse, urllib.request

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

# Usage dans le jeu, pour la page d'écoute.
ROLE = {
    'tir_pistolet': 'pistolet, revolver (plus grave)', 'tir_fusil': 'fusil à verrou, carabine, fusil de précision', 'tir_pompe': 'fusil à pompe',
    'tir_auto': "mitraillette, fusil d'assaut, fusil-mitrailleur (coupé court)", 'tir_lointain': "rafales lointaines (ambiance)",
    'recharge_chargeur': 'recharge à chargeur : chaque déclic, dans l’ordre', 'culasse': 'culasse du fusil à verrou', 'pompe': 'pompe du fusil à pompe',
    'douille': 'douilles qui tombent', 'impact_bois': 'balle dans le bois', 'impact_terre': 'balle dans la terre, le béton', 'impact_metal': 'balle sur le métal',
    'impact_chair': 'balle dans un infecté', 'pas_neige': 'pas dans la neige (Poste 7)', 'pas_boue': 'pas dans la boue des tranchées', 'pas_bois': 'pas sur planches et caillebotis',
    'zombie_grogne': 'râle d’infecté', 'zombie_cri': 'cri d’infecté qui charge', 'zombie_attaque': 'infecté qui frappe', 'explosion': 'grenade, obus proche',
    'planche_arrachee': 'planche de barricade arrachée', 'marteau_clou': 'planche reclouée', 'vent_neige': 'vent du Poste 7 (en boucle)', 'artillerie_loin': 'artillerie lointaine (ambiance)',
}

def key():
    k = os.environ.get('FREESOUND_API_KEY', '').strip()
    if not k: sys.exit("FREESOUND_API_KEY absente : ajoutez-la dans les variables d'environnement, puis ouvrez une nouvelle session.")
    if not re.fullmatch(r'[A-Za-z0-9]{40}', k):
        print(f"Attention : FREESOUND_API_KEY fait {len(k)} caractères ; une clé Freesound en fait d'ordinaire 40, lettres et chiffres seulement.", file=sys.stderr)
    return k

def get(url, k, raw=False):
    req = urllib.request.Request(url, headers={'Authorization': 'Token ' + k, 'User-Agent': 'snowfall-protocol-sounds'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r: data = r.read(); return data if raw else json.loads(data)
        except urllib.error.HTTPError as e:
            if e.code == 401: sys.exit("Clé refusée par Freesound (401) : FREESOUND_API_KEY doit être la « Client secret/Api key » de https://freesound.org/apiv2/apply (40 caractères).")
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
    if only == {'--page'}:  # refaire seulement la page d'écoute, sans rien télécharger
        out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'sounds', 'candidats')
        return page(out, json.load(open(os.path.join(out, 'candidats.json'))))
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
    page(out, meta)

def page(out, meta):
    """Page d'écoute : chaque candidat avec son lecteur ; les choix cochés donnent la ligne de commande de keep_sounds.py."""
    e = html.escape
    rows = ''
    for n, cs in meta.items():
        opts = ''.join(f"<label><input type=radio name='{n}' value='{c['id']}'> <audio controls preload=none src='{e(c['file'])}'></audio> "
                       f"{e(c['name'])} · {e(c['auteur'])} · {c['duree']} s · note {c['note']} · <a href='{e(c['url'])}' target=_blank>fiche</a></label>" for c in cs)
        rows += (f"<section><h2>{n}</h2><p class=role>{e(ROLE.get(n, ''))}</p>{opts}"
                 f"<label><input type=radio name='{n}' value='' checked> aucun : garder le son synthétisé</label></section>")
    open(os.path.join(out, 'index.html'), 'w').write(f"""<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Sons candidats</title>
<style>body{{font:15px system-ui;background:#111;color:#ddd;max-width:900px;margin:auto;padding:16px}}label{{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0}}
audio{{height:32px;max-width:100%}}.role{{color:#9a9;margin:0}}a{{color:#8bf}}#cmd{{position:sticky;bottom:0;background:#222;padding:10px;border:1px solid #444;word-break:break-all;font:13px monospace}}</style>
<h1>Sons candidats (CC0)</h1><p>Écoutez, cochez un candidat par son (ou « aucun »), puis copiez la ligne du bas.</p>{rows}
<div id=cmd></div><script>
const f = () => {{ const v = [...document.querySelectorAll('input:checked')].filter((i) => i.value).map((i) => i.name + '=' + i.value);
  document.getElementById('cmd').textContent = v.length ? 'python3 tools/keep_sounds.py ' + v.join(' ') : 'Aucun son coché.'; }};
document.addEventListener('change', f); f();
document.addEventListener('play', (ev) => {{ for (const a of document.querySelectorAll('audio')) if (a !== ev.target) a.pause(); }}, true);
</script>""")

if __name__ == '__main__':
    main(set(sys.argv[1:]))
