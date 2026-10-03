# Prochaines étapes

Note de passation entre sessions de travail : où en est le projet et ce qui vient ensuite.

## Fait (version 4.6)

- **Poste 7 en textures photo** (CC0, Poly Haven) : `tools/fetch_assets.py` prépare `../assets/poste7/`, `src/05p_photo.js` les applique après le chargement (qualité « moyen » et plus, jamais en `file://`). Sacs de sable : toile salie par le script (taches tirées de la photo de boue). Chaque pièce répétée (planche, tôle, sac) lit la texture à un endroit différent.
- **Éclairage d'ambiance photographié** (HDRI « Kloppenheim 07 »), ramené à la même intensité moyenne que l'ancien ciel calculé.
- **Ombrage d'ambiance N8AO** en qualité « élevé » et « ultra », pour l'instant au Poste 7 seulement (`aoStart`).
- Mesures (rendu logiciel, écarts relatifs) : photos + 10 % de temps de rendu et + 58 Mo de mémoire vidéo ; ombrage + 26 %.

## En cours : de vrais sons (Freesound)

**Sons choisis et gardés, volumes à régler à l'oreille.** Session du 3 octobre 2026 :
- Le propriétaire a choisi à l'oreille un son pour chacun des 24 usages, sur la page d'écoute https://claude.ai/artifact/1YEH1wDYxt3Q6fm6TaQJhB (les 96 candidats et `candidats.json` y restent, si un choix est à refaire : les récupérer avec l'outil Artifact, action `read` et `path`, dans `../assets/sounds/candidats/`, plutôt que de relancer la recherche, dont les résultats bougent).
- Ligne lancée : `python3 tools/keep_sounds.py tir_pistolet=385811 tir_fusil=221640 tir_pompe=266977 tir_auto=520935 recharge_chargeur=432141 culasse=204204 pompe=449612 douille=778024 impact_bois=349266 impact_terre=319229 impact_metal=392975 impact_chair=522091 pas_neige=420546 pas_boue=548384 pas_bois=533044 zombie_grogne=463721 zombie_cri=435651 zombie_attaque=560589 planche_arrachee=66780 marteau_clou=96138 explosion=609587 vent_neige=405601 artillerie_loin=320788 tir_lointain=842326`. Résultat dans `../assets/sounds/` (≈ 640 Ko), crédits dans `CREDITS.md`.
- `tir_auto` est une rafale d'AK-47 (9 balles, une toutes les 0,107 s, sans silence entre elles). Découpée balle par balle (`CUT` : écart 0,08 s, bond de 6 dB au lieu de 12) : 9 prises, le jeu en joue une par balle. Avant ce réglage, chaque balle aurait relancé 0,6 à 1 s de rafale.
- `dev/sounds.mjs` : les 24 sons chargés et joués, 0 erreur ; avec `Q=nosamples`, le secours synthétisé marche, 0 erreur.
- Copie d'essai privée du jeu avec ces sons, en solo (sans salon co-op) : https://claude.ai/artifact/6WPYsNChqCc7KrZd9wn6XL (`node build.mjs <fichier> --artifact`, titre changé, `assets/sounds/` publiés à côté, textures du Poste 7 recopiées depuis l'Artifact du jeu). L'Artifact du jeu lui-même (https://claude.ai/artifact/Y51hhvwwXabwNxVY76hLTm, avec salon co-op) n'a **pas** été touché : il reste en version 4.6 sans vrais sons.
- Avant, même session : `fetch_sounds.py` (recherches de secours, pas de doublon, un candidat par auteur) et découpage de `keep_sounds.py` corrigé (cri qui enfle, râle sans silence, déclic avant un tir).

Comment ça marche dans le jeu :
- `tools/keep_sounds.py` : mono, grondement retiré, chaque enregistrement découpé en prises (un tir, un pas, un râle…) recollées avec un court silence, crête à -1 dB, OGG Vorbis ; le vent devient une boucle sans raccord. Écrit `../assets/sounds/<nom>.ogg`, `manifest.json` (repères des prises), `credits.json` et `CREDITS.md`. Rejouer la ligne avec un seul `nom=numéro` remplace ce seul son.
- `src/02_audio.js` : `Sfx.loadBank()` charge le manifeste après le démarrage du son (jamais en `file://`, ni avec `?nosamples`) ; `Sfx.play(nom, pos, …)` tire une prise au hasard (jamais deux fois la même de suite), varie hauteur (± 4 %) et volume (± 10 %), passe par `Sfx.out` ; renvoie 0 si le son manque, et la fonction joue alors sa version synthétisée. Correspondances : voir `rec` dans `GUN_SOUNDS` et les appels à `this.play` (recharges : les prises dans l'ordre, une par déclic ; vent et pas dans la neige : Poste 7 seulement ; tranchées du Poste 7 : caillebotis ou boue).
- `dev/sounds.mjs` (dans `runall.sh`) : vérifie le chargement et que chaque son chargé est bien joué ; `SONS=<dossier>` pour essayer un autre jeu de sons, `Q=nosamples` pour le secours.

Reste à faire :
1. Régler les volumes à l'oreille avec le propriétaire, sur la copie d'essai : les gains des appels `this.play` (et `gain` dans `GUN_SOUNDS`) sont estimés d'après les sons synthétisés, pas écoutés. Après chaque réglage : reconstruire la copie (`--artifact`, même fichier) et la republier à la même adresse.
2. [à écouter] Sons d'une seule prise, donc répétés à l'identique (hauteur et volume varient un peu) : `tir_pistolet`, `tir_fusil`, `tir_pompe`, `douille`, `impact_bois`, `impact_metal`, `impact_chair`, `zombie_cri`, `planche_arrachee`, `marteau_clou`. Les plus fréquents : `impact_chair` (chaque balle qui touche), `douille` (chaque tir), `marteau_clou` (trois coups identiques à chaque planche). Si la répétition s'entend, choisir pour eux un enregistrement à plusieurs prises.
3. Vérifier sur iPhone : [à confirmer] les Safari un peu anciens ne décodent pas l'OGG ; ils garderont les sons synthétisés (secours prévu). Si c'est gênant, ajouter une copie `.m4a`.
4. Mise en ligne, une fois les volumes validés : augmenter `GAME_VERSION` (`src/00_core.js`) et `dev/version.json` (et `../version.json`), reconstruire `../index.html` (`node build.mjs`), fusionner dans `main` ; puis republier l'Artifact du jeu (avec salon co-op) en ajoutant `assets/sounds/` à ses fichiers.

## Puis

- Textures photo pour la Cité Atomique, le Pénitencier et le Filon (même méthode : ajouter un jeu dans `SETS` de `fetch_assets.py` et dans `PHOTO_SETS` de `05p_photo.js`), puis étendre l'ombrage d'ambiance aux autres cartes.
- Piste mémoire vidéo : compresser les textures en KTX2 (`ktx2-encoder`) si des machines modestes peinent.
