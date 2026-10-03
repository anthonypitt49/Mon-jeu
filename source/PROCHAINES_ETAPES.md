# Prochaines étapes

Note de passation entre sessions de travail : où en est le projet et ce qui vient ensuite.

## Fait (version 4.6)

- **Poste 7 en textures photo** (CC0, Poly Haven) : `tools/fetch_assets.py` prépare `../assets/poste7/`, `src/05p_photo.js` les applique après le chargement (qualité « moyen » et plus, jamais en `file://`). Sacs de sable : toile salie par le script (taches tirées de la photo de boue). Chaque pièce répétée (planche, tôle, sac) lit la texture à un endroit différent.
- **Éclairage d'ambiance photographié** (HDRI « Kloppenheim 07 »), ramené à la même intensité moyenne que l'ancien ciel calculé.
- **Ombrage d'ambiance N8AO** en qualité « élevé » et « ultra », pour l'instant au Poste 7 seulement (`aoStart`).
- Mesures (rendu logiciel, écarts relatifs) : photos + 10 % de temps de rendu et + 58 Mo de mémoire vidéo ; ombrage + 26 %.

## Ensuite : de vrais sons (Freesound)

**Bloqué sur la clé.** Session du 3 octobre 2026 : Freesound refuse `FREESOUND_API_KEY` (401 « Invalid token »). La valeur présente fait 47 caractères avec deux « _ », alors qu'une clé Freesound fait 40 lettres et chiffres : ce n'est sans doute pas la bonne valeur. La bonne est la « Client secret/Api key » de https://freesound.org/apiv2/apply ; la remplacer dans les réglages de l'environnement cloud, puis ouvrir une **nouvelle** session.

Déjà prêt (fonctionne avec des sons factices ; aucun vrai son n'est encore dans le dépôt) :
- `tools/keep_sounds.py` (étape 4) : mono, grondement retiré, chaque enregistrement découpé en prises (un tir, un pas, un râle…) recollées avec un court silence, crête à -1 dB, OGG Vorbis ; le vent devient une boucle sans raccord. Écrit `../assets/sounds/<nom>.ogg`, `manifest.json` (repères des prises), `credits.json` et `CREDITS.md`.
- `src/02_audio.js` (étape 5) : `Sfx.loadBank()` charge le manifeste après le démarrage du son (jamais en `file://`, ni avec `?nosamples`) ; `Sfx.play(nom, pos, …)` tire une prise au hasard (jamais deux fois la même de suite), varie hauteur (± 4 %) et volume (± 10 %), passe par `Sfx.out` ; renvoie 0 si le son manque, et la fonction joue alors sa version synthétisée. Correspondances : voir `rec` dans `GUN_SOUNDS` et les appels à `this.play` (recharges : les prises dans l'ordre, une par déclic ; vent et pas dans la neige : Poste 7 seulement, les autres cartes n'ont pas de neige ; tranchées du Poste 7 : caillebotis ou boue).
- `assets/sounds/manifest.json` vide (`{}`) : le jeu ne trouve aucun son et garde les siens, sans erreur 404.
- `dev/sounds.mjs` (dans `runall.sh`) : vérifie le chargement et que chaque son chargé est bien joué ; `SONS=<dossier>` pour essayer un autre jeu de sons, `Q=nosamples` pour le secours.

Reste à faire, une fois la clé corrigée :
1. `python3 tools/fetch_sounds.py` : 4 candidats CC0 par son et page d'écoute dans `../assets/sounds/candidats/` (non publié).
2. Publier la page d'écoute (Artifact avec les fichiers .ogg) pour que le propriétaire du jeu choisisse **à l'oreille** (Claude ne peut pas écouter ; les notes Freesound ne suffisent pas). La page fabrique la ligne `python3 tools/keep_sounds.py nom=numéro …` à recopier.
3. Lancer cette ligne, puis `cd dev && sh servers.sh && node sounds.mjs` (servi en HTTP) et vérifier le nombre de prises trouvées par son (affiché par le script ; un enregistrement mal découpé se règle dans `CUT`).
4. Régler les volumes à l'oreille avec le propriétaire : les gains des appels `this.play` sont estimés d'après les sons synthétisés, pas écoutés.
5. Vérifier sur iPhone : [à confirmer] les Safari un peu anciens ne décodent pas l'OGG ; ils garderont les sons synthétisés (secours prévu). Si c'est gênant, ajouter une copie `.m4a`.
6. Version : augmenter `GAME_VERSION` et `version.json` quand les vrais sons entrent (le joueur entend la différence).

## Puis

- Textures photo pour la Cité Atomique, le Pénitencier et le Filon (même méthode : ajouter un jeu dans `SETS` de `fetch_assets.py` et dans `PHOTO_SETS` de `05p_photo.js`), puis étendre l'ombrage d'ambiance aux autres cartes.
- Piste mémoire vidéo : compresser les textures en KTX2 (`ktx2-encoder`) si des machines modestes peinent.
