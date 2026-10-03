#!/usr/bin/env python3
"""Garde les sons choisis à l'oreille parmi les candidats Freesound et les prépare pour le jeu.

Usage (depuis source/) :
  python3 tools/keep_sounds.py tir_pistolet=123456 pas_neige=654321 ...
Chaque argument : nom du son (liste WANT de fetch_sounds.py) = numéro Freesound du candidat retenu, ou son rang (1 à 4) sur la page d'écoute.
La page d'écoute (../assets/sounds/candidats/index.html) fabrique cette ligne toute seule.

Traitement : mono, grondement sous 25 Hz retiré, silences rognés, crête à -1 dB, OGG Vorbis (ffmpeg).
Chaque enregistrement est découpé en événements (un tir, un pas, un râle, un obus…), recollés avec un court silence :
le jeu en joue un au hasard (ou dans l'ordre, pour une recharge), d'après les repères de manifest.json.
Le vent est une boucle : un extrait refermé sur lui-même par un fondu enchaîné, sans raccord audible.
Écrit ../assets/sounds/<nom>.ogg, manifest.json et CREDITS.md ; les sons gardés lors d'un appel précédent restent.
Options : --candidats DIR (défaut ../assets/sounds/candidats), --vers DIR (défaut ../assets/sounds).
"""
import array, json, math, os, subprocess, sys

SR = 44100
FRAME = 441  # 10 ms
# Découpage, par son : écart (s) en dessous duquel deux événements n'en font qu'un, longueur maximale d'un événement (s),
# nombre maximal d'événements gardés, et en option le bond (dB, 12 par défaut) qui marque un nouveau départ sans silence entre deux.
# Les tirs gardent leur queue (écho) ; les pas sont brefs et nombreux. Une rafale (balles tous les 0,1 s, le niveau ne retombe
# que de 10 dB entre deux) se découpe balle par balle avec un écart court et un bond faible : le jeu en joue une par balle.
CUT = {
    'tir_pistolet': (0.5, 2.0, 4), 'tir_fusil': (0.6, 3.0, 4), 'tir_pompe': (0.6, 3.0, 4), 'tir_auto': (0.08, 1.2, 9, 6),
    'tir_lointain': (0.6, 4.0, 6),
    'recharge_chargeur': (0.12, 0.8, 6), 'culasse': (0.1, 0.6, 4), 'pompe': (0.1, 0.6, 3),
    'douille': (0.15, 0.8, 8),
    'impact_bois': (0.2, 1.0, 6), 'impact_terre': (0.2, 1.0, 6), 'impact_metal': (0.25, 1.5, 6), 'impact_chair': (0.2, 0.8, 6),
    'pas_neige': (0.15, 0.6, 12), 'pas_boue': (0.15, 0.6, 12), 'pas_bois': (0.15, 0.6, 12),
    'zombie_grogne': (0.5, 4.0, 6), 'zombie_cri': (0.4, 3.0, 6), 'zombie_attaque': (0.3, 2.0, 6),
    'explosion': (1.0, 6.0, 3), 'artillerie_loin': (1.0, 6.0, 8),
    'planche_arrachee': (0.3, 2.0, 4), 'marteau_clou': (0.12, 0.6, 8),
}
LOOP = {'vent_neige': 24.0}  # boucles : longueur visée (s)
ON_DB, OFF_DB, KEEP_DB = 32, 48, 20  # début d'événement, fin de queue, événement trop faible (dB sous la crête du fichier)


