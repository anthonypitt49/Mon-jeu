# Prochaines étapes

Note de passation entre sessions de travail : où en est le projet et ce qui vient ensuite.

## Fait (version 7.0) : Poste 7 agrandi (sous-sol, étage, grande zone extérieure)

Choix du propriétaire (questions du 28 octobre) : agrandir d'abord le Poste 7, avec les quatre sortes d'agrandissement (nouvelles zones, étages et sous-sols, grande zone extérieure, plus de détails) ; ensuite des grandes quêtes d'environ une heure, qui allongent les quêtes actuelles de chaque carte.

- **Carte** (`src/20_map_poste7.js`) : grille 40 × 32 → 58 × 48 carreaux (116 × 96 m), 5 → 8 zones. **La Sape** (porte au bout de la tranchée de soutien, 1250) : boyau, galerie boisée couverte qui descend de 1,6 m, puis chambre de mine (explosifs, exploseur, poste d'écoute, wagonnet sur rails). **La Ferme de Bellevue** (porte au sud du dépôt, 1000 ; galerie vers la chambre de mine, 750) : cour de ferme en ruine de 26 × 24 m à ciel ouvert, six barricades, pans de mur isolés (pas d'enclos : les infectés s'y coinceraient), grange calcinée, puits, tombes fraîches, trou d'obus, revolver au mur, caisse. **Le Poste d'observation** (porte derrière l'abri, 1250) : rampe de terre jusqu'à une plate-forme surélevée de 1,8 m d'où l'on voit tout le no man's land, mitrailleuse, tour de guet, bâche, drapeau qui claque, caisse.
- **Moteur** (`03_map.js`, `05_world.js`) : `floorAt` et `roofAt` ; parois des tranchées du sol réel au sommet, plafond des abris qui suit le sol (galerie basse), terre au-dessus des entrées de galerie et en surface au-dessus de la galerie, rampes et barricades posées sur le sol réel (plate-forme), poteaux porteurs du sol au plafond, style `STYLE_SAPE` (coffrage, plafond de planches, terre battue, rails).
- **Décor** : `src/20c_poste7_ext.js`. Deux lumières de plus en qualité moyenne et élevée (chambre de mine, feu de la ferme).
- **Fluidité** : index des obstacles par carreau (`propsNear`, 03_map.js) : chaque infecté ne teste plus que les obstacles qui l'entourent (avant : tous ceux de la carte, à chaque image). Banc à 30 infectés sur la même machine : 6.11 → 5,3 et 6,1 ms, 7.0 → 5,0 et 5,7 ms (la machine du conteneur varie d'une session à l'autre : comparer sur la même). Rendu : +17 % d'appels de dessin dans la vue du banc. `gels.mjs poste7 2` : 0 shader tardif, 0 erreur.
- **Vérifié** : `dev/p7zones.mjs` (les infectés atteignent le joueur dans la chambre à −1,6 m, la galerie en pente, la ferme et sur la plate-forme ; 0 erreur), `mapplay.mjs` sur les quatre cartes (portes, zones, courant, caisse, établi ; 0 erreur), `mapview.mjs poste7` (vues).
- **Suite** : la grande quête du Poste 7 (allonger « Aube Blanche » à travers les nouvelles zones, effets spéciaux), puis les autres cartes.

## Fait (version 6.11) : infectés maison repeints au niveau des modèles téléchargés

Demande du propriétaire : « continue à améliorer les modèles maison pour qu'ils ressemblent à ceux que j'ai téléchargés », puis viendront l'agrandissement des cartes, des parties plus longues et plus complexes, les effets spéciaux des quêtes et une quête propre à chaque carte.

- **Mesure** (textures des GLB) : les téléchargés étaient deux fois plus sombres (clarté médiane 0,21 à 0,48 contre 0,45 à 0,70) avec 3 à 5 fois plus de rouge (sang, chairs).
- **Peinture** (`tools/make_zombies.py`, étape 5) : peau terne et crasseuse, lividités violacées, veines plus marquées, orbites plus creuses, sang qui coule de la bouche au cou, plaie au cuir chevelu une fois sur deux, 3 à 6 plaies, mains ensanglantées ; vêtements ternis (fort sur les tissus clairs, presque rien sur les foncés), crasse, boue, col imbibé et quelques coulures isolées, accrocs où l'on voit la chair ; cheveux ternes et poisseux ; dents plus jaunes. Visage moins sali que le corps (lisible de loin).
- **Logo** : le t-shirt `male_casualsuit06` de MakeHuman porte « MAKEHUMAN » imprimé ; effacé à la fabrication (filtre médian sur la moitié haute de la texture).
- **Pièges rencontrés** : coulures bornées en x et en hauteur = « tablier » rouge rectangulaire ; assombrir tous les tissus d'un même facteur = silhouettes noires pour les vêtements déjà foncés.
- 20 GLB regénérés ; contrôle : `dev/catalogue.mjs <carte>` (`MODELES=…`, `SUFFIXE=…` pour un essai).

## Fait (version 6.10) : ménage des infectés, carte par carte

Retour du propriétaire après essai de la 6.9 : « il y en a qui ne vont vraiment pas avec ceux qu'on avait ; pose-moi des questions avec des images ». Planches numérotées par carte (`dev/catalogue.mjs <carte>` : en pied et en gros plan, éclairage de la carte), choix fait par le propriétaire.

- **Retirés partout** (GLB supprimés, crédits mis à jour) : l'écorché « Dead man », le décharné, le zombie nu de pxltiger, le zombie en combinaison anti-radiation. Plus besoin de leurs auteurs pour les crédits.
- **Restent** : Poste 7 — trois poilus MakeHuman, l'officier Mixamo, le costaud ; Cité — les 9 civils (4 MakeHuman, 4 femmes importées dont la zombie sexy, l'homme en chemise sombre) et le costaud ; Filon — 4 MakeHuman, l'homme en chemise sombre, le costaud ; Pénitencier — pe_a, pe_b, le Geôlier, le costaud.
- **Pénitencier comblé** (il ne restait que deux marcheurs) : deux détenus MakeHuman de plus, `pe_e` (vieux, chemise de toile bleu clair) et `pe_f` (veste de travail en denim délavé), validés par le propriétaire sur planche. Pièges : `male_casualsuit02` et `04` portent des imprimés et un logo modernes (écartés) ; un denim trop foncé se confondait avec l'uniforme du Geôlier dans la nuit.
- **À garder en tête** : au moins 4 marcheurs par carte, sinon les mêmes visages reviennent sans cesse dans une manche chargée.

## Fait (version 6.9) : bouche sombre, gore façon BO2, soldats modernes pour les joueurs

Demande du propriétaire : « assombris l'intérieur de la bouche puis passe au gore ; les soldats modernes, c'était pour les personnages qu'on joue ; mets tout en ligne ; assure-toi que le jeu reste fluide ».

