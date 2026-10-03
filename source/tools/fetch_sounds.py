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
import html, json, os, re, subprocess, sys, time, urllib.parse, urllib.request

API = 'https://freesound.org/apiv2/'
# Son du jeu → recherches (de la plus précise à la plus large), durée acceptable (secondes). Mots-clés en anglais : la base est surtout anglophone.
# Freesound exige tous les mots d'une recherche : une recherche précise peut ne rien donner en CC0, d'où les suivantes, essayées tant qu'il manque des candidats.
WANT = {
    'tir_pistolet':    (('pistol gunshot single', 'pistol shot'), (0.3, 3)),
    'tir_fusil':       (('rifle gunshot single shot', 'rifle single shot', 'rifle shot'), (0.4, 4)),
    'tir_pompe':       (('shotgun shot', 'shotgun blast'), (0.4, 4)),
    # Coups isolés seulement : keep_sounds.py ne sépare pas les balles d'une rafale (écart < 0,3 s).
    'tir_auto':        (('assault rifle single shot', 'ak47 shot', 'm4 rifle shot', 'machine gun single shot'), (0.2, 3)),
    'tir_lointain':    (('distant gunfire', 'distant gunshots'), (1, 12)),
    'recharge_chargeur': (('magazine reload rifle', 'magazine reload'), (0.5, 4)),
    'culasse':         (('bolt action rifle cycling', 'rifle bolt', 'bolt action'), (0.4, 3)),
    'pompe':           (('shotgun pump', 'shotgun rack', 'shotgun reload'), (0.3, 2.5)),
    'douille':         (('bullet casing drop', 'shell casing', 'bullet casing'), (0.1, 2)),
    'impact_bois':     (('bullet impact wood', 'bullet hit wood', 'wood impact'), (0.1, 2)),
    'impact_terre':    (('bullet impact dirt', 'bullet impact ground', 'bullet impact', 'impact dirt'), (0.1, 2)),
    'impact_metal':    (('bullet ricochet metal', 'ricochet', 'bullet hit metal'), (0.1, 2.5)),
    'impact_chair':    (('flesh impact hit', 'flesh hit'), (0.1, 1.5)),
    'pas_neige':       (('footsteps snow', 'snow walking'), (1, 15)),
    'pas_boue':        (('footsteps mud', 'mud walking'), (1, 15)),
    'pas_bois':        (('footsteps wood boards', 'footsteps boots wood', 'footsteps wooden floor'), (1, 15)),
    'zombie_grogne':   (('zombie groan', 'zombie growl'), (0.5, 6)),
    'zombie_cri':      (('zombie scream', 'monster scream'), (0.5, 5)),
    'zombie_attaque':  (('zombie attack growl', 'zombie attack', 'monster attack growl', 'zombie growl'), (0.3, 3)),
    'explosion':       (('explosion grenade', 'explosion'), (1, 8)),
    'planche_arrachee': (('wood plank break', 'wood break', 'wood crack'), (0.2, 3)),
    'marteau_clou':    (('hammer nail wood', 'hammer nail', 'hammering'), (0.2, 3)),
    'vent_neige':      (('winter wind howling', 'wind howling'), (10, 120)),
    'artillerie_loin': (('distant artillery explosions', 'distant artillery', 'distant explosions'), (5, 120)),
}
PER = 4

