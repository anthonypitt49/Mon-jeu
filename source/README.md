# Code source de Snowfall Protocol

Le jeu en ligne est **un seul fichier**, `index.html`, à la racine du dépôt. Ce fichier est **fabriqué** à partir du code de ce dossier : on ne le modifie jamais à la main, on modifie `source/` puis on reconstruit.

## Ce qu'il y a ici

| Dossier ou fichier | Rôle |
|---|---|
| `src/shell.html` | La page : menus, interface, styles. |
| `src/00_core.js` … `src/99_start.js` | Le jeu, découpé en 36 parties assemblées dans l'ordre de leur numéro (moteur, textures, son, cartes, infectés, armes, co-op…). Le numéro de version est `GAME_VERSION` dans `src/00_core.js`. |
| `build.mjs` | Assemble `shell.html` et les 36 parties en un seul fichier. |
| `dev/` | Les tests automatiques : un navigateur sans écran joue des parties, seul ou à plusieurs, et vérifie que tout se passe bien. |
| `dev/runall.sh` | La batterie complète (environ 2 heures). |
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