- **Bouche** : les 18 infectés MakeHuman regénérés (`tools/make_zombies.py`) : intérieur de la bouche, langue et gencives assombris ; os `hat` pour les couvre-chefs (Poste 7, Filon, Pénitencier : 8 modèles). Contrôle : `dev/machoire.mjs ci_a`.
- **Gore** (`src/09c_gore.js`, détail dans `INFECTES_BO2.md`, étape 7) : couvre-chef qui saute au tir à la tête, tête qui éclate quand le tir laisse 10 % de vie ou moins (l'infecté marche encore 3 s sans tête), bras arrachés aux règles de BO2 (pas au pistolet, une chance sur deux), éclats de chair, moignons texturés (chair CC0, `assets/gore/`). Contrôle : `dev/gore.mjs p7_a`.
- **Soldats** (`src/09e_soldats.js`, `assets/soldats/`) : chaque coéquipier prend le corps d'un des quatre soldats modernes livrés par le propriétaire (forestier, olive « Mark », désert, russe Mixamo), rang donné par l'hôte (champ `s` de la liste des joueurs). Téléchargés seulement en coopération, à l'arrivée du premier coéquipier (6,2 Mo), shaders compilés hors écran. Le corps procédural reste le squelette posé (caché) et la solution de repli. Bras en vue subjective (manches, gants) aux couleurs de la tenue du soldat du joueur. Pose « arme en main » refaite par cinématique inverse : mains sur la poignée et le garde-main de l'arme tenue (la main gauche flottait près du visage). Écarté : TacticalSoldier (maillage figé en posture). Contrôle : `dev/soldats.mjs` (`PROFIL=1`).
- **Outil** `tools/import_modeles.py` : `--os` (squelette d'origine aux os sans nom, nommés à la main), `--sans-decoupe` (alpha Mixamo qui n'est pas une découpe), `--quart-de-tour`, `--objet` ; pièges réglés : cube par défaut resté dans un .blend, maillage partagé entre personnages, matrices des .blend pas encore calculées.
- **Fluidité** : `gels.mjs poste7 2` et `gels.mjs cite 2` : 0 shader compilé après le menu, 0 erreur (tir, mise à mort et gore compris : matière des moignons préchauffée). `bench.mjs` (Q=2, 30 infectés réalistes) : 2,93 ms de mise à jour par image. Soldats : rien en solo ; en coopération, téléchargés et compilés hors écran (`compileAsync`) avant d'apparaître ; essai réel hôte + invité (`dev/coopsoldats.mjs`) : chacun voit l'autre sous son soldat (hôte forestier, invité Mark), 0 erreur du jeu (seuls les relais MQTT publics, bloqués par le réseau du conteneur, échouent).
- **Reste** : auteurs et liens Sketchfab des soldats (S_1, 0.group, Mark) et des zombies dead_man, décharné, anti-radiation ; alléger les GLB les plus lourds.

## Fait (version 6.8) : modèles de zombies tout faits (Sketchfab, Mixamo) dans les cartes

Demande du propriétaire : « prendre des modèles gratuits déjà faits », puis « utilise-en le plus possible pour la variété ; garde la femme zombie sexy ; enlève le point lumineux des yeux ». Le propriétaire les a téléchargés (release GitHub `modeles-import`, 230 fichiers) ; Meshy demandait un abonnement.

- **Outil** `tools/import_modeles.py` : lit glTF, FBX, OBJ, USDZ, .blend ; garde le squelette d'origine quand ses os se reconnaissent (Mixamo, biped 3ds Max, noms courts ; mâchoire comprise) et le renomme aux noms du jeu, sinon en pose un d'après la forme (bras en T/A ou le long du corps suivis tranche par tranche, poids calculés sur une copie refaite en volume à ×10, bras séparés du torse, faces soudées bras-corps coupées) ; atlas d'une texture, découpe des cheveux, peau zombifiée (`--peau`), reflets adoucis (`--lustre`), pose livrée prise comme repos (`--pose-actuelle`).
- **10 modèles** (fiches dans `assets/zombies/manifest.json`, `glow: false`, `eras` pour ceux partagés) : Poste 7 — World War Zombie (Mixamo), dead_man, décharné, pxltiger ; Pénitencier — dead_man, décharné ; Cité — homme zombifié et deux femmes (martinezequielgorno), zombie sexy (ssorpeg, reflets adoucis), zombie Mixamo, zombie anti-radiation ; Filon — homme, dead_man, décharné, pxltiger. Les infectés MakeHuman restent (variété).
- **Écartés** : abomination.fbx et zombie.fbx (extraits de DOOM : outil « Serrat », format md6), soldats modernes (0.group, S_1, Mark_1, TacticalSoldier, Russian_Soldier1), Zombie.Static (poids ratés, peu lisible), chiens (quadrupèdes).
- **Crédits** : `assets/zombies/CREDITS.md` ; liens et auteurs à demander pour dead_man, le décharné et le zombie anti-radiation.
- **Coût** : la Cité charge 11 modèles (17 Mo, 2 s en local contre 1,1) ; mémoire vidéo plus élevée en « élevé ». 0 shader tardif, gore et rampant vérifiés (`zreal.mjs cite`, `zreal.mjs poste7`).
- **Reste** : intérieur de la bouche plus sombre (MakeHuman), gore façon BO2, alléger les GLB les plus lourds (femmes : 3 Mo).

## Fait (version 6.7) : os de mâchoire des infectés réalistes

Demande du propriétaire : « passe à l'os de mâchoire ». Détail : `source/INFECTES_BO2.md` (étape 4).

- **Modèles** : les 18 GLB regénérés par `tools/make_zombies.py` avec un 54e os, `jaw` (position et poids du squelette « default » de MPFB, CC0) : menton, lèvre du bas, dents du bas et leur gencive, langue. Piège rencontré : le seul groupe « jaw » ne suffit pas, la lèvre du bas est portée par ses enfants (oris…) — bouche qui s'étirait sans s'ouvrir.
- **Jeu** : la mâchoire du modèle recopie celle du squelette procédural (déjà animée : souffle en marchant, attaque, hurlement). Rien d'autre ne change (même matière, 0 shader en plus).
- **Artifact** : republier aussi les 18 `assets/zombies/<id>.glb.txt` (base64 des nouveaux GLB) avec `manifest.json`.
- **Vérifié** : `dev/machoire.mjs` (gros plans, `GRIS=1` forme seule).

## Fait (version 6.6) : bras tendus et démarches variées

Demande du propriétaire : « relève les bras et passe aux démarches variées ». Détail : `source/INFECTES_BO2.md` (étape 5).

- **Démarches** : capture de mouvement 100STYLE (CC-BY 4.0 : crédit obligatoire, mis dans `assets/zombies/CREDITS.md` et le README) — zombie bras en avant, ivre, jambe traînée, course zombie à petits pas — en plus de la marche Quaternius. Tirée du numéro de chaque infecté (même démarche chez l'hôte et les invités). Les rapides (1,6 à 3 m/s) prennent la course zombie. Coutures de boucle lissées et vitesse au sol mesurée sur les pieds reciblés (`tools/make_anims.mjs <UAL> <BVH>`). Les BVH ne sont pas dans le dépôt (liens Google Drive de 100STYLE, styles Zombie_FW, Drunk_FW, DragLeftLeg_FW, Zombie_FR).
- **Contrepartie** : les marcheurs « zombie » et « traîne » sont 28 et 34 % plus lents (vitesse de leur capture) ; réglable dans `ZGAITS` (09_zombies.js).
- **Bras tendus** : couche `zanimReach` par-dessus le clip (jambes intactes), bras à l'horizontale dans le repère du corps, poids par démarche, relâchés en attaque, course, hurlement et pour les brutes.
- **Vérifié** : `GAITS=1 node dev/anims.mjs penitencier 2` (profil, `FRONT=1` face), `bench.mjs` (30 infectés : 6,24 ms), `gels.mjs penitencier 2` (0 shader tardif).
- **Suite du plan** (`INFECTES_BO2.md`) : os de mâchoire dans les modèles, gore façon BO2, matières et vêtements, poids.

## Fait (version 6.5) : infectés façon BO2, étape 2 — animations capturées

Demande du propriétaire : « lance l'étape des animations ». Détail et choix : `source/INFECTES_BO2.md` (étapes 2 et 3).

- **Clips** : Universal Animation Library 1 et 2 de Quaternius (CC0, versions Standard gratuites) — marche zombie, attente, griffure, course, sprint — reciblés hors du jeu par `tools/make_anims.mjs` sur le squelette procédural de 20 os ; 40 Ko dans `src/09d_zanims.js`. Licence gardée dans `tools/licences/quaternius_UAL.txt`, crédit dans `assets/zombies/CREDITS.md`.
- **Dans le jeu** : clip choisi selon la vitesse de base (marche, course, sprint des enragés), attente à l'arrêt et au hurlement, griffure pour l'attaque et les planches ; cadence calée sur la vitesse réelle, fondus de 0,25 s, miroir et cadence tirés pour chacun ; recul aux impacts, inclinaison propre, hurlement et mâchoire par-dessus. Les corps réalistes suivent comme avant (sphères de tir, gore, poupée de chiffon inchangés) ; les corps procéduraux des téléphones en profitent aussi. Restent procéduraux : rampant, sortie de terre, Givreux figé. `?noanim` : ancienne animation.
- **Coût** : +0,1 ms de mise à jour pour 24 infectés (`bench.mjs`) ; 0 shader tardif (`gels.mjs`). Outil : `dev/anims.mjs` (profil, face, avant/après).

## Fait (version 6.4.1) : yeux sans halo

Retour du propriétaire : « trop de lumière ; seulement le globe de l'œil, pas de lumière supplémentaire autour ». Halos retirés ; le globe garde sa couleur par carte, sans brouillard, avec une clarté juste sous le seuil du halo du post-traitement (il ne rayonne plus sur le visage).

## Fait (version 6.4) : infectés façon BO2, étape 1 — les yeux

Demande du propriétaire : « aller chercher un autre niveau, le plus proche possible de Black Ops 2 Zombies ; cherche des modèles sur des sites web ». Recherche faite par workflows (première passe coupée par la limite de sessions du propriétaire, puis seconde passe à part) : `source/INFECTES_BO2.md` (suivi et plan en 11 étapes) et `source/recherche_infectes/` (plan de décision, ressources vérifiées, référence BO2, technique). Constat : aucun modèle gratuit et légal ne fait mieux que nos infectés ; l'écart avec BO2 tient au mouvement, aux yeux, au gore et à la matière. Le propriétaire a validé la voie recommandée (« vas-y » : gratuit seulement, sans Mixamo, yeux puis animations, gore complet).

- **Yeux** (`09_zombies.js`) : une couleur par carte (Pénitencier rouge, Filon bleu, Poste 7 orangé, Cité jaune puis bleu dès la 12e manche ; Geôlier, costauds, Givreux et hurleurs gardent la leur), rendue 6 fois au-dessus de la normale pour que le halo du post-traitement les fasse rayonner, sans brouillard ; un halo additif par œil, à taille apparente minimale (≈ 6 pixels en 1080p) : avant, 1,7 cm sous le seuil du halo, à peine un pixel à 10 m. Préchauffage avec les mêmes matières (0 shader tardif). Outil : `dev/yeux.mjs`.

## Fait (version 6.3.2) : têtes de pieux du chemin de ronde

Capture du propriétaire : « les bases des poteaux sont décalées » sur les quais. Les pieux du bord est des quais (z 56 à 70) étaient posés en x 100 (jonction quais / chemin de ronde, en plein plancher) au lieu de x 102 (la rambarde) : leurs têtes, qui dépassent de 30 cm pour servir de socle aux poteaux, faisaient une rangée de plots à 2 m de la rambarde. Déplacés sous la rambarde. Le reste du chantier (bord sud, ouest, nord) était déjà aligné. Vérifié en photo (`dev/photo.mjs`, vue du chemin de ronde).

## Fait (version 6.3.1) : relecture de la 6.3

Relecture du code de la 6.3 par un workflow (4 relecteurs par thème, puis un sceptique chargé de réfuter chaque défaut) : 13 défauts signalés, 10 après dédoublonnage, 9 confirmés, tous légers sauf les lignes de la cour. Corrigés : bouts et linteau des cloisons à faïence de l'infirmerie (faïence jusqu'au plafond, faces en double qui scintillaient), relief et rugosité de la pierre qui n'étaient pas lus en alternance (`#include` pas encore développés dans onBeforeCompile), lignes de la cour unies au lieu d'écaillées (texture non répétée), flacons de l'armoire à pharmacie enfermés dans un pavé plein, pancarte de l'établi barrée par la baguette, poutre du réfectoire arrêtée à 8 cm du linteau, gobelets traversés par les plateaux. Écarté : jour sous les rochers du rivage (sous l'eau, qui est opaque). Vérifié : photos rapprochées de chaque correction, `gels.mjs penitencier 2` (0 shader tardif, 0 erreur).

## Fait (version 6.3) : l'esthétique du Pénitencier

Mise en ligne le 19 octobre 2026 : `main` (GitHub Pages, vérifié : version.json et GAME_VERSION à 6.3) et l'Artifact du jeu avec salon co-op (version 26, page seule).

Demande du propriétaire : « passe à l'esthétique du Pénitencier maintenant ». Suivi détaillé, constat de départ et pièges : `source/ESTHETIQUE_PENITENCIER.md`.

- **Taches** (toutes les cartes de plain-pied) : flaques, taches d'eau, moisissure et terre peintes au pixel avec un contour irrégulier ; les anciennes, faites de dégradés ronds empilés, étaient noires au centre et faisaient des trous dans les sols et les murs (douches surtout). Nouveau : taches au plafond (`M.decals.ceil`).
- **Plafonds** : enduits clairs au lieu du béton sombre, rebond de lumière intérieur relevé : ils ne sortent plus noirs. `dev/photo.mjs` laisse maintenant l'éclairage intérieur se poser avant chaque photo (il photographiait des plafonds plus noirs qu'en jeu).
- **Douches** : faïence jusqu'à 1,9 m, enduit au-dessus, baguette (murs fins `K.up`, murs épais `wallIn`/`wallUp`, fenêtres barricadées comprises) ; collecteur au mur, 10 colonnes avec robinet à croisillon, col et pomme en laiton, placées hors des fenêtres, de l'arme et de l'atout ; coulures de rouille, sol mouillé, bondes en fonte ajourée, bancs à lattes, patère à serviettes, lampe-cage et une lumière propre (« shower »).
- **Réfectoire** : poutres, suspensions émaillées au-dessus des tables, gobelets, marmites, tableau du menu. **Infirmerie** : cloisons en faïence vert d'eau à hauteur d'appui, armoire à pharmacie vitrée, lavabo, chariot à instruments, croix rouge. **Direction** : lampe de bureau, lumière rapprochée des archives.
- **Extérieurs** : terrain de balle au mur à la peinture écaillée (à la place de deux traits blancs) ; murs de pierre sans répétition visible (photo lue deux fois en alternance, `photoDetile` ; teinte qui varie sur une dizaine de mètres, `M.macro`) ; rochers du rivage fracturés (`boulderGeo`).
- Vérifié : tournées photo avant/après, `dev/gels.mjs penitencier 2` (0 shader tardif, 0 erreur), `dev/verif_carte.sh penitencier`.

Ensuite : avis du propriétaire sur le Pénitencier ; puis les infectés (mâchoire, animations capturées, Colosse et avatars).

## Fait (version 6.2.1) : image commune à l'ouverture

Retour du propriétaire : à l'ouverture, l'écran de chargement montrait le Pénitencier (dernière carte choisie) ; il veut une image commune pour la première page (par exemple une image générée par IA de zombie gore qui va avec le jeu), et l'image de la carte quand on en choisit une.

- `assets/cartes/accueil.jpg` : générée par IA (pollinations.ai, modèle Sana, gratuit : une image toutes les 45 s, ~970 px de large) parmi 10 essais ; soldat infecté casqué au visage pourri, yeux luisants, nuit bleutée ; recadrée par `source/tools/accueil_image.py` (sujet à droite pour le texte, bande du logo du service coupée, bord fondu). Crédits : `assets/cartes/CREDITS.md`.
- Ouverture de la page : cette image, « SNOWFALL PROTOCOL » et la carte en petit, posée par la page avant même le moteur 3D. Choix d'une carte (switchMap) : la carte est notée dans sessionStorage et sa photo préchargée avant le rechargement ; l'écran montre alors sa photo et son nom. Lancement d'une partie et réglages graphiques : la photo de la carte (posée directement, sans attendre le fil principal).

## Fait (version 6.2) : plus de gels au chargement, écran de chargement, image plus nette

Demande du propriétaire (joue surtout sur ordinateur, en qualité « élevé ») : « le jeu gèle beaucoup, surtout en début de partie ou à la page d'accueil » ; son idée : un écran de chargement au début, et un petit écran avec une image de la carte au lancement de la partie. Puis la résolution et la qualité d'image. Suivi détaillé : `source/CHARGEMENT_IMAGE.md`.

- **Cause des gels, mesurée** (`dev/gels.mjs`) : une fois l'accueil affiché, le jeu compilait encore 40 shaders (photos des matières posées pendant le menu, éclairage d'ambiance, infectés réalistes) et envoyait 306 textures dont 113 grandes ; puis 5 shaders au lancement (arme en main) et 2 ou 3 au premier usage de la grenade, du couteau, de la caisse, d'un changement d'arme, d'un atout. Sur Windows, chaque shader compilé fige l'image de 20 à 300 ms.
- **Écran de chargement** (`13c_loader.js`, `shell.html`) : photo de la carte (`assets/cartes/`), nom, barre et étapes, astuce ; l'accueil n'apparaît qu'une fois photos, infectés réalistes et ombrage d'ambiance chargés (au plus 90 s), textures envoyées et shaders préchauffés. Le même écran revient au changement de réglage graphique. Carton de la carte au lancement d'une partie (au moins 1 s et 3 images dessinées).
- **Préchauffage** : armes en main (toutes, améliorées comprises, gardées en cache), couteau, grenade, un infecté de chaque modèle et un gelé, yeux, moignons, objets ramassables, armes et lumière de la caisse, objets cachés du décor : dessinés une fois sous l'écran de chargement, ombres de toute la carte comprises, compilés dans la même cible que la chaîne d'effets. Résultat : 0 shader compilé après le chargement sur les 4 cartes (contre 45 à 54), en partie scriptée comprise.
- **Image** (élevé) : anticrénelage SMAA (aucun lissage effectif avant en moyen, élevé et ultra) ; grain de film allégé et désactivable ; résolution dynamique : plancher 75 % au lieu de 55 %, option « toujours pleine » ; filtrage des textures 16× ; les Options affichent la carte graphique, la taille de l'image et les images/s.