# Usage dans le jeu, pour la page d'écoute.
ROLE = {
    'tir_pistolet': 'pistolet, revolver (plus grave)', 'tir_fusil': 'fusil à verrou, carabine, fusil de précision', 'tir_pompe': 'fusil à pompe',
    'tir_auto': "mitraillette, fusil d'assaut, fusil-mitrailleur (coupé court) : il faut des coups isolés, une rafale reste d'un seul bloc", 'tir_lointain': "rafales lointaines (ambiance)",
    'recharge_chargeur': 'recharge à chargeur : chaque déclic, dans l’ordre', 'culasse': 'culasse du fusil à verrou', 'pompe': 'pompe du fusil à pompe',
    'douille': 'douilles qui tombent', 'impact_bois': 'balle dans le bois', 'impact_terre': 'balle dans la terre, le béton', 'impact_metal': 'balle sur le métal',
    'impact_chair': 'balle dans un infecté', 'pas_neige': 'pas dans la neige (Poste 7)', 'pas_boue': 'pas dans la boue des tranchées', 'pas_bois': 'pas sur planches et caillebotis',
    'zombie_grogne': 'râle d’infecté', 'zombie_cri': 'cri d’infecté qui charge', 'zombie_attaque': 'infecté qui frappe', 'explosion': 'grenade, obus proche',
    'planche_arrachee': 'planche de barricade arrachée', 'marteau_clou': 'planche reclouée', 'vent_neige': 'vent du Poste 7 (en boucle)', 'artillerie_loin': 'artillerie lointaine (ambiance)',
}
# Familles de la page d'écoute (un son absent d'ici va dans « Autres »).
GROUPS = [
    ('Tirs', ['tir_pistolet', 'tir_fusil', 'tir_pompe', 'tir_auto']),
    ('Manipulation des armes', ['recharge_chargeur', 'culasse', 'pompe', 'douille']),
    ('Impacts', ['impact_bois', 'impact_terre', 'impact_metal', 'impact_chair']),
    ('Pas', ['pas_neige', 'pas_boue', 'pas_bois']),
    ('Infectés', ['zombie_grogne', 'zombie_cri', 'zombie_attaque']),
    ('Barricades et explosions', ['planche_arrachee', 'marteau_clou', 'explosion']),
    ('Ambiance', ['vent_neige', 'artillerie_loin', 'tir_lointain']),
]

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

def search(k, queries, dur, seen):
    """Jusqu'à PER candidats, sans reprendre un son déjà proposé pour un autre (`seen`).
    Un seul par auteur tant que c'est possible : les séries d'un même auteur se ressemblent, l'écoute compare mieux des prises différentes."""
    found = []
    for q in queries:
        p = {'query': q, 'filter': f'license:"Creative Commons 0" duration:[{dur[0]} TO {dur[1]}]',
             'fields': 'id,name,username,license,duration,previews,avg_rating,num_ratings,num_downloads,url,tags',
             'sort': 'score', 'page_size': 30}
        res = get(API + 'search/text/?' + urllib.parse.urlencode(p), k)['results']
        # Pertinence d'abord, puis préférence aux sons notés et téléchargés (signe de qualité d'enregistrement).
        res.sort(key=lambda s: -(s.get('avg_rating', 0) * min(1, s.get('num_ratings', 0) / 3) + min(2, s.get('num_downloads', 0) / 2000)))
        ids = {s['id'] for s in found}
        found += [s for s in res if s['id'] not in seen and s['id'] not in ids]
        if len({s['username'] for s in found}) >= PER: break
        time.sleep(1)  # Freesound limite le nombre de requêtes par minute
    first, rest, authors = [], [], set()
    for s in found:
        (rest if s['username'] in authors else first).append(s); authors.add(s['username'])
    return (first + rest)[:PER]

def main(only):
    if only == {'--page'}:  # refaire seulement la page d'écoute, sans rien télécharger
        out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'sounds', 'candidats')
        return page(out, json.load(open(os.path.join(out, 'candidats.json'))))
    k = key(); out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'sounds', 'candidats')
    os.makedirs(out, exist_ok=True); meta = {}
    path = os.path.join(out, 'candidats.json')
    if os.path.exists(path): meta = json.load(open(path))
    seen = {c['id'] for n, cs in meta.items() if only and n not in only for c in cs}  # candidats des sons qu'on ne refait pas
    for name, (q, dur) in WANT.items():
        if only and name not in only: continue
        meta[name] = []
        for s in search(k, q, dur, seen):
            seen.add(s['id']); f = f"{name}_{s['id']}.ogg"
            if not os.path.exists(os.path.join(out, f)):  # l'aperçu d'un son Freesound ne change pas : inutile de le reprendre
                open(os.path.join(out, f), 'wb').write(get(s['previews']['preview-hq-ogg'], k, raw=True))
            meta[name].append({'file': f, 'id': s['id'], 'name': s['name'], 'auteur': s['username'], 'url': s['url'], 'licence': s['license'],
                               'duree': round(s['duration'], 2), 'note': round(s.get('avg_rating', 0), 2), 'telechargements': s.get('num_downloads', 0)})
        print(name, [c['id'] for c in meta[name]])
        time.sleep(1)  # Freesound limite le nombre de requêtes par minute
    json.dump(meta, open(path, 'w'), ensure_ascii=False, indent=1)
    keep = {c['file'] for cs in meta.values() for c in cs}
    for f in os.listdir(out):  # candidats d'une recherche précédente, plus proposés
        if f.endswith('.ogg') and f not in keep: os.remove(os.path.join(out, f))
    page(out, meta)

