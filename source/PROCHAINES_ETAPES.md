# Prochaines étapes

Note de passation entre sessions de travail : où en est le projet et ce qui vient ensuite.

## Fait (version 4.7) : de vrais sons (Freesound, CC0) et des réglages de volume

Mise en ligne le 3 octobre 2026 : `main` (GitHub Pages) et l'Artifact du jeu avec salon co-op (https://claude.ai/artifact/Y51hhvwwXabwNxVY76hLTm), republié avec `assets/sounds/` à côté de ses fichiers. La copie d'essai privée en solo a été supprimée à la demande du propriétaire.

- Le propriétaire a choisi à l'oreille un son pour chacun des 24 usages, sur la page d'écoute https://claude.ai/artifact/1YEH1wDYxt3Q6fm6TaQJhB (les 96 candidats et `candidats.json` y restent, si un choix est à refaire : les récupérer avec l'outil Artifact, action `read` et `path`, dans `../assets/sounds/candidats/`, plutôt que de relancer la recherche, dont les résultats bougent).
- Ligne lancée : `python3 tools/keep_sounds.py tir_pistolet=385811 tir_fusil=221640 tir_pompe=266977 tir_auto=520935 recharge_chargeur=432141 culasse=204204 pompe=449612 douille=778024 impact_bois=349266 impact_terre=319229 impact_metal=392975 impact_chair=522091 pas_neige=420546 pas_boue=548384 pas_bois=533044 zombie_grogne=463721 zombie_cri=435651 zombie_attaque=560589 planche_arrachee=66780 marteau_clou=96138 explosion=609587 vent_neige=405601 artillerie_loin=320788 tir_lointain=842326`. Résultat dans `../assets/sounds/` (≈ 640 Ko), crédits dans `CREDITS.md`.
- `tir_auto` est une rafale d'AK-47 (9 balles, une toutes les 0,107 s, sans silence entre elles). Découpée balle par balle (`CUT` : écart 0,08 s, bond de 6 dB au lieu de 12) : 9 prises, le jeu en joue une par balle.
- `fetch_sounds.py` : recherches de secours, pas de doublon, un candidat par auteur. Découpage de `keep_sounds.py` corrigé (cri qui enfle, râle sans silence, déclic avant un tir).
- Retour d'écoute : seul le marteau des barricades reclouées était trop fort (trois coups à chaque planche) : gain 0,32 → 0,13 (≈ -8 dB) dans `hammer`.
- Réglages : « VOLUME GÉNÉRAL » (80 % par défaut), puis une section dépliable « VOLUMES DÉTAILLÉS » (fermée par défaut) : ARMES, INFECTÉS, AMBIANCE, MUSIQUE (`settings.volWeapons`, `volZombies`, `volAmb`, `music`, 100 %, 100 %, 100 %, 50 % par défaut). Dans `02_audio.js`, une famille = un canal (`Sfx.weapons`, `Sfx.zombies`, `Sfx.amb`, le reste sur `Sfx.sfx`) avec son propre départ de réverbération (`.verb`) et, pour les armes, d'écho (`.echo`), baissés avec elle : à 0 %, plus rien ne passe. Armes : tirs, recharges, douilles, impacts de balles, explosions et obus, couteau, gel. Infectés : voix et pas du géant d'acier. Ambiance : vent, pluie, ressac, grondement, artillerie et tirs au loin, hurlements, tonnerre, gouttes, corne de brume, mouettes. Le reste (pas, barricades, portes, machines, sirènes) suit le volume général ; l'interface aussi.
- Volumes appliqués par affectation directe (`gain.value`) : avec un lissage `setTargetAtTime`, Chrome n'avançait pas tant que le canal était silencieux, et le premier tir après avoir coupé les armes sortait à -10 dB au lieu de 0.
- Tests avant mise en ligne (une sélection, pas toute la batterie de `runall.sh`) : `sounds.mjs`, `Q=nosamples`, `volumes.mjs`, `feat.mjs`, `mapplay` sur les quatre cartes, `coop`, `coopmap`. Dans un conteneur cloud, `coop.mjs` compte 16 erreurs et `coopmap.mjs` 19 : ce sont toutes des connexions refusées aux serveurs MQTT publics (proxy du conteneur), pas des erreurs du jeu ; le salon, le jeu à deux, les achats, la réanimation et la fin de partie passent quand même.
- GitHub Pages : la première construction de la 4.7 a échoué sur une panne de GitHub (erreur 503 de son API), et la relance est restée bloquée dans la file. Un nouveau push sur `main` relance la construction ; vérifier ensuite que `version.json` en ligne affiche la bonne version.

