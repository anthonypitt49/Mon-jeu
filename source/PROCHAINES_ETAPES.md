# Prochaines étapes

Note de passation entre sessions de travail : où en est le projet et ce qui vient ensuite.

## Fait (version 4.9) : armes en main réalistes

Mise en ligne le 4 octobre 2026 : `main` (GitHub Pages) et l'Artifact du jeu avec salon co-op. Tests avant mise en ligne : `feat.mjs`, `mapplay` sur les quatre cartes, `touch.mjs`, `sounds.mjs`, `volumes.mjs`, `coop.mjs`, `coopmap.mjs` (erreurs MQTT du conteneur seulement), changement d'arme sans reconstruction. `volumes.mjs` a échoué une fois de justesse sur un son de fond du canal « reste » pendant la mesure du tir (0,0236 pour un fond à 0,0192, marge de 20 %) ; relancé, il passe.

Demande du propriétaire : « prochaine étape réalisme ». Captures à l'appui, les armes en main (boîtes et cylindres sombres, mains en pavés) étaient l'écart le plus visible, à l'écran en permanence sur les quatre cartes ; le propriétaire a choisi de commencer par là.

- **`src/08b_gunmodels.js`** (nouveau) : armes d'époque aux cotes réelles, dessinées en code. Atelier `gunKit` : pièces taillées dans un profil de côté extrudé aux arêtes arrondies (`pr`, `bx`, `curve` pour le chargeur cintré), pièces tournées autour de l'axe du canon (`lt`, `cy`), arcs (pontets), anneaux, cylindres verticaux. Les pièces fixes sont fusionnées par matière (`gunMerge`, y compris les mains) : 3 à 11 appels de dessin par arme, ≈ 8 000 triangles avec les mains.
- Modèles : Colt 1911 (pistolet, la glissière recule à chaque tir), Webley Mk VI (revolver, le barillet tourne sur l'axe du canon), Mauser Kar98k (fusil à verrou ; le fusil de précision y ajoute une lunette), Winchester 1897 « trench gun » (pare-chaleur perforé, pompe rainurée tenue par la main gauche), Thompson M1921 (canon à ailettes, compensateur, poignée avant verticale), carabine M1, AK-47 à crosse bois (chargeur cintré), Lewis (manchon en aluminium, chargeur camembert qui tourne), lance-grenades type M79 ; le rayonneur et le prototype cryo restent des armes d'un autre monde, redessinés dans le même atelier. Couteau de tranchée Mark I (poing américain en laiton) et grenade Mills.
- Matières peintes au démarrage (`gunMaterials`) : acier bruni brossé et usé par endroits, acier phosphaté, noyer verni (fil dans la longueur de la pièce), bakélite quadrillée, aluminium, laiton, cuir des gants, laine kaki des manches. Version améliorée : le givre veiné de bleu remplace acier et bois, comme avant.
- **Mains gantées** (`gkGripHand`, `gkForeHand`) : doigts en arcs qui enserrent la poignée, pouce le long du flanc, index sur la détente, main gauche en coupe sous la droite pour le pistolet et le revolver, ou sous le garde-main, poignet, manchette et manche de capote.
- Arme en main : tout ce qui passe à moins de 7 cm de l'œil est coupé (`clipViewmodel`, plan de coupe sur des copies des matières) ; en visée, la crosse contre la joue ne bouche plus la vue.
- Coût : 10 à 40 ms pour construire une arme sur la machine de test. Chaque arme en main est gardée après sa première construction (`VM.cache`) ; la caisse mystère et l'établi réutilisent un modèle par arme (`gunShow`), sinon la caisse, qui change d'arme toutes les 0,1 à 0,35 s, en reconstruisait (et en accumulait) des dizaines.
- Banc de contrôle : `dev/armes.mjs [armes] [up]` → `dev/shots/armes_<arme>.png` (profil, trois quarts, en main, en visée).

Reste à faire sur les armes :
1. [à vérifier] Le rendu sur iPhone (qualité « bas », textures 256 px) et le temps de construction de la première arme achetée.
2. Animations : la main gauche ne suit pas encore le chargeur pendant le rechargement ; le chien du revolver ne bascule pas.

## Fait (version 4.8) : sons sur iPhone, plein écran sur téléphone

Retour du propriétaire sur la 4.7 : sur iPhone, les sons ne marchaient pas, et le jeu se jouait avec la barre d'adresse de Safari.

- **Sons en MP3 en plus de l'OGG.** Safari (tous les iPhone) ne lit pas l'OGG : `keep_sounds.py` écrit aussi `<nom>.mp3` (`--mp3` les refait depuis les `.ogg` déjà gardés, sans les candidats), et `Sfx.loadBank()` prend l'OGG quand le navigateur sait le lire (`canPlayType`), sinon, ou si son décodage échoue, le MP3. `?mp3` force le MP3 (tests).
- **Recalage des MP3.** Le codeur MP3 ajoute ≈ 25 ms de silence au début ; Chrome le retire, d'autres navigateurs peut-être pas. Le manifeste note pour chaque son où commence le premier échantillon franc (`lead`, seuil 0,03) ; le jeu mesure le même repère dans le MP3 décodé (`Sfx.shift`) et décale toutes les prises de la médiane des écarts (le silence du codeur est le même pour tous les fichiers ; une attaque brutale franchit le seuil quelques ms trop tôt). Mesuré : 0 ms dans Chrome ; 25 ms partout avec des MP3 sans en-tête de retrait (`-write_xing 0`), boucle du vent comprise.
- **Bouton silencieux de l'iPhone.** Web Audio y obéit (pas les vidéos) : `navigator.audioSession.type = 'playback'` (API récente de Safari ; [à confirmer] à partir de quelle version d'iOS) fait jouer le jeu même en mode silencieux ; en contrepartie, la musique d'une autre appli s'arrête quand le son du jeu démarre. Le son en veille après un appel ou un verrouillage (« interrupted ») repart au toucher suivant (`Sfx.wake`).
- **Plein écran.** Safari sur iPhone n'a pas de plein écran pour une page (seulement pour les vidéos) : la seule façon de jouer sans barre d'adresse est d'ajouter le jeu à l'écran d'accueil. `../manifest.webmanifest` (affichage `fullscreen`, paysage) et les balises « appli web » de `shell.html` (retirées de la version claude.ai par `build.mjs`), icônes dans `../assets/icons/` (`tools/make_icons.mjs`). Le bouton « ⛶ Plein écran » de l'en-tête, encadré et bien visible au tactile, passe en plein écran là où c'est possible (ordinateur, Android) ; sinon il ouvre une explication en trois étapes (Partager → Sur l'écran d'accueil → lancer depuis l'icône). Dans une page hôte sans permission (Artifact claude.ai), l'explication renvoie à l'adresse du jeu. Lancé depuis l'icône (`navigator.standalone`), le bouton disparaît. Au tactile, le lien « Commandes » (touches du clavier) et l'astuce « Échap » sont masqués ; l'en-tête ne déborde plus sur iPhone, à l'horizontale comme à la verticale.
- [à confirmer] Depuis l'icône, iOS garde à part les réglages, le classement et la banque du Filon (stockage séparé de celui de Safari) : c'est dit dans l'explication.
- Tests : `dev/fullscreen.mjs` (ordinateur, iPhone dans Safari, iPhone depuis l'icône, jeu dans une page hôte ; manifeste et icônes servis) et `Q=mp3 node sounds.mjs`, ajoutés à `runall.sh`.

Vérifié par le propriétaire sur son iPhone (4 octobre 2026) : les vrais sons marchent, et le plein écran aussi (jeu ajouté à l'écran d'accueil).

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
- `tools/keep_sounds.py` : mono, grondement retiré, chaque enregistrement découpé en prises (un tir, un pas, un râle…) recollées avec un court silence, crête à -1 dB, OGG Vorbis (et MP3 depuis la 4.8) ; le vent devient une boucle sans raccord. Écrit `../assets/sounds/<nom>.ogg`, `manifest.json` (repères des prises), `credits.json` et `CREDITS.md`. Rejouer la ligne avec un seul `nom=numéro` remplace ce seul son.
- `src/02_audio.js` : `Sfx.loadBank()` charge le manifeste après le démarrage du son (jamais en `file://`, ni avec `?nosamples`) ; `Sfx.play(nom, pos, …)` tire une prise au hasard (jamais deux fois la même de suite), varie hauteur (± 4 %) et volume (± 10 %), passe par `Sfx.out` ; renvoie 0 si le son manque, et la fonction joue alors sa version synthétisée. Correspondances : voir `rec` dans `GUN_SOUNDS` et les appels à `this.play` (recharges : les prises dans l'ordre, une par déclic ; vent et pas dans la neige : Poste 7 seulement ; tranchées du Poste 7 : caillebotis ou boue).
- `dev/sounds.mjs` (dans `runall.sh`) : vérifie le chargement et que chaque son chargé est bien joué ; `SONS=<dossier>` pour essayer un autre jeu de sons, `Q=nosamples` pour le secours. `dev/volumes.mjs` (dans `runall.sh`) : un analyseur par canal ; chaque son sort sur sa famille et seulement elle, 0 % coupe tout, les cinq curseurs s'enregistrent.

Marteau des barricades validé à l'oreille par le propriétaire en 4.7 (gain 0,13 dans `hammer`, `02_audio.js`).

Reste à vérifier sur les sons :
1. [à écouter] Sons d'une seule prise, donc répétés à l'identique (hauteur et volume varient un peu) : `tir_pistolet`, `tir_fusil`, `tir_pompe`, `douille`, `impact_bois`, `impact_metal`, `impact_chair`, `zombie_cri`, `planche_arrachee`, `marteau_clou`. Les plus fréquents : `impact_chair` (chaque balle qui touche), `douille` (chaque tir), `marteau_clou` (trois coups identiques à chaque planche). Si la répétition s'entend, choisir pour eux un enregistrement à plusieurs prises.
2. ~~Vérifier sur iPhone~~ : les sons ne marchaient pas sur iPhone en 4.7 ; copie MP3 ajoutée en 4.8 (voir plus haut).

## Fait (version 4.6)

- **Poste 7 en textures photo** (CC0, Poly Haven) : `tools/fetch_assets.py` prépare `../assets/poste7/`, `src/05p_photo.js` les applique après le chargement (qualité « moyen » et plus, jamais en `file://`). Sacs de sable : toile salie par le script (taches tirées de la photo de boue). Chaque pièce répétée (planche, tôle, sac) lit la texture à un endroit différent.
- **Éclairage d'ambiance photographié** (HDRI « Kloppenheim 07 »), ramené à la même intensité moyenne que l'ancien ciel calculé.
- **Ombrage d'ambiance N8AO** en qualité « élevé » et « ultra », pour l'instant au Poste 7 seulement (`aoStart`).
- Mesures (rendu logiciel, écarts relatifs) : photos + 10 % de temps de rendu et + 58 Mo de mémoire vidéo ; ombrage + 26 %.

## Puis

- Textures photo pour la Cité Atomique, le Pénitencier et le Filon (même méthode : ajouter un jeu dans `SETS` de `fetch_assets.py` et dans `PHOTO_SETS` de `05p_photo.js`), puis étendre l'ombrage d'ambiance aux autres cartes.
- Piste mémoire vidéo : compresser les textures en KTX2 (`ktx2-encoder`) si des machines modestes peinent.
