# Code source de Snowfall Protocol

Le jeu en ligne est **un seul fichier**, `index.html`, à la racine du dépôt. Ce fichier est **fabriqué** à partir du code de ce dossier : on ne le modifie jamais à la main, on modifie `source/` puis on reconstruit.

## Ce qu'il y a ici

| Dossier ou fichier | Rôle |
|---|---|
| `src/shell.html` | La page : menus, interface, styles. |
| `src/00_core.js` … `src/99_start.js` | Le jeu, découpé en 41 parties assemblées dans l'ordre de leur numéro (moteur, textures, son, cartes, infectés, armes, co-op…). Le numéro de version est `GAME_VERSION` dans `src/00_core.js`. |
| `build.mjs` | Assemble `shell.html` et les 41 parties en un seul fichier. |
| `dev/` | Les tests automatiques : un navigateur sans écran joue des parties, seul ou à plusieurs, et vérifie que tout se passe bien. |
| `dev/runall.sh` | La batterie complète (environ 2 heures). |
| `dev/armes.mjs` | Planche de contrôle des armes (profil, trois quarts, en main, en visée) dans `dev/shots/`, pour dessiner ou retoucher une arme (`src/08b_gunmodels.js`). |
| `tools/fetch_assets.py` | Télécharge et prépare les textures photo et l'éclairage d'une carte (Poly Haven, CC0) dans `../assets/<carte>/` : `python3 tools/fetch_assets.py cite` (`objets` : photos des objets, communes aux quatre cartes ; options par photo : `gray`, `contrast`, `sat`, `renorm`, `nkey`, `flat`, `crop`, `ao`, `rgain`, `src: 'acg'` pour ambientCG) ; `--petit` refait seulement les versions allégées (`_s`, 512 px) chargées en graphismes « bas ». |
| `dev/objets.mjs` | Vues rapprochées des objets posés sur une carte (une par sorte d'objet, 6 par planche) dans `dev/shots/` : `node objets.mjs cite 2 avant` ; `Q=nophoto` pour la version dessinée ; `FAM=foin,marbre` : une vue par famille de matière. |
| `tools/make_anims.mjs` | Animations capturées des infectés : clips de la Universal Animation Library 1 et 2 de Quaternius (CC0, versions Standard) reciblés sur le squelette procédural de 20 os, écrits dans `src/09d_zanims.js` (`node tools/make_anims.mjs <dossier des GLB UAL> [dossier des BVH 100STYLE]` ; `--liste` montre les clips), et démarches de la capture 100STYLE (CC-BY 4.0 : cycle extrait de chaque prise, couture lissée, vitesse mesurée sur les pieds). Licences : `tools/licences/`. |
| `tools/make_zombies.py` | Fabrique les infectés réalistes (un type par époque) dans `../assets/zombies/` : corps, peaux et vêtements MakeHuman (CC0) assemblés par l'extension MPFB2 dans Blender sans écran (module Python `bpy` 4.2), allégés, réunis en une seule texture, zombifiés en 3D, exportés en GLB avec le squelette « game_engine » plus un os de mâchoire (lèvre du bas, dents du bas et langue). Installation en tête du fichier ; `…/python make_zombies.py [1917|1957|1933|1880|identifiant]`. |
| `dev/machoire.mjs` | Mâchoire des infectés réalistes en gros plan (fermée, à moitié, grande ouverte, de trois quarts) : `node machoire.mjs pe_a` → `dev/shots/machoire_<modèle>.jpg` ; `GRIS=1` forme seule, sans la peinture. |
| `dev/anims.mjs` | Allures des infectés de profil, sur place (marche, marche rapide, course, sprint, attaque), 6 instants : `node anims.mjs penitencier 2` → `dev/shots/anims_<carte>.jpg` ; `FRONT=1` de face, `NOANIM=1` animation procédurale (comparaison), `GAITS=1` les cinq démarches des marcheurs (`anims_demarches_<carte>.jpg`). |
| `dev/yeux.mjs` | Yeux lumineux des infectés : quatre infectés à 5, 10, 15 et 20 m, vue normale, zoom, de près et de dos (`node yeux.mjs penitencier 2 [x z cap]` → `dev/shots/yeux_<carte>.jpg`). |
| `dev/zreal.mjs` | Infectés réalistes vus en jeu (marche, course, à quatre pattes, attaque, morts, puis gore : membre arraché, jambe perdue, explosion, tête) : `node zreal.mjs penitencier 2` → `dev/shots/zreal_<carte>_0.jpg` et `_1.jpg`. |
| `dev/zviewer/` | Visionneuse d'un modèle GLB (face, trois-quarts, dos, visage) : `node zviewer/shot.mjs zombies/p7_a.glb zviewer/out/p7_a`. |
| `dev/matieres.mjs` | Échantillons des matières d'objets (un cube et un cylindre par famille, avec la vraie matière du jeu) sous l'éclairage d'une carte : `node matieres.mjs cite 2 [foin,marbre]`. Plus fiable que les vues d'objets pour juger une photo : la caméra n'est jamais ramenée dans la zone jouable. |
| `dev/photo.mjs` | Visite d'une carte en textures photo (`node photo.mjs cite 2` → captures dans `dev/shots/`) ; avec `CHECK=1`, vérifie seulement que chaque matière prévue a reçu sa photo (dans `runall.sh`). `dev/photoperf.mjs <carte>` mesure le coût des photos et de l'ombrage. |
| `dev/gels.mjs` | Gels et à-coups : compte, phase par phase (chargement, menu, début de partie, puis une partie scriptée), les shaders compilés, les textures envoyées à la carte graphique et les tâches longues : `node gels.mjs poste7 2` doit finir par `TARDIFS 0` (aucun shader compilé après l'écran de chargement). `MATS=1` nomme les matières et leurs paramètres. |
| `dev/chargement.mjs`, `dev/cartes.mjs` | L'écran de chargement à l'œil (chargement, accueil, carton de lancement, jeu) ; photos des cartes de cet écran (`../assets/cartes/<carte>.jpg`), prises en ultra : `CAM='s,0,0' OUT=0 node cartes.mjs filon`. |
| `dev/caisse.mjs`, `dev/armesmur.mjs` | Un tirage de la caisse de ravitaillement filmé en 8 vues ; chaque arme murale photographiée de face et de biais (`DIST=` pour s'approcher). |
| `tools/fetch_sounds.py` | Cherche sur Freesound (CC0) 4 candidats par son et fabrique une page d'écoute, dans `../assets/sounds/candidats/` (non publié). Clé : variable d'environnement `FREESOUND_API_KEY`. |
| `tools/keep_sounds.py` | Prépare les sons choisis à l'oreille (mono, découpés en prises, volume normalisé, OGG et MP3 pour Safari et les iPhone) dans `../assets/sounds/`, avec `manifest.json` et `CREDITS.md`. `--mp3` refait seulement les MP3. |
| `tools/make_icons.mjs` | Dessine les icônes de l'écran d'accueil (`../assets/icons/`) pour l'appli web décrite par `../manifest.webmanifest` : ajouté à l'écran d'accueil, le jeu s'ouvre en plein écran (seule façon sur iPhone). |
| `../assets/` | Les textures photo, les sons et les icônes servis avec le jeu, et leurs crédits. |
| `dev/version.json` | La version annoncée aux joueurs déjà connectés (le jeu se recharge tout seul quand elle change). |

Les dossiers `dev/node_modules/` (outils téléchargés), `dev/shots/` (captures) et `dev/results/` (résultats) ne sont pas dans le dépôt : ils se recréent.

## Fabriquer le jeu

Il faut [Node.js](https://nodejs.org) (version 20 ou plus récente).

```sh
cd source
node build.mjs                                   # écrit ../index.html (le jeu en ligne)
node build.mjs snowfall.artifact.html --artifact  # version pour claude.ai
```

## Lancer les tests

```sh
cd source/dev
npm install                        # une seule fois : outils de test
npx playwright install chromium    # une seule fois, sur un ordinateur personnel
node ../build.mjs index.html       # version de test du jeu
sh servers.sh                      # serveurs locaux : page, connexion directe, relais
node feat.mjs                      # un test (ici : partie solo, armes, atouts)
bash runall.sh                     # tous les tests ; résumé dans results/summary.txt
```

Chaque test affiche `ERRORS 0` ou `ÉCARTS 0` quand tout va bien. Les erreurs « WebSocket » vers les relais publics (mosquitto, emqx, hivemq, eclipse) ne viennent pas du jeu : la machine de test n'a simplement pas le droit de les joindre.

## Publier une nouvelle version

1. Modifier `src/`, puis augmenter `GAME_VERSION` dans `src/00_core.js` et la valeur de `dev/version.json`.
2. `node build.mjs`, puis recopier `dev/version.json` à la racine du dépôt.
3. Passer la batterie de tests.
4. Envoyer sur GitHub (`main`) : GitHub Pages met le jeu en ligne en une minute environ.
