# Prochaines étapes

Note de passation entre sessions de travail : où en est le projet et ce qui vient ensuite.

## Fait (version 4.6)

- **Poste 7 en textures photo** (CC0, Poly Haven) : `tools/fetch_assets.py` prépare `../assets/poste7/`, `src/05p_photo.js` les applique après le chargement (qualité « moyen » et plus, jamais en `file://`). Sacs de sable : toile salie par le script (taches tirées de la photo de boue). Chaque pièce répétée (planche, tôle, sac) lit la texture à un endroit différent.
- **Éclairage d'ambiance photographié** (HDRI « Kloppenheim 07 »), ramené à la même intensité moyenne que l'ancien ciel calculé.
- **Ombrage d'ambiance N8AO** en qualité « élevé » et « ultra », pour l'instant au Poste 7 seulement (`aoStart`).
- Mesures (rendu logiciel, écarts relatifs) : photos + 10 % de temps de rendu et + 58 Mo de mémoire vidéo ; ombrage + 26 %.

## Ensuite : de vrais sons (Freesound)

1. La clé est dans la variable d'environnement `FREESOUND_API_KEY` (réglages de l'environnement cloud). Elle n'apparaît que dans une **nouvelle** session.
2. `python3 tools/fetch_sounds.py` télécharge 4 candidats CC0 par son (liste `WANT` dans le script) dans `../assets/sounds/candidats/`, avec une page d'écoute `index.html`. Ce dossier n'est pas publié.
3. Publier la page d'écoute pour que le propriétaire du jeu choisisse **à l'oreille** (Claude ne peut pas écouter les sons ; les notes Freesound ne suffisent pas).
4. Garder les sons choisis : rogner les silences, normaliser, mono, OGG (installer `ffmpeg` si besoin), dans `../assets/sounds/`, avec un `CREDITS.md`.
5. Brancher dans `src/02_audio.js` : charger les fichiers (`fetch` + `decodeAudioData`), jouer à travers `Sfx.out(pos)` (spatialisation, réverbération et écho déjà en place), avec de légères variations de hauteur et de volume ; garder les sons synthétisés en secours (hors ligne, `file://`, échec).

## Puis

- Textures photo pour la Cité Atomique, le Pénitencier et le Filon (même méthode : ajouter un jeu dans `SETS` de `fetch_assets.py` et dans `PHOTO_SETS` de `05p_photo.js`), puis étendre l'ombrage d'ambiance aux autres cartes.
- Piste mémoire vidéo : compresser les textures en KTX2 (`ktx2-encoder`) si des machines modestes peinent.