def takes(out, meta):
    """Ce que keep_sounds.py tirera de chaque candidat (même découpage) : durées des prises, 'boucle', ou None si illisible."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import keep_sounds as K
    res = {}
    for n, cs in meta.items():
        for c in cs:
            if n in K.LOOP: res[c['file']] = 'boucle'; continue
            try: ev = K.events(K.decode(os.path.join(out, c['file'])), *K.CUT.get(n, (0.3, 2.0, 6)))
            except (OSError, subprocess.CalledProcessError): res[c['file']] = None; continue  # ffmpeg absent, fichier abîmé
            res[c['file']] = [(e - s) / K.SR for s, e in ev]
    return res


def page(out, meta):
    """Page d'écoute : chaque candidat avec son lecteur et ce que le jeu en gardera ; les choix cochés donnent la ligne de keep_sounds.py.
    Sans doctype : publiée telle quelle comme Artifact (avec les .ogg à côté), elle reçoit son squelette à la publication."""
    e, num = html.escape, lambda x: f'{x:.2f}'.rstrip('0').rstrip('.').replace('.', ',')
    tk = takes(out, meta)

    def chip(c):
        t = tk.get(c['file'])
        if t is None: return ''
        if t == 'boucle': return '<span class="chip">boucle sans raccord</span>'
        if not t: return '<span class="chip mauvais">aucune prise trouvée : inutilisable</span>'
        if len(t) == 1: return f'<span class="chip">1 prise · {num(t[0])} s</span>'
        lo, hi = min(t), max(t)
        return f'<span class="chip">{len(t)} prises · {num(lo)} à {num(hi)} s</span>'

    def sound(n):
        rows = ''
        for i, c in enumerate(meta[n], 1):
            note = f' · note {num(c["note"])}/5' if c.get('note') else ''
            rows += (f'<div class="cand"><button type="button" class="play" data-src="{e(c["file"])}" aria-label="Écouter {e(c["name"])}"></button>'
                     f'<label class="choix" for="{n}-{i}"><input type="radio" id="{n}-{i}" name="{n}" value="{c["id"]}">'
                     f'<span class="txt"><span class="nom">{e(c["name"])}</span>'
                     f'<span class="meta"><span>n°{i} · {e(c["auteur"])} · {num(c["duree"])} s{note}</span>{chip(c)}'
                     f'<a href="{e(c["url"])}" target="_blank" rel="noopener">fiche Freesound ↗</a></span>'
                     f'<span class="bar"><i></i></span></span></label></div>')
        return (f'<section class="son" id="s-{n}"><header><h3>{n}</h3><p class="role">{e(ROLE.get(n, ""))}</p></header>{rows}'
                f'<div class="cand"><span class="play vide"></span><label class="choix" for="{n}-0"><input type="radio" id="{n}-0" name="{n}" value="" checked>'
                f'<span class="txt"><span class="nom aucun">Aucun : garder le son actuel du jeu</span></span></label></div></section>')

    groups, done = [], set()
    for title, names in GROUPS + [('Autres', list(meta))]:
        names = [n for n in names if n in meta and n not in done]; done.update(names)
        if names: groups.append(f'<h2>{e(title)}</h2><div class="famille">' + ''.join(sound(n) for n in names) + '</div>')
    page_html = PAGE.replace('{{N}}', str(len(meta))).replace('{{SONS}}', ''.join(groups))
    open(os.path.join(out, 'index.html'), 'w').write(page_html)


PAGE = """<title>Banc d'écoute Snowfall</title>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Une colonne : familles de sons, un bloc par son, une ligne par candidat ; la commande reste collée en bas de l'écran. */
:root {
  --bg: #e8edf1; --surface: #f9fbfc; --line: #cbd5dd; --fg: #15202b; --muted: #536373;
  --accent: #c2410c; --accent-soft: #fbe5d8; --on-accent: #ffffff; --warn: #b42318; --warn-soft: #fde3df;
  --display: "Barlow Condensed", "Arial Narrow", sans-serif; --body: "Barlow", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0e151c; --surface: #16202a; --line: #2a3845; --fg: #e2e9ef; --muted: #93a4b4;
  --accent: #ff8a4c; --accent-soft: #3a2519; --on-accent: #1b0f08; --warn: #ff8f82; --warn-soft: #3d1d1a; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #0e151c; --surface: #16202a; --line: #2a3845; --fg: #e2e9ef; --muted: #93a4b4;
  --accent: #ff8a4c; --accent-soft: #3a2519; --on-accent: #1b0f08; --warn: #ff8f82; --warn-soft: #3d1d1a; color-scheme: dark }
* { box-sizing: border-box }
body { background: var(--bg); color: var(--fg); font: 16px/1.45 var(--body); margin: 0; padding-inline: 16px }
main { max-width: 860px; margin: 0 auto; padding-block: 28px 170px }
h1 { font: 700 2.4rem/1 var(--display); text-transform: uppercase; letter-spacing: .02em; margin: 0; text-wrap: balance }
.lead { color: var(--muted); max-width: 64ch; margin: .6rem 0 0 }
.lead b { color: var(--fg); font-weight: 600 }
h2 { font: 600 .8rem/1 var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin: 2.4rem 0 .8rem; padding-bottom: .5rem; border-bottom: 1px solid var(--line) }
.famille { display: grid; gap: 12px }
.son { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 12px 12px 8px; display: grid; gap: 2px }
.son header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 12px; padding: 0 6px 6px }
.son h3 { font: 600 1.4rem/1.1 var(--display); letter-spacing: .02em; margin: 0 }
.role { color: var(--muted); margin: 0; min-width: 0 }
.cand { display: flex; align-items: flex-start; gap: 10px; padding: 6px; border-radius: 4px }
.cand:has(input:checked) { background: var(--accent-soft) }
.play { flex: none; width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid var(--fg); background: transparent; color: var(--fg); cursor: pointer; display: grid; place-items: center; padding: 0 }
.play::before { content: ""; border-style: solid; border-width: 6px 0 6px 10px; border-color: transparent transparent transparent currentColor; margin-left: 3px }
.play.on { background: var(--fg); color: var(--surface) }
.play.on::before { border-width: 0; width: 10px; height: 10px; background: currentColor; margin: 0 }
.play.vide { border-color: transparent; cursor: default }
.play.vide::before { display: none }
.play:focus-visible, .choix input:focus-visible, button:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }
.choix { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; cursor: pointer; padding-top: 6px }
.choix input { accent-color: var(--accent); margin: 3px 0 0; flex: none; width: 17px; height: 17px }
.txt { display: grid; gap: 3px; min-width: 0; flex: 1 }
.nom { font-weight: 500; overflow-wrap: anywhere }
.nom.aucun { font-weight: 400; color: var(--muted) }
.meta { color: var(--muted); font-size: .86rem; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; font-variant-numeric: tabular-nums }
.meta a { color: var(--muted) }
.meta a:hover { color: var(--accent) }
.chip { font: 500 .74rem/1.5 var(--mono); padding: 0 6px; border-radius: 3px; background: var(--bg); color: var(--fg); border: 1px solid var(--line) }
.chip.mauvais { background: var(--warn-soft); color: var(--warn); border-color: transparent }
.bar { height: 2px; background: transparent; border-radius: 1px; overflow: hidden }
.bar i { display: block; height: 100%; width: 0; background: var(--accent) }
#erreur { margin: 1rem 0 0; padding: 10px 12px; border-radius: 4px; background: var(--warn-soft); color: var(--warn) }
#barre { position: fixed; left: 0; right: 0; bottom: 0; background: var(--surface); border-top: 1px solid var(--line); padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px)) }
.barre-in { max-width: 860px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px }
.compte { font-size: .86rem; color: var(--muted); font-variant-numeric: tabular-nums }
.ligne { display: flex; gap: 10px; align-items: center }
#cmd { flex: 1; min-width: 0; font: 13px/1.45 var(--mono); max-height: 4.5em; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; padding: 6px 8px; background: var(--bg); border-radius: 4px; user-select: all }
#copier { flex: none; font: 600 .95rem var(--body); border: 0; border-radius: 4px; padding: 10px 16px; background: var(--accent); color: var(--on-accent); cursor: pointer }
#copier:disabled { opacity: .45; cursor: default }
@media (prefers-reduced-motion: reduce) { .bar i { transition: none } }
</style>
<main>
  <h1>Banc d'écoute</h1>
  <p class="lead">Les vrais sons candidats pour Snowfall Protocol, tous en licence CC0 (Freesound). Pour chacun des {{N}} sons, écoutez, cochez le meilleur ou laissez <b>Aucun</b> pour garder le son actuel, puis <b>copiez la ligne du bas et collez-la à Claude</b>.</p>
  <p class="lead">L'étiquette grise dit ce que le jeu gardera après découpage : chaque prise est un son joué à part (un tir, un pas, un râle). Pour une recharge, les prises sont les déclics joués dans l'ordre.</p>
  <p id="erreur" hidden>Ce navigateur n'arrive pas à lire ces fichiers (format OGG). Ouvrez la page sur ordinateur, dans Chrome, Firefox ou Edge.</p>
  {{SONS}}