def decode(path):
    """Fichier → échantillons mono flottants (44,1 kHz), grondement retiré."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-t', '180', '-af', 'highpass=f=25', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    a = array.array('f'); a.frombytes(raw); return a


def encode(samples, path):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libvorbis', '-q:a', '4', path],
                   input=samples.tobytes(), check=True)


def levels(a):
    """Niveau (dB) de chaque tranche de 10 ms."""
    out = []
    for i in range(0, len(a) - FRAME + 1, FRAME):
        s = sum(x * x for x in a[i:i + FRAME]) / FRAME
        out.append(10 * math.log10(s + 1e-12))
    return out


def events(a, gap, longest, most, jump=12):
    """Repère les événements : [début, fin] en échantillons, du plus ancien au plus récent."""
    lv = levels(a); n = len(lv)
    if not n: return []
    # Seuils relatifs à la crête, mais toujours au-dessus du bruit de fond (prise de son en extérieur, souffle).
    # Un son sans silence (râle continu) a un fond proche de la crête : les seuils restent alors sous la crête.
    top, floor = max(lv), sorted(lv)[n // 5]
    on = min(max(top - ON_DB, floor + 10), top - 6)
    off = min(max(top - OFF_DB, floor + 4), on - 6)
    # Début : le niveau dépasse `on` après être passé sous `off`, même en montant lentement (cri qui enfle),
    # ou bondit d'un coup (pas qui s'enchaînent sans silence). La montée est gardée (au plus 300 ms).
    # Un début trop proche du précédent appartient au même événement (écho d'un tir, râle entrecoupé).
    g, starts, armed, rise = max(1, int(gap * SR / FRAME)), [], True, 0
    for i in range(n):
        if lv[i] <= off: armed, rise = True, i + 1; continue
        if lv[i] < on: continue
        if armed or lv[i] - min(lv[max(0, i - 3):i], default=-999.0) >= jump:
            if not starts or i - starts[-1][0] >= g: starts.append((i, max(rise, i - 30) if armed else i))
            armed = False
    cap, shortest = int(longest * SR / FRAME), int(min(0.15, max(0.03, longest / 40)) * SR / FRAME)
    ev, end = [], 0
    for k, (s, front) in enumerate(starts):
        nxt = starts[k + 1][0] if k + 1 < len(starts) else n
        # La queue, jusqu'au fond ou au son suivant. Si le son repart (au-dessus de `on`) avant l'écart, c'est un début
        # écarté plus haut : même événement, la queue continue (écho d'un tir ; déclic juste avant le tir).
        e = s + 1
        while e < nxt and e - s < cap:
            if lv[e] > off: e += 1; continue
            back = next((j for j in range(e, min(nxt, s + cap, e + g)) if lv[j] >= on), None)
            if back is None: break
            e = back + 1
        s = max(end, min(s - 2, front)); end = e  # 20 ms d'avance au moins : l'attaque reste entière
        if e - s >= shortest and max(lv[s:e]) >= top - KEEP_DB: ev.append([s, e])
    if len(ev) > most:  # on garde les plus nets, dans l'ordre de l'enregistrement
        ev = sorted(sorted(ev, key=lambda r: -max(lv[r[0]:r[1]]))[:most])
    return [[s * FRAME, min(len(a), e * FRAME)] for s, e in ev]


def fade(seg, fin, fout):
    n = len(seg)
    for i in range(min(fin, n)): seg[i] *= i / fin
    for i in range(min(fout, n)): seg[n - 1 - i] *= i / fout
    return seg


def peak_of(a): return max((abs(x) for x in a), default=0.0)


def cut_sound(a, name):
    ev = events(a, *CUT.get(name, (0.3, 2.0, 6)))
    if not ev: raise ValueError('aucun événement trouvé (fichier silencieux ?)')
    segs = []
    for s, e in ev:
        seg = array.array('f', a[s:e]); n = len(seg)
        fade(seg, min(88, n // 8), min(int(0.03 * SR), n // 3))  # 2 ms d'attaque, 30 ms de fin
        segs.append(seg)
    # Les événements faibles remontent un peu (au plus +12 dB, jusqu'à 6 dB sous le plus fort) : chacun reste audible.
    top = max(peak_of(s) for s in segs)
    for seg in segs:
        p = peak_of(seg)
        if p > 0:
            k = min(4.0, max(1.0, top * 0.5 / p))
            for i in range(len(seg)): seg[i] *= k
    out, cuts, sil = array.array('f'), [], array.array('f', [0.0]) * int(0.05 * SR)
    for seg in segs:
        cuts.append([round(len(out) / SR, 3), round((len(out) + len(seg)) / SR, 3)])
        out.extend(seg); out.extend(sil)
    return out, cuts


def loop_sound(a, name):
    want = LOOP[name]; L = min(len(a), int(want * SR)); X = min(int(2 * SR), L // 6)
    start = max(0, (len(a) - L) // 2); seg = a[start:start + L]
    # Fondu enchaîné à puissance constante : la fin se fond dans le début ; à la reprise, l'onde continue sans raccord.
    out = array.array('f', seg[:L - X])
    for i in range(X):
        t = i / X; out[i] = seg[i] * math.sin(t * math.pi / 2) + seg[L - X + i] * math.cos(t * math.pi / 2)
    return out, [[0, round(len(out) / SR, 3)]]


def main(argv):
    here = os.path.dirname(os.path.abspath(__file__))
    cand = os.path.join(here, '..', '..', 'assets', 'sounds', 'candidats'); dest = os.path.join(here, '..', '..', 'assets', 'sounds')
    picks = []
    it = iter(argv)
    for a in it:
        if a == '--candidats': cand = next(it)
        elif a == '--vers': dest = next(it)
        elif '=' in a: picks.append(a.split('=', 1))
        else: raise SystemExit(f'Argument incompris : {a} (attendu : nom=numéro)')
    if not picks: raise SystemExit(__doc__)
    meta = json.load(open(os.path.join(cand, 'candidats.json')))
    os.makedirs(dest, exist_ok=True)
    mpath, cpath = os.path.join(dest, 'manifest.json'), os.path.join(dest, 'credits.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {}
    cred = json.load(open(cpath)) if os.path.exists(cpath) else {}
    fails = []
    for name, ref in picks:
        cs = meta.get(name) or []
        c = next((c for c in cs if str(c['id']) == ref), None) or (cs[int(ref) - 1] if ref.isdigit() and 1 <= int(ref) <= len(cs) else None)
        if not c: fails.append(f'{name}={ref} : candidat introuvable dans candidats.json'); continue
        try:
            a = decode(os.path.join(cand, c['file']))
            out, cuts = (loop_sound if name in LOOP else cut_sound)(a, name)
        except (ValueError, subprocess.CalledProcessError) as e: fails.append(f'{name}={ref} : {e}'); continue
        p = peak_of(out) or 1.0
        g = 10 ** (-1 / 20) / p  # crête à -1 dB
        for i in range(len(out)): out[i] *= g
        encode(out, os.path.join(dest, name + '.ogg'))
        man[name] = {'id': c['id'], 'cuts': cuts, **({'loop': True} if name in LOOP else {})}
        cred[name] = {k: c[k] for k in ('id', 'name', 'auteur', 'url', 'licence')}
        print(f"{name} ← {c['id']} « {c['name']} » : {len(cuts)} événement(s), {len(out) / SR:.2f} s")
    json.dump(dict(sorted(man.items())), open(mpath, 'w'), ensure_ascii=False, indent=1)
    json.dump(dict(sorted(cred.items())), open(cpath, 'w'), ensure_ascii=False, indent=1)
    rows = ''.join(f"| `{n}` | [{c['name']}]({c['url']}) | {c['auteur']} |\n" for n, c in sorted(cred.items()))
    open(os.path.join(dest, 'CREDITS.md'), 'w').write(
        '# Sons\n\nTous sous licence [CC0](https://creativecommons.org/publicdomain/zero/1.0/) (domaine public), via [Freesound](https://freesound.org). '
        'Merci à leurs auteurs.\n\nRetouches : mono, silences rognés, découpage en événements, volume normalisé (voir `source/tools/keep_sounds.py`).\n\n'
        '| Fichier | Son d\'origine | Auteur |\n|---|---|---|\n' + rows)
    if fails: raise SystemExit('Non gardés :\n  ' + '\n  '.join(fails))


if __name__ == '__main__':
    main(sys.argv[1:])