Ensuite : avis du propriétaire sur la 6.2 (gels, netteté) ; puis l'esthétique du Pénitencier et les infectés (mâchoire, animations capturées, Colosse et avatars).

## Fait (version 6.1.4) : les sols du Poste 7

Demande du propriétaire : « des mottes de terre et/ou de neige non réalistes sur le sol, de plus celui-ci manque un peu de neige étant donné que c'est l'hiver ; à voir sur les autres cartes ».

- **Mottes** : c'étaient des semis de polyèdres à 12 faces (`05c_detail.js`, sorte « clod ») : blancs partout (« neige »), bruns et serrés au Cratère (jusqu'à 2,2 fois leur taille). Retirés du Poste 7. Essais écartés à l'œil : mottes arrondies coiffées de neige (des boules de neige), puis texturées de terre (des galets). À la place, le fond du Cratère est bosselé (terre retournée, ±5 cm, à l'œil seulement : le jeu garde `M.floorH`). La sorte « clod » est maintenant une bosse arrondie et enfoncée (le Filon en sème encore, petites, dans la rue et la mine : elles s'y fondent).
- **Neige** (`05_world.js` buildTrenches, couleur des sommets lue par photoBlend) : la neige couvre le sol ; boue sous le caillebotis des boyaux (distance à l'axe du caillebotis le plus proche, deux rangées dans le boyau de soutien), plaques piétinées dans la cour du dépôt, terre retournée et neige mêlées au Cratère, plus de neige contre les parois. Tout est calculé à partir de la position (champs continus), donc identique aux sommets partagés par deux carreaux : plus de lisière droite aux croisements. Normales du sol tirées de sa forme exacte (plus de couture d'éclairage entre carreaux).
- **Autres cartes** : Cité et Pénitencier n'ont que de petits cailloux et éclats (pas de motte) ; Filon vérifié à l'œil (rue, mine).
- Pas fait (possible plus tard) : congères en relief au pied des parois.

## Fait (version 6.1.3) : contour des armes murales et caisse verte (retours du propriétaire sur la 6.1.2)

- **Contour des armes murales** : il était dessiné à la main (profil générique) et l'arme le cachait presque entièrement. Il est maintenant calculé depuis la vraie silhouette de chaque arme : triangles du modèle projetés sur le mur, forme élargie de 4 cm, bord suivi (tracé de Moore) et dessiné en pointillés lumineux ; nom et prix dessous (`08_weapons.js` gunOutline). Taille des armes inchangée (`WALL_LEN`). Une saillie du mur devant le prix (cimaise du Filon) fait remonter l'ensemble. Vérifié sur les 4 cartes, de face et de biais (`dev/armesmur.mjs`, `DIST=` pour s'approcher).
- **Caisse de ravitaillement** (demande : enlever le faisceau bleu, garder la lumière verte mais au milieu de la caisse, couvercle à peine entrouvert avec une légère lueur verte, à l'ouverture seulement une lumière verte qui sort de la caisse et éclaire les armes, rendu presque à 100 % celui de BO2 mais vert au lieu de jaune) : colonne et faisceau bleus retirés, fusée verte posée à côté retirée ; caisse creuse (fond et quatre parois, ferrures inchangées vues de dehors) ; au repos, couvercle entrouvert de 3,5° et lueur verte par la fente (devant et en coin sur les côtés) ; à l'ouverture, fond lumineux, halo à l'ouverture, 9 rayons courts (55 à 95 cm, jamais jusqu'au plafond) tournés vers le joueur, poussières lumineuses, et une lumière ponctuelle verte fixe de la scène (`R.lights.box`, jamais ajoutée ni retirée en jeu) qui éclaire l'arme et ne devient forte que couvercle grand ouvert. Message du déplacement : « Cherchez la lueur verte ». `dev/caisse.mjs` filme 8 vues (repos de loin et de près, tirage, offre de près).

## Fait (version 6.1.2) : armes murales et caisse de ravitaillement

- **Armes murales** (retour du propriétaire : arme à l'envers de son contour lumineux, contour qui « clignote » selon l'angle comme s'il rentrait dans le mur). L'arme est tournée dans le sens de son contour à la craie, centrée dessus et mise à sa taille ; le contour est posé devant la vraie surface du mur (rayons contre les maillages, décalage de profondeur) et non plus devant la case de la grille ; l'arme passe au-dessus de ce qui est posé devant (`08_weapons.js` mountWallWeapons). Râtelier du Poste 7 déplacé hors de l'arme murale. Vérifié de face et de biais sur les 4 cartes (`dev/armesmur.mjs`).
- **Caisse de ravitaillement à la BO2** : colonne de lumière qui signale la caisse de loin (jusqu'au plafond à l'intérieur, jusqu'au ciel dehors) ; à l'ouverture, faisceau qui jaillit de la caisse, tenu dans son emprise (l'ancien halo rond traversait le mur et clignotait) ; couvercle sur charnière haute arrière (il ne rentre plus dans le mur) ; les armes montent vite hors de la caisse en défilant, ralentissent, la dernière plane puis redescend lentement si personne ne la prend. Les armes restent toujours dans la longueur de la caisse, en défilant comme à l'arrêt (pivot centré par arme, `11_game.js` boxGun). `dev/caisse.mjs <carte>` filme un tirage en 6 vues.

## Fait (version 6.1.1) : retours du propriétaire sur le Pénitencier

- Le mur plein ajouté en 6.1 entre le réfectoire et la direction devient une porte payante « Réfectoire ↔ Direction » (1 250, acier ; choix du propriétaire parmi : garder le mur, porte payante, revenir au passage libre). Ajoutée en dernier : les numéros des autres portes (co-op) ne changent pas.
- Fente dans le coin de la cuisine du réfectoire (capture du propriétaire) : un mur fin qui s'arrête contre un pilier T_BLOCK dépassait de 8 cm de sa face, et son bout n'était pas fermé ; de biais, on voyait dehors entre ses deux faces. Correction générale (`05b_flat.js` flatSolidWall) : face de bout sur tout mur fin qui ne se prolonge pas et ne fait pas d'angle (toutes les cartes de plain-pied).
- Porte du Chemin de ronde : sans montants déclarés, ses côtés prenaient la rambarde ajourée des quais et aucun linteau n'était construit (on voyait tout le ciel au-dessus de la grille). Montants de pierre comme aux Quais : linteau construit.
- Le propriétaire trouve l'esthétique du Pénitencier à améliorer : à reprendre plus tard.

## Fait (version 6.1) : plus de murs invisibles ni d'objets mal placés

Mise en ligne le 18 octobre 2026 : `main` (GitHub Pages, vérifié : version.json et GAME_VERSION à 6.1) et l'Artifact du jeu avec salon co-op (version 19, page seule : aucun fichier ajouté).

Demande du propriétaire : « Cherche toi-même les murs invisibles et les objets mal placés », surtout à la Cité Atomique. Le détail constat par constat et l'état de chaque vérification sont dans `source/AUDIT_MURS.md` (fichier de reprise de l'étape).

- **Détecteurs** (`dev/murs.mjs`, `dev/placement.mjs`) : le premier fait marcher le joueur dans 8 directions depuis des milliers de points avec ses vraies collisions et signale chaque pas arrêté sans rien de visible devant (rayons contre les maillages) ; le second audite chaque objet (flottant, enfoncé, dans un mur, superposé, passage bouché, zone coupée, élément de jeu hors de portée). `dev/portes.mjs` teste chaque porte fermée ; `dev/verif_carte.sh <carte>` enchaîne détecteurs et tests de non-régression.
- **Cause principale** : `colliderBox` remplaçait toute boîte tournée par son enveloppe alignée sur les axes (une voiture de travers bloquait un carré de 4,9 m). Les boîtes ont maintenant leur vraie forme (`b.rot`, `03_map.js` collideRot ; tirs et appuis aussi), et les objets ronds une collision ronde (`colliderCyl`, `b.rad`).
- **Portes fermées** : le carreau entier bloquait ; le joueur s'avance maintenant jusqu'au battant (`playerTile`, `pBlockedP`, boîte mince `d.slab`), les balles s'y arrêtent, les infectés et le Colosse gardent leur logique (`pBlocked`). Champ de flux visé depuis le carreau voisin (`flowTile`).
- **Par carte** : Cité (télé, machine à laver, comptoir, atterrissages des atouts, départ hors du car, sorties de terre, mannequins assis sur un siège, tableaux, lavabos, enseigne de l'abri…), Poste 7 (épave du biplan, Œil de lynx, affiche, caisse, brancard), Pénitencier (gradins, carabine, mur réfectoire/direction, coffre-fort, étagères, bouées, lampes, panneaux, rochers), Filon (flancs des ruelles, disque secret atteignable, établi, coffre, wagonnet, lustre, bouteilles, fenêtres derrière les atouts, affiches, charpente, filons d'or…), trousse commune (balançoires en A, fauteuils et lits sur pieds, arbustes, camion, mannequins, fûts, caisses empilées).
- **Leçon de méthode** : les workflows à plusieurs agents ont consommé la limite d'usage et perdu leur travail à chaque coupure (branches locales non poussées, reprise qui refaisait tout). Pour une étape longue : une correction à la fois, poussée aussitôt, et un fichier de reprise dans le dépôt.

Ensuite, dans l'ordre demandé par le propriétaire : les sols (faits en 6.1.4), puis la résolution et la qualité d'image ; les infectés plus tard (mâchoire, animations capturées, Colosse et avatars).

## Fait (version 6.0) : des infectés réalistes, un type par époque, et du gore

Mise en ligne le 8 octobre 2026 : `main` (GitHub Pages) et l'Artifact du jeu avec salon co-op (version 18, 20 fichiers de plus). L'Artifact ne sert pas les `.glb` (types web seulement) : `build.mjs --artifact` fait charger `<id>.glb.txt`, le même fichier en base64 (`base64 -w0 x.glb > x.glb.txt`, 33 % plus gros, non gardé dans le dépôt).

Demande du propriétaire : « je veux aller chercher la qualité de visuel d'un zombie de Call of Duty Black Ops 2 mode Zombie ». Ses choix : voie gratuite faite ici, un type par époque, gore comme BO2, version simplifiée sur téléphone.

- **Le constat d'abord** : les corps du jeu étaient faits de tubes et de sphères calculés par le code (`09_zombies.js`) ; aucun réglage ne les aurait menés au niveau de BO2, dont les personnages sont sculptés. Il fallait de vrais modèles 3D.
- **Fabrication hors du jeu** (`tools/make_zombies.py`) : Blender 4.2 sans écran (module Python `bpy`), extension MPFB2 et pack de ressources MakeHuman (CC0 : corps paramétrables, 27 peaux, vêtements, cheveux, yeux, dents). Pour chaque infecté : silhouette (sexe, âge, carrure, taille), peau, squelette « game_engine » (53 os), visage complet, vêtements teints à l'époque, pièces ajoutées (casque Adrian, casquette de gardien) ; allègement (≈ 14 000 triangles), toutes les textures réunies en une seule image (un seul appel de dessin par infecté), puis **zombification peinte en 3D** : chaque texel connaît sa position sur le corps (rasterisation des triangles dans l'espace UV), d'où peau grise et froide marbrée, veines, ecchymoses, orbites creuses cerclées de rouge, yeux laiteux, bouche et menton en sang, plaies à vif (jamais sur le visage) ; vêtements : boue qui monte du bas, crasse, sang séché sur la poitrine, accrocs ; bandes molletières peintes en spirale pour les poilus. Relief tiré du détail fin de la couleur. Un GLB par infecté (≈ 1 Mo) contenant ses trois images (couleur 2048, relief 1024, découpe des cheveux et des cils rangée dans la case « occlusion » du glTF : un seul fichier, l'Artifact limite le nombre de fichiers).
- **18 infectés** : Poste 7 (poilus bleu horizon, tirailleur kaki, gros gabarit), Cité 1957 (blouson, vieux monsieur en costume, femme en tailleur, chemise rayée, mécanicien), Pénitencier 1933 (détenus en toile grise, gardien marine, qui sert aussi de Geôlier géant), Filon 1880 (mineur à chapeau, chemise de laine, notable, femme en robe, mineur costaud).
- **Dans le jeu** (`09b_zreal.js`) : chargés en arrière-plan comme les photos ; les infectés déjà debout changent de corps à l'arrivée. Ils ne s'animent pas eux-mêmes : le squelette procédural (pose, recul, poupée de chiffon, sphères de tir) reste le seul à bouger, invisible, et chaque os du modèle recopie la rotation monde de son os (**reciblage**), avec une rotation de calage par os (le modèle est en « A », bras écartés). Taille : les yeux du modèle à 1,657 m, la hauteur de ceux du squelette, pour que les tirs à la tête tombent sur la tête visible. Lueur des yeux gardée (deux petites sphères devant les globes). Graphismes « bas » (téléphones), `?nozreal` ou échec : corps procéduraux, inchangés. « Moyen » : couleur réduite à 1024.
- **Gore** (`09c_gore.js`), décidé par l'hôte et transmis (`zlimb`) : dégâts cumulés sur un bras ou une jambe (38 % / 50 % des points de vie, 60 au moins ; pas sur les costauds ni le boss) → membre arraché ; une jambe perdue fait ramper ; mort par explosion → membres arrachés au hasard (et parfois la tête) ; tir appuyé mortel sur un membre → membre arraché ; tête éclatée → moignon du cou. Un membre arraché : os réduit à rien (le maillage se replie sur l'articulation), moignon de chair qui gicle quelques secondes, sphère de tir retirée ; sur un corps réaliste, le vrai membre vole (copie du modèle dans la pose du moment, tout le reste replié ; position recalée par matrices), rebondit, saigne et s'enfonce au bout de 8 s (10 au plus). Les explosions qui faisaient ramper arrachent maintenant les jambes.
- Mains en griffe : phalanges repliées de 0,38 rad vers la paume au chargement (le modèle est livré doigts tendus ; sens vérifié à la visionneuse).
- **Coût** (`bench.mjs`, 24 infectés, « élevé », rendu logiciel du conteneur) : mise à jour de la partie 0,99 → 2,3 ms par image (reciblage calculé dans le repère du corps, sans matrices monde : la première version coûtait 4,7 ms) ; rendu + 19 % (1,06 → 1,58 million de triangles). Téléchargement : 4 à 5 Mo par carte (un fichier par infecté), seulement en « moyen » et au-dessus.
- Outils : `dev/zreal.mjs` (infectés en jeu, puis scène de gore), `dev/zviewer/` (visionneuse d'un GLB), `bench.mjs` attend les modèles.
- Pièges rencontrés : matériaux MakeHuman exportés « transparents » et double face (l'intérieur de la tête passait devant les yeux : le jeu pose son propre matériau) ; silhouette (âge, taille) à figer avant de mesurer le crâne ; tête du modèle 4,5 cm en avant de l'axe du corps (le casque était décentré) ; âge MakeHuman 0,4 = adolescent (1,58 m).

Reste à faire sur les infectés :
1. Visage figé : le squelette « game_engine » n'a pas de mâchoire (la bouche ne s'ouvre pas en attaquant).
2. Un seul jeu d'animations procédurales pour tous : des animations capturées (Quaternius, CC0) donneraient des démarches plus naturelles.
3. Le Colosse du Filon et les avatars des camarades restent procéduraux.
4. Les tirs des invités ne transmettent pas l'os touché : chez eux, seuls les coups mortels (explosion, tête) arrachent des membres.
5. [à vérifier] Sur un vrai PC modeste avec 24 infectés et leurs ombres ; sur iPhone, rien ne change (corps simplifiés).

Ensuite, dans l'ordre demandé par le propriétaire : revue des quatre cartes (murs invisibles, objets mal placés, surtout à la Cité Atomique ; sols : mottes de terre et de neige peu réalistes au Poste 7, et pas assez de neige pour un hiver), puis la résolution et la qualité d'image.

## Fait (version 5.2) : les matières restées sans photo

Mise en ligne le 8 octobre 2026 : `main` (GitHub Pages) et l'Artifact du jeu avec salon co-op (version 17, 44 fichiers envoyés, 441 en tout ; une version en accepte 511).

Demande du propriétaire : « occupe toi de ce qui reste sans photo ». Les huit matières que la 5.1 avait laissées dessinées ont maintenant leur famille (`OBJ_FAM`) et leur photo commune (`assets/objets/`, 42 fichiers, 1,4 Mo de plus, chargés seulement sur les cartes qui les portent).

- **Choix des photos** : 8 éclaireurs (catalogues Poly Haven et ambientCG, vignettes regardées, simulations à l'échelle) puis un contradicteur par choix. Quatre contradicteurs ont tourné (les quatre autres ont buté sur la limite d'usage ; leurs choix ont été vérifiés à l'œil en mosaïque 2×2 et en jeu).
  - bois calciné (`boisCalcine`, `MATS.char`) : aucune vraie photo de bois brûlé en CC0 ; écorce de pin en gris, creux assombris par sa carte d'occlusion (`pine_bark`). Refusé par le contradicteur : la boue craquelée proposée d'abord se lisait comme de la boue de près (habitacle du biplan) et répétait le sol du lac de la Cité ;
  - pierre (`MATS.stone`, ferme et clocher en ruine du Poste 7) : mur de moellons `broken_wall`, grandes taches de clarté égalisées (`flat`), relief pris dans la carte `normal_gl` (la `nor_gl` de Poly Haven est encodée de travers : tout le mur penchait) ;
  - laiton (`MATS.brass` : poignées, chandeliers, lampe, volant de la chambre forte) : `Metal007` d'ambientCG (Poly Haven n'a aucun laiton), photo grise sur la teinte du jeu, rugosité ×2,2 (`rgain` : la photo était presque un miroir) ;
  - caoutchouc (pneus, roues du camion) : scan mat `rubberized_track`. Refusé par le contradicteur : `Rubber004`, un sol de salle de sport moucheté et satiné ; la bande de roulement en photo aussi (camions de 1917 sur bandages pleins) ;
  - marbre (comptoir de bonbons du Filon) : `Marble001` d'ambientCG, 1,5 m par tuile (les veines en croix se répétaient à 1 m) ;
  - foin (bottes du Filon) : chaume `reed_roof_04`, faîtage coupé et raccord haut/bas fondu (`crop` : la photo s'assombrit vers le bas, chaque ligne est égalisée) ;
  - terre cuite (pots de fleurs) : enduit rouge patiné `red_plaster_weathered` (coulures verticales, 1,2 m) ;
  - jute (sacs de sable neufs de la Cité, avant sur le lin trop fin) : toile `hessian_380` sans la boue du Poste 7, trame agrandie à 0,5 m pour rester lisible.
- `fetch_assets.py` : options `nkey`, `flat`, `crop`, `ao`, `rgain`, ambientCG (`src: 'acg'`), et nouvelles tentatives quand une connexion est coupée en route.
- Corrigé en route : les nouvelles étiquettes (`MATS.stone`, `MATS.brass`) étaient posées avant la création de ces matières (le monde ne se construisait plus ; trouvé par le contradicteur du laiton). Une matière sans texture avant (le laiton) était assombrie par la photo grise : elle garde maintenant sa clarté (`photoFlat`). `KIT.rubber` un peu éclairci (0x1c1b1a) pour que la poussière du pneu se lise au crépuscule.
- Outils : `node matieres.mjs <carte> 2 [familles]` → un cube et un cylindre par famille, avec la vraie matière du jeu, sous l'éclairage de la carte (le jeu ramène le joueur dans la zone jouable : la ferme, le clocher ou les maisons brûlées ne se photographient pas en place) ; `FAM=foin,marbre node objets.mjs filon 2` → une vue par famille sur un objet posé ; `objets.mjs` attend la fin du chargement des photos au menu (en pleine partie, il dépassait 400 s).
- Réglé à l'œil : la terre cuite sortait rose saumon (la photo est un enduit rosé) ; teinte ramenée à l'orange d'un pot.

Reste à faire sur les objets :
1. Toujours sans photo : verre, lampes, enseignes, petits objets colorés (conserves, livres, bonbons) ; à cette taille, une photo ne se verrait pas.
2. Trousse : `kTable` et `kChair` imposent leurs pieds en bois, `kShelf`, `kSign` et `kLamp` leur matière (le Filon les remplace après coup) ; un paramètre de matière serait plus propre. `kStove` : cuisinière domestique émaillée aussi dans la cuisine de la prison de 1933 (il y faudrait un fourneau en fonte).
3. Anachronismes de forme, pas de matière : bidon en forme de jerrican (inventé en 1937) et ampoules électriques au Filon de 1880.
4. Bogue ancien, sans lien : l'aile basse du biplan du Poste 7 n'est jamais dans la scène (`R.scene.add(w)` avalé par un commentaire, `11c_crater.js`).
5. [à vérifier] Sur iPhone.

## Fait (version 5.1) : les objets en textures photo

Mise en ligne le 8 octobre 2026 : `main` (GitHub Pages) et l'Artifact du jeu avec salon co-op, republié avec `assets/objets/` (88 fichiers de plus, 399 en tout ; une version en accepte 511).

Demande du propriétaire : « fais les objets en textures photo maintenant ». Après la 5.0, les meubles, véhicules et machines restés dessinés trahissaient le dessin à côté des murs photographiés.

- **Le vrai défaut d'abord : les UV des objets.** Les boîtes, cylindres et sphères de three.js ont des UV de 0 à 1 par face, quelle que soit leur taille. Beaucoup d'objets portaient déjà une photo de mur ou de plancher (tout `fmat('planks' | 'brick' | …)`), mais étirée : meubles en lames de parquet de 2 m par face, briques de 28 cm de haut sur les cheminées de la Cité, fronton du saloon étiré dix fois, rails du Filon étirés ×28. `05_world.js` donne maintenant à toute matière à clé (`userData.ftex`, donc toute `fmat`) des **UV en mètres** : chaque face reçoit la taille réelle qu'elle couvre, divisée par l'échelle de la matière.
  - `meterBase` reconnaît les géométries par leurs paramètres (boîte, plan, cylindre et cône, sphère, tore, capsule, tour, polyèdres ; carrosseries extrudées déjà en mètres) ; `meterUV` en fait une copie à l'échelle de l'objet, avec un endroit de lecture propre à chaque pièce.
  - Le fil d'un bois suit la plus grande dimension de la pièce (`grain` dans `PHOTO_SETS` : `'u'` si les planches de la photo sont couchées, `'v'` si elles sont debout) ; sur le flanc d'un cylindre, il ne fait jamais le tour (douelles des tonneaux et des citernes debout).
  - Trois points d'entrée : `mergeStatic` (avant la fusion, qui perd la taille de chaque pièce), `mergeGroup` (objets mobiles : portes, machines parachutées) et les lots instanciés (`Batch` : la géométrie partagée garde ses mesures et les axes de chaque face, le nuanceur multiplie par l'échelle de chaque exemplaire, `meterInstHook`). Pour un objet créé après la construction du monde : `meterize(groupe)` ; pour des morceaux fusionnés à la main avec `mergeGeometries` : `meterUV` sur chaque morceau avant.
  - Piège évité : `BufferGeometry.clone()` partage `userData` avec l'original (three r186) ; la copie reçoit son propre objet.
- **Familles d'objets** (`OBJ_FAM`, `05b_flat.js`) : une clé de texture par vraie matière, pour que chacune reçoive sa propre photo et ne soit pas fusionnée avec une autre (la signature de `mergeStatic` inclut la clé). `fmat('famille', couleur, { rough, metal })`. Familles : meuble, boisPeint, boisBrut, tissu, velours, cuir, skai, toile, email, tole, acier, galva, fonte, rouille, olive, ecorce. Matières communes étiquetées : `MATS.iron` fonte, `MATS.rust` rouille, `MATS.olive` olive (métal ramené à 0,1 : une peinture), `MATS.crate` boisBrut, `MATS.cloth` toile, `MATS.bark` écorce ; sur les cartes de plain-pied, planches et poteaux des barricades en boisBrut (c'étaient les planches givrées de 1917 dessinées).
- **Photos communes** (`fetch_assets.py objets` → `../assets/objets/`, 2,2 Mo en tout, 512 px et versions allégées 256 px) : une famille absente de la carte n'est pas téléchargée (`PHOTO.absent`). 17 photos choisies par 10 éclaireurs (catalogue, vignettes regardées, échelle réelle) puis contestées une à une par un contradicteur : laine à chevrons (tissu), velours, lin (toile), cuir marron, grain de skaï, teck (meubles de la Cité, 1957), chêne (Pénitencier, 1933), noyer (Filon, 1880), planches de caisse brutes, planches peintes écaillées, tôle peinte, émail (ondulation seule), tôle rouillée et calcinée, acier, tôle galvanisée ondulée, tôle peinte militaire, écorce de saule.
  - Modes (`OBJ_PHOTO`, `05p_photo.js`) : photo grise qui garde la teinte du jeu (`gray` dans `fetch_assets.py` : tissu, toile, tôle peinte, bois peint, olive) ; `neutral` : la photo donne la couleur, l'objet garde sa clarté (bois, cuir, rouille, acier, galva) ; `detail` + `nomap` : couleur unie du jeu sans la salissure dessinée, avec l'ondulation de l'émail (frigo, cuisinière, placards, toilettes, lavabos : avant, la salissure dessinée sur du blanc faisait de la pierre sale) ; `gloss` : brillant gardé en moyenne (`rm`, rugosité moyenne de la photo, notée par `fetch_assets.py`).
  - Refusé par le contradicteur : toute photo pour la porcelaine (aucune ne colle) ; la porcelaine est une matière lisse et brillante (`KM.porcelain`). Corrigé avant d'intégrer : relief de `rusty_metal_02` décentré chez Poly Haven (`renorm`), teinte d'acier recalculée (la photo est ocre), usure de la tôle peinte adoucie (`contrast` 0,4 : village neuf).
- **Ce qui a changé, carte par carte** (4 agents, un par carte sur des fichiers distincts, chacun suivi d'un relecteur contradictoire ; aucune faute certaine trouvée, un bloc devenu inutile retiré) :
  - trousse commune (`06b_kit.js`, `06c_vehicles.js`) : meubles en bois de meuble, canapés, fauteuils, tapis et vêtements des mannequins en laine, draps et linge en toile, cuisine et électroménager en émail, mobilier urbain en tôle peinte, poubelles en tôle galvanisée, bancs et tables de pique-nique en bois brut, pieds de banc et barbecue en fonte, carrosseries en tôle laquée, épaves calcinées en tôle rouillée, sellerie en skaï ;
  - portes, volets, encadrements et palissades en bois peint ; gouttières en tôle peinte (`05_world.js`, `05b_flat.js`) ;
  - Cité : station-service (pompes, auvent, comptoir), abri (couchettes en coutil, fûts, radio olive, aérations galvanisées), château d'eau, tour de tir, gradins en bois brut, rideaux en toile, plinthes vernies, enceinte galvanisée ;
  - Pénitencier : couchettes de fer avec couverture de laine grise, cuvettes et lavabos émaillés, tablettes de cellule en acier (le chêne verni était un contresens), tables du réfectoire à plateau de zinc, fauteuil du directeur en cuir, coffre-fort en fonte, pilotis en bois brut, vedette en bois peint (bruit de bois aux impacts), grue en tôle peinte, phare ;
  - Filon : étais, traverses, poteaux, chariot et tonneaux en bois brut, wagonnet rouillé, bar, tables, chaises, piano, bancs d'église et comptoir de la banque en noyer, rideaux et parement d'autel en velours, sacs et paillasses en toile ; anachronismes corrigés : étagères d'acier du magasin → noyer, lampadaire chromé → laiton et fonte, générateur et tableau électrique vert olive de 1917 → fonte et coffret de noyer ;
  - Poste 7 et accessoires communs (`06_props.js`, `11c_crater.js`, `20b_poste7_robot.js`, `11d_power.js`) : machines à atouts en tôle peinte, établi et mobilier de tranchée en bois brut, arbres morts en écorce (UV en mètres posées avant la fusion des troncs), entoilage du biplan en toile (c'était un drap de laine), char Mark IV et canon en tôle militaire, affût en bois brut, bidon en tôle, fusible émaillé, courroie en cuir.
- Réglés à l'œil sur les captures : le bois peint prenait la texture dessinée des planches brunes comme repère de clarté, et la palissade blanche et les portes de garage sortaient brun sombre (repère passé à la peinture salie, plus claire) ; le teck de la Cité était presque noir sur les meubles foncés (teinte relevée) ; la photo de caisse, un pin très orangé, faisait des barricades orange vif dans la prison (couleur ramenée à 55 % : `sat` dans `fetch_assets.py`).
- Outil : `dev/objets.mjs <carte> [qualité] [préfixe] [sortes]` → vues rapprochées des objets posés (une par sorte, 6 par planche, `dev/shots/`), grâce à `KIT.spots` (`?spots`).
- Mesures (Cité, `photoperf.mjs`) : mémoire vidéo des textures en « élevé » 228 → 258 Mo (+ 30 Mo pour les objets) ; en « bas », 84 Mo avec les photos allégées ; temps d'image sans écart mesurable.
- Tests avant mise en ligne : vérification photo des quatre cartes en « bas » et en « élevé » (chaque famille présente reçoit sa photo, les absentes ne sont pas téléchargées), vues rapprochées des objets et tournées des quatre cartes regardées une à une, `feat.mjs`, `mapplay` sur les quatre cartes, `touch.mjs`, `sounds.mjs`, `volumes.mjs`, `fullscreen.mjs`, `coop.mjs` et `coopmap.mjs` (erreurs des relais MQTT publics, refusés par le conteneur, seulement) : bons.

(Suite : voir la 5.2.)

## Fait (version 5.0) : les trois autres cartes en textures photo

Mise en ligne le 5 octobre 2026 : `main` (GitHub Pages) et l'Artifact du jeu avec salon co-op, republié avec `assets/cite/`, `assets/penitencier/`, `assets/filon/` et les versions allégées du Poste 7 (311 fichiers ; une publication en accepte 255 au plus, une version 511).

Demande du propriétaire : « fais les textures photo des trois autres cartes, assure-toi que tout fasse du sens et inspire-toi des meilleurs jeux ». Repères : Nuketown (Cité Atomique), Mob of the Dead (Pénitencier), Buried (Filon Maudit) ; dans ces cartes, la matière dit l'époque et le lieu avant les objets. Règle suivie : chaque photo doit être plausible pour l'année de la carte (Cité 1957, Pénitencier 1933, Filon 1880).

- **Méthode des cartes de plain-pied** (`ft` dans `PHOTO_SETS`) : les trois cartes peignent leurs murs et leurs sols avec les textures dessinées de `05b_flat.js` (`fmat`, `FLAT_TEX`, `FLAT_SCALE`). La photo remplace une texture dessinée partout où elle sert (`userData.ftex`, posé par `fmat`), à la même échelle (mètres par unité de texture) et avec la même teinte ; la luminosité moyenne est gardée (l'éclairage des cartes a été réglé pour les textures dessinées), à un facteur 0,45–2,4 près. `tint` corrige une photo dont la couleur ne colle pas ; `detail` garde le motif dessiné et ne prend à la photo que son relief et sa rugosité.
- **Cité Atomique** (`fetch_assets.py cite`, 6,5 Mo) : asphalte fissuré, trottoirs en dalles, pelouses (teintées plus vertes : gazon arrosé d'un village témoin), terre craquelée du lac asséché (teintée ocre : sinon une croûte de sel), bardeaux d'asphalte gris, brique, enduit peint, parquet, damier de cuisine, sol de garage pour les dalles, carrelage blanc, béton de l'abri, chêne, roche des mesas. Les clins des pavillons gardent leur dessin (leurs ombres franches font la maison ; une photo de planches neuves les aplatissait) avec le grain de l'enduit peint ; le papier peint « atomique » garde son motif avec le relief d'un papier abîmé. Ciel : « Rogland Sunset » (crépuscule).
- **Le Pénitencier** (4,4 Mo) : moellons bruts, rochers à lichens du rivage, béton crasseux, carrelage des douches, planches lavées des quais, vieilles planches du bureau du directeur (dehors et lambris), parquet, enduit peint, béton. La peinture en deux tons des cellules garde son dessin, avec le relief d'une peinture écaillée. Ciel : « Kloppenheim 04 ».
- **Filon Maudit** (4,9 Mo) : vieilles planches des façades, terre battue, roche de la caverne, planches brunes délavées (planchers, plafonds, boiseries), parquet usé, brique de la banque, enduit, damier, ardoises, pierre des soubassements. Ciel : « Drachenfels Cellar » (cave voûtée, lumière de caverne).
- **Cohérence d'époque** : le saloon du Filon (1880) était tapissé du papier peint « atomique » de la Cité (1957). Nouveau motif dessiné `victorian` (damas bordeaux à filets dorés, `05b_flat.js`), avec le relief du papier abîmé, pour les deux pièces rouges du saloon (`23_map_filon.js`).
- **Ciel photographié et soleil du jeu** : le soleil d'un HDRI faisait un second soleil, dans une autre direction que la lumière de la carte (le camion de la Cité était surexposé d'un côté). `fetch_assets.py` écrête le soleil photographié (au plus 12 fois la luminance moyenne) et note sa direction (`az`) ; le jeu tourne le ciel pour l'aligner sur sa propre lumière (`photoEnv`, `PHOTO.envShift`). Le Poste 7 (ciel couvert, sans soleil) n'est pas touché.
- **Téléphones (graphismes « bas »)** : ils n'avaient aucune photo jusqu'ici. `fetch_assets.py` écrit aussi des versions allégées (`<nom>_s.jpg` : couleur et relief en 512 px, rugosité en 256 px ; `--petit` les refait seules), chargées en « bas » ou avec `?photolite` : 0,8 à 1,2 Mo par carte.
- **Ombrage d'ambiance (N8AO)** : étendu aux quatre cartes (« élevé » et « ultra »).
- Corrigé au passage : les sols mélangés neige et boue du Poste 7 n'étaient pas comptés comme « faits » (`photoBlend` renvoie maintenant s'il a réussi).
- Tests : `CHECK=1 node photo.mjs <carte> <qualité>` vérifie que chaque matière de `PHOTO_SETS` a reçu sa photo et que la version allégée sert en « bas » ; ajouté à `runall.sh` pour les quatre cartes, en « bas » et en « élevé ». `photoperf.mjs <carte>` mesure le coût.
- Tests avant mise en ligne : vérification photo des quatre cartes en « bas » et en « élevé », `feat.mjs`, `mapplay` sur les quatre cartes, `touch.mjs`, `sounds.mjs`, `fullscreen.mjs`, `coop.mjs` et `coopmap.mjs` (erreurs MQTT du conteneur seulement) : bons. `volumes.mjs` attend maintenant la fin du chargement des photos (elles occupent le fil principal en arrivant, et arrivent désormais aussi en « bas ») ; il reste instable sur la machine de test : 4 réussites sur 6 en 5.0, 5 sur 6 avec la 4.9 dans les mêmes conditions. Échecs à chaque fois différents et minuscules (un canal coupé qui laisse passer 0,0005 à 0,005), sans changement du code audio. [à surveiller] S'il échoue plus souvent, chercher du côté du fil audio de Chrome quand le rendu logiciel charge la machine.
- Mesures (`photoperf.mjs`, rendu logiciel : seuls les écarts ont un sens, et ils sont bruités) :
  - mémoire vidéo des textures en « élevé » : Cité 90 → 228 Mo, Pénitencier 75 → 168 Mo, Filon 76 → 177 Mo ; en « bas » (versions allégées) : Pénitencier 40 → 63 Mo, Filon 38 → 64 Mo ;
  - temps d'image en « élevé » : photos sans effet mesurable (Cité 952 → 927 ms, Filon 1427 → 1467 ms) ; ombrage d'ambiance + 16 % (Cité) à + 18 % (Filon) ; au Pénitencier, écarts noyés dans le bruit ;
  - en « bas », en régime établi, ≈ 3 ms par image avec ou sans photos (4 séries de 40 images) ; des pics de 90 à 260 ms dans les premières secondes et par moments, présents aussi sans photos (moins hauts) : à surveiller sur un vrai téléphone.

Reste à faire sur les photos :
1. [à vérifier] Sur iPhone : temps de chargement des versions allégées et mémoire (aucune photo n'y était chargée avant).
2. ~~Objets (meubles, voitures, machines) encore en textures dessinées~~ : fait en 5.1 (voir plus haut).

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

- ~~Textures photo pour la Cité Atomique, le Pénitencier et le Filon~~ : fait en 5.0 (voir plus haut).
- Piste mémoire vidéo : compresser les textures en KTX2 (`ktx2-encoder`) si des machines modestes peinent.