Comment ça marche dans le jeu :
- `tools/keep_sounds.py` : mono, grondement retiré, chaque enregistrement découpé en prises (un tir, un pas, un râle…) recollées avec un court silence, crête à -1 dB, OGG Vorbis ; le vent devient une boucle sans raccord. Écrit `../assets/sounds/<nom>.ogg`, `manifest.json` (repères des prises), `credits.json` et `CREDITS.md`. Rejouer la ligne avec un seul `nom=numéro` remplace ce seul son.
- `src/02_audio.js` : `Sfx.loadBank()` charge le manifeste après le démarrage du son (jamais en `file://`, ni avec `?nosamples`) ; `Sfx.play(nom, pos, …)` tire une prise au hasard (jamais deux fois la même de suite), varie hauteur (± 4 %) et volume (± 10 %), passe par `Sfx.out` ; renvoie 0 si le son manque, et la fonction joue alors sa version synthétisée. Correspondances : voir `rec` dans `GUN_SOUNDS` et les appels à `this.play` (recharges : les prises dans l'ordre, une par déclic ; vent et pas dans la neige : Poste 7 seulement ; tranchées du Poste 7 : caillebotis ou boue).
- `dev/sounds.mjs` (dans `runall.sh`) : vérifie le chargement et que chaque son chargé est bien joué ; `SONS=<dossier>` pour essayer un autre jeu de sons, `Q=nosamples` pour le secours. `dev/volumes.mjs` (dans `runall.sh`) : un analyseur par canal ; chaque son sort sur sa famille et seulement elle, 0 % coupe tout, les cinq curseurs s'enregistrent.

Marteau des barricades validé à l'oreille par le propriétaire en 4.7 (gain 0,13 dans `hammer`, `02_audio.js`).

Reste à vérifier sur les sons :
1. [à écouter] Sons d'une seule prise, donc répétés à l'identique (hauteur et volume varient un peu) : `tir_pistolet`, `tir_fusil`, `tir_pompe`, `douille`, `impact_bois`, `impact_metal`, `impact_chair`, `zombie_cri`, `planche_arrachee`, `marteau_clou`. Les plus fréquents : `impact_chair` (chaque balle qui touche), `douille` (chaque tir), `marteau_clou` (trois coups identiques à chaque planche). Si la répétition s'entend, choisir pour eux un enregistrement à plusieurs prises.
2. Vérifier sur iPhone : [à confirmer] les Safari un peu anciens ne décodent pas l'OGG ; ils garderont les sons synthétisés (secours prévu). Si c'est gênant, ajouter une copie `.m4a`.

## Fait (version 4.6)

- **Poste 7 en textures photo** (CC0, Poly Haven) : `tools/fetch_assets.py` prépare `../assets/poste7/`, `src/05p_photo.js` les applique après le chargement (qualité « moyen » et plus, jamais en `file://`). Sacs de sable : toile salie par le script (taches tirées de la photo de boue). Chaque pièce répétée (planche, tôle, sac) lit la texture à un endroit différent.
- **Éclairage d'ambiance photographié** (HDRI « Kloppenheim 07 »), ramené à la même intensité moyenne que l'ancien ciel calculé.
- **Ombrage d'ambiance N8AO** en qualité « élevé » et « ultra », pour l'instant au Poste 7 seulement (`aoStart`).
- Mesures (rendu logiciel, écarts relatifs) : photos + 10 % de temps de rendu et + 58 Mo de mémoire vidéo ; ombrage + 26 %.

## Puis

- Textures photo pour la Cité Atomique, le Pénitencier et le Filon (même méthode : ajouter un jeu dans `SETS` de `fetch_assets.py` et dans `PHOTO_SETS` de `05p_photo.js`), puis étendre l'ombrage d'ambiance aux autres cartes.
- Piste mémoire vidéo : compresser les textures en KTX2 (`ktx2-encoder`) si des machines modestes peinent.