</main>
<div id="barre"><div class="barre-in">
  <div class="compte" id="compte"></div>
  <div class="ligne"><pre id="cmd"></pre><button type="button" id="copier">Copier</button></div>
</div></div>
<script>
const KEY = 'banc-ecoute-snowfall';
const radios = () => [...document.querySelectorAll('.choix input')];
const update = () => {
  const picked = radios().filter((i) => i.checked && i.value);
  const total = new Set(radios().map((i) => i.name)).size;
  document.getElementById('cmd').textContent = picked.length ? 'python3 tools/keep_sounds.py ' + picked.map((i) => i.name + '=' + i.value).join(' ') : 'Aucun son choisi pour l’instant.';
  document.getElementById('compte').textContent = picked.length + ' son' + (picked.length > 1 ? 's' : '') + ' choisi' + (picked.length > 1 ? 's' : '') + ' sur ' + total + ' · les autres gardent leur son actuel';
  document.getElementById('copier').disabled = !picked.length;
  try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(picked.map((i) => [i.name, i.value])))); } catch (e) {}
};
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  for (const [n, v] of Object.entries(saved)) { const i = document.querySelector(`.choix input[name="${CSS.escape(n)}"][value="${CSS.escape(v)}"]`); if (i) i.checked = true; }
} catch (e) {}
document.addEventListener('change', update); update();

const audio = new Audio(); let cur = null;
const bar = (b) => b.closest('.cand').querySelector('.bar i');
const stop = () => { if (!cur) return; audio.pause(); cur.classList.remove('on'); bar(cur).style.width = '0'; cur = null; };
const fail = () => { stop(); document.getElementById('erreur').hidden = false; };
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('.play:not(.vide)'); if (!b) return;
  if (cur === b) { stop(); return; }
  stop(); cur = b; b.classList.add('on'); audio.src = b.dataset.src; audio.play().catch((err) => { if (err.name !== 'AbortError') fail(); });
});
audio.addEventListener('ended', stop);
audio.addEventListener('error', () => { if (cur) fail(); });
audio.addEventListener('timeupdate', () => { if (cur && audio.duration) bar(cur).style.width = (100 * audio.currentTime / audio.duration) + '%'; });

document.getElementById('copier').addEventListener('click', (ev) => {
  const btn = ev.currentTarget, text = document.getElementById('cmd').textContent;
  const done = (msg) => { btn.textContent = msg; setTimeout(() => { btn.textContent = 'Copier'; }, 1800); };
  const select = () => { const r = document.createRange(); r.selectNodeContents(document.getElementById('cmd')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); done('Sélectionnée'); };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => done('Copiée'), select); else select();
});
</script>
"""


if __name__ == '__main__':
    main(set(sys.argv[1:]))
