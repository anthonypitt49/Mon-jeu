# Technique three.js pour des infectés animés (chercheur « technique »)

# Animer les infectés avec de vraies animations capturées dans three.js r186 (24 à l'écran)

**Réponse courte :** c'est faisable sans changer de moteur. Le squelette de nos infectés porte déjà les noms du mannequin Unreal, et le pack d'animations CC0 de Quaternius (UAL2) se recible dessus sans table de noms. Un `AnimationMixer` par infecté coûte autant de calcul que le système actuel, ou moins. Le poids des fichiers peut baisser de moitié.

J'ai mesuré dans node (même moteur JavaScript que Chrome, sans rendu), en exécutant tel quel le code de `09_zombies.js` et `09b_zreal.js`. Je n'ai lancé aucun navigateur : le coût côté carte graphique et le rendu à l'œil restent **non vérifiés**. Rien n'a été modifié dans `/home/user/Mon-jeu` (`git status` vide).

## 1. Ce que j'ai lu dans notre code

- **Aujourd'hui :** `poseBody` pose 20 os procéduraux invisibles. `zrealPose` recopie leurs rotations sur les 53 os du modèle (rotation de calage `K[name]` par os). Les sphères de tir, la poupée de chiffon (`Ragdoll.apply`) et le gore (`zSever`, `LIMBS`, `goreGib`) passent tous par les os procéduraux.
- **Squelette « game_engine » (lu dans `p7_a.glb`) :** `Root > pelvis > spine_01..03 > neck_01 > head`, `clavicle/upperarm/lowerarm/hand_l|r` avec 15 phalanges, `thigh/calf/foot/ball_l|r`. Ce sont **les noms du mannequin Unreal 4**.
- **Pas d'os de mâchoire.** Par contre, `rig.default.json` de MPFB2 (163 os) en a un, `jaw`, et son fichier de poids `weights.default.json` (licence `CC0` dans le fichier) contient un groupe `jaw` de 911 sommets.
- **Les poses de repos diffèrent d'un infecté à l'autre** (comparaison des 18 GLB) : jusqu'à 25° sur `spine_01`, 14° sur `head`, 12° sur `pelvis` et `thigh`, et 57° sur `ball_l`/`ball_r` (chaussures des femmes). Un même clip ne peut donc pas être appliqué tel quel aux 18 : il faut une correction par personnage.

## 2. Mesures

| Point | Résultat |
|---|---|
| Os appariés UAL2 → p7_a | 53 sur 53 ; seuls `head`↔`Head` et `Root`↔`root` diffèrent |
| Poses de repos | Nos modèles en A (bras 49° sous l'horizontale), UAL2 en T (0°) |
| `retargetClip`, 4 clips (marche, attente, griffure, recul) | 62 à 90 ms en tout ; chaque clip donne 54 pistes (53 rotations + position du bassin), aucune piste d'échelle |
| Qualité du reciblage | Membres : 0,1° d'écart moyen avec la source, pire 9° (griffure). Dos et cou : décalage constant de 13 à 20° (courbure propre du corps MakeHuman, voulue) |
| Pieds | Le plus bas des orteils va de −6,4 cm (dans le sol) à +8,3 cm (en l'air) selon le clip : il faudra une correction |
| Vitesse au sol de `Zombie_Walk_Fwd_Loop` | 0,97 m/s (cycle de 1,33 s) ; notre marcheur va à 1,05 m/s, soit une vitesse de lecture ≈ 1,08 |

**Coût de calcul pour 24 infectés, en ms par image** (4 lancements, d'où des fourchettes) :

| Variante | ms par image |
|---|---|
| Système actuel (20 os procéduraux recopiés sur 53) | 0,73 à 0,89 |
| Mixeur, 1 clip | 0,31 à 0,52 |
| Mixeur, 2 clips mélangés | 0,43 à 0,60 |
| Mixeur, 2 clips + 1 clip additif (coup reçu) + retouches procédurales | 0,63 à 0,87 |
| Mixeur, 2 clips + « rétro-reciblage » vers les 20 os procéduraux | 1,08 à 1,14 |

Le rétro-reciblage est l'inverse exact de `zrealPose` pour les os suivis : mixeur → os procéduraux → modèle redonne la même pose à 0,11° près. En mémoire, les 4 clips reciblés pèsent 167 Ko, partagés par tous les infectés d'un même modèle.

**Poids des fichiers** (GitHub Pages sert les GLB compressés en gzip, en-tête vérifié) :

| Fichier | Brut | Transféré (gzip) |
|---|---|---|
| `p7_a.glb` actuel | 975 Ko | 702 Ko |
| Après gltfpack `-cc` (géométrie compressée meshopt, 536 → 120 Ko) | 559 Ko | 507 Ko |
| + textures KTX2 ETC1S (couleur 2048 : 256 Ko, relief 84 Ko, découpe 3 Ko) | 470 Ko | 438 Ko |
| Relief en KTX2 UASTC (image seule) | 554 Ko | — |
| 4 clips seuls (5,3 s), `-cc` | 68 Ko | 21 Ko |
| Les mêmes en `-ar 10 -af 20` | 60 Ko | 15 Ko |

- Le relief en UASTC est trop lourd : écarté.
- **Niveaux de détail** (gltfpack `-si`) : 13 186 → 5 271 triangles (`-si 0.4`, 66 Ko de géométrie) et 2 474 triangles (`-si 0.15` ; 3 100 avec `-slb`, qui bloque les bords, 43 Ko). Rendu non vérifié à l'œil.
- **Mémoire vidéo (calcul, pas mesure) :** aujourd'hui ≈ 29 Mo par infecté en « élevé », soit 120 à 150 Mo par carte. En KTX2 transcodé, ≈ 3,7 Mo par infecté, soit 15 à 18 Mo par carte.

## 3. Comparaison des techniques

**a. `AnimationMixer` par infecté : recommandé.**
- Il coûte autant ou moins que le système actuel.
- Le seuil de difficulté signalé sur le forum three.js se situe autour de 200 personnages animés, pas 24.
- Pour les infectés lointains, la règle actuelle (`lodAcc`, une pose toutes les 0,066 à 0,25 s) s'applique telle quelle à `mixer.update`.

**b. Reciblage : mettre l'aller-retour avec Quaternius hors du jeu.**
- Un outil node (même three r186) recible une fois les clips UAL sur un squelette MakeHuman de référence et écrit un seul fichier d'animations compressé.
- Au chargement, chaque modèle reçoit une correction constante calculée depuis sa pose de repos : rotation locale = inverse(décalage du parent) × rotation de référence × décalage de l'os. C'est deux multiplications de quaternions par clé, quelques ms.
- Relancer `retargetClip` au chargement prendrait ≈ 2 s pour 25 clips × 5 modèles.
- Mettre les clips dans chaque GLB coûterait ≈ 18 × 425 Ko.
- **Piège trouvé** : dans r186, `retarget()` ignore tout os absent de `options.names` (pas de repli sur le même nom, contrairement à `retargetClip`). Il faut lister les 53 os, même identiques. Sans cela, le clip produit est figé.
- Les décalages se calculent comme notre `ZR_ALIGN` : rotation qui amène la direction de chaque os du modèle sur celle de la source, avec `localOffsets[os] = inverse(repos source) · alignement · repos cible`.

**c. Mélange animation capturée + procédural.** Tout ce qu'il faut existe dans r186 (vérifié dans les fichiers installés) :
- `crossFadeTo`, `setEffectiveWeight`, `setEffectiveTimeScale`, `syncWith`, `warp` pour passer d'un clip à l'autre ;
- `AnimationUtils.makeClipAdditive` et `AdditiveAnimationBlendMode` pour superposer les coups reçus (testé dans le banc) ;
- un clip réduit aux pistes du haut du corps pour attaquer en marchant.

Recul (`fl`), regard et mâchoire s'appliquent après `mixer.update` en multipliant les quaternions de `spine_03`, `head` et `jaw` (dans le banc : environ +0,2 ms pour 24 infectés, compris dans la ligne additive).

La poupée de chiffon ne change pas : à la mort, le mixeur s'arrête et on reprend le chemin actuel (procédural → modèle). Seul point de départ : grâce au rétro-reciblage, les os procéduraux sont déjà dans la pose capturée.

**d. Mâchoire et visage.**
- **Os de mâchoire : recommandé.** Ajouter `jaw` (enfant de `head`) au squelette « game_engine » dans `make_zombies.py`, avec la position et les poids du squelette « default » (911 sommets, CC0). Les dents du bas et la langue doivent recevoir ce poids. Coût négligeable, et il s'anime en procédural comme aujourd'hui (`p.jaw`).
- **Formes de visage (morph targets) : en option.** Le pack `faceunits01` (fiche du pack : licence `CC0` pour les 52 formes, auteur Mika Suominen) contient `jawOpen` (2 543 sommets du corps de base), `noseSneerLeft/Right`, `mouthUpperUpLeft/Right`, `mouthStretch*`, de quoi faire un rictus. Mais le script allège le maillage (Decimate) après avoir figé les formes. Une forme de visage devra être reportée sur le maillage allégé (par exemple Surface Deform depuis le maillage complet), à vérifier. À prévoir aussi au préchauffage, car ces formes ajoutent une variante de shader.

**e. Démembrement avec un mixeur.**
- La méthode actuelle (os mis à l'échelle 0,001, moignon, copie du modèle qui vole) reste valable : les clips reciblés n'ont aucune piste d'échelle, donc le mixeur n'écrase pas l'os replié.
- Par prudence : retirer toute piste d'échelle et réappliquer l'échelle après `mixer.update`.
- Le morceau qui vole reste une copie figée de la pose du moment, sans mixeur.
- Le ramper reste procédural : la version gratuite (Standard) d'UAL n'a pas de clip de ramper.

**f. Textures d'animation (VAT) pour les foules : non.**
- Positions et normales pour 400 images coûteraient ≈ 54 Mo par modèle (calcul).
- Sans os, on perd sphères de tir, gore et poupée de chiffon.
- L'instanciation d'os ne sert qu'au-delà de 200 personnages environ.

**g. Compression, niveaux de détail, poids.**
- **meshopt : oui.** Le décodeur de three (`meshopt_decoder.module.js`) contient son WebAssembly en base64 : aucun fichier de plus, ce qui convient à l'Artifact. Activation par `GLTFLoader.setMeshoptDecoder`.
- **KTX2 ETC1S : pour la couleur et la découpe.** Pour le relief, garder le JPEG ou essayer l'ETC1S à l'œil.
- **Draco : non.** gltfpack ne le gère pas et il ne compresse pas les animations.
- Le mode « moyen » (`zrealHalf`, réduction de l'image sur un canvas) n'est plus possible avec du KTX2. Ce n'est pas un problème : la couleur 2048 en KTX2 prend ≈ 2,8 Mo de mémoire vidéo, moins que l'actuelle 1024 en RGBA (≈ 5,6 Mo).
- Dans l'Artifact, compter +33 % (base64) : ≈ 627 Ko par infecté.

**h. Ombres.**
- En « élevé », chaque infecté qui projette une ombre est dessiné trois fois : image, ombre de la lune, ombre de la lampe torche.
- Dans r186, la passe d'ombre teste les calques de la caméra **principale** (`WebGLShadowMap.js`, ligne 522) : un « modèle pour l'ombre seulement » ne peut pas passer par les calques.
- Solution : un second SkinnedMesh allégé (≈ 5 300 triangles) sur le **même** squelette, matériau `colorWrite: false, depthWrite: false`, `castShadow` vrai, et `castShadow` faux sur le corps détaillé. Gain estimé ≈ 60 % des sommets des passes d'ombre (calcul).
- La règle actuelle (ombre seulement à moins de 26 m) reste en place.

## 4. Architecture recommandée, étape par étape

1. **Outil d'animations hors du jeu** (nouveau `tools/make_anims.mjs`, node et three r186) :
   - lire UAL2 (et UAL1, version Godot avec table de noms `DEF-…`) et recibler sur une référence MakeHuman avec la table complète des 53 os ;
   - régler la hauteur du bassin par clip (constat : −6 à +8 cm) ;
   - garder les rotations et la position du bassin, puis gltfpack `-cc`, pour sortir un seul fichier d'animations.
   - Poids : 21 Ko gzip mesurés pour 4 clips ; ≈ 130 Ko pour 25 clips (extrapolé).
2. **Dans le jeu** :
   - un mixeur par infecté sur `real.mesh` ;
   - correction par modèle au chargement ;
   - machine d'états marcher / trottiner / sprinter / attendre / attaquer / arracher les planches / coup reçu, fondus de ≈ 0,2 s, vitesse de lecture = vitesse du jeu ÷ vitesse du clip (0,97 m/s pour la marche zombie), départ décalé au hasard ;
   - pose espacée au loin, comme aujourd'hui.
   - Mesuré : 0,43 à 0,87 ms pour 24.
3. **Couches procédurales après le mixeur :** recul, regard, mâchoire, coups reçus en additif ; course avec les bras tendus en remplaçant le haut du corps.
4. **Rétro-reciblage** des 20 os procéduraux pour les sphères de tir, la poupée et le gore, qui restent inchangés. Mesuré : 1,08 à 1,14 ms pour 24 au total. On peut l'espacer ou ne le faire que pour les infectés visés. À la mort, la poupée prend le relais comme aujourd'hui.
5. **Os `jaw` dans `make_zombies.py`**, puis refaire les 18 GLB.
6. **Compression et allègement :** gltfpack `-cc`, couleur en ETC1S, deux niveaux de détail plus le modèle d'ombre. Par carte : ≈ 2 à 2,5 Mo au lieu de 4 à 5 Mo.
7. **En option :** rictus en formes de visage (faceunits01).
8. **Inchangés :** « bas » / téléphones (corps procéduraux) et ramper procédural.

## 5. Risques

- **Pieds qui flottent ou s'enfoncent :** décalage par clip. Sinon `CCDIKSolver`, présent dans r186.
- **Peu de clips de zombie dans la version gratuite :**
  - UAL2 Standard : `Zombie_Idle_Loop`, `Zombie_Walk_Fwd_Loop`, `Zombie_Scratch`, `Hit_Knockback`, `LayToIdle` (se relever du sol).
  - UAL1 Standard : `Walk/Jog_Fwd/Sprint_Loop`, `Hit_Chest`, `Hit_Head`, `Death01`, `Crouch_Fwd_Loop`.
  - La version Source (complète) est payante. Ce que dit la page itch.io : « Name your own price », un palier à 14,99 $ dont l'objet n'est pas précisé, 42 animations « completely free ».
- **Mixamo :** compte Adobe requis, et licence de redistribution non vérifiée (page Adobe en 403 ici). Risqué tant que nos fichiers d'animation sont téléchargeables.
- **KTX2 dans l'Artifact (non vérifié) :** il faut le transcodeur (`basis_transcoder.js` 57 Ko + `.wasm` 527 Ko) et un worker. L'Artifact peut les bloquer. meshopt n'a pas ce problème.
- **Qualité de l'ETC1S sur le relief et des niveaux de détail :** à juger à l'œil.
- **Coût côté carte graphique :** non mesuré.
- **Co-op :** chaque poste dérive les clips de l'état réseau, déjà transmis. Les phases d'animation diffèrent d'un poste à l'autre, sans effet sur le jeu.

## Sources

- **three.js r186 installé (lu) :**
  - `source/dev/node_modules/three/examples/jsm/utils/SkeletonUtils.js` (`retarget`, `retargetClip`, options) ;
  - `src/animation/AnimationUtils.js`, `AnimationAction.js`, `AnimationMixer.js` ;
  - `src/renderers/webgl/WebGLShadowMap.js` ;
  - `examples/jsm/libs/meshopt_decoder.module.js` et `examples/jsm/libs/basis/` ;
  - `examples/jsm/animation/CCDIKSolver.js`.
- **UAL (licence CC0 lue dans `License.txt` des deux zips téléchargés) :**
  - [Quaternius, page UAL](https://quaternius.com/packs/universalanimationlibrary.html)
  - [UAL2 sur OpenGameArt](https://opengameart.org/content/universal-animation-library-2), [UAL1 sur OpenGameArt](https://opengameart.org/node/174563)
  - [UAL2 sur itch.io](https://quaternius.itch.io/universal-animation-library-2)
- **MakeHuman / MPFB2 :**
  - [Pack faceunits01](https://static.makehumancommunity.org/assets/assetpacks/faceunits01.html) (licence lue dans `packs/faceunits01.json` du zip) ;
  - [MPFB 2.0.15](https://static.makehumancommunity.org/mpfb/releases/release_2015.html), [MPFB 2.0.16](https://static.makehumancommunity.org/mpfb/releases/release_2016.html) ;
  - fichiers locaux de MPFB2 : `/root/.config/blender/4.2/extensions/user_default/mpfb/data/rigs/standard/rig.default.json` et `weights.default.json`.
- [gltfpack (meshoptimizer.org)](https://meshoptimizer.org/gltf/)
- [Forum three.js : 100 à 1000 SkinnedMesh](https://discourse.threejs.org/t/optimization-of-large-amounts-100-1000-of-skinned-meshes-cpu-bottlenecks/58196)
- Textures d'animation : [three-vat](https://github.com/manthrax/three-vat), repéré par la recherche mais non ouvert.
- En-têtes de GitHub Pages vérifiés par curl sur `anthonypitt49.github.io/Mon-jeu/assets/zombies/p7_a.glb`.

## Fichiers de travail

Tout est dans `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/technique/` (≈ 45 Mo téléchargés) :
- banc de reciblage et de coût (relancer avec `node bench.mjs <glb> <UAL2_Standard.glb> /home/user/Mon-jeu/source/src`) : `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/technique/bench/bench.mjs`
- compression KTX2 : `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/technique/bench/ktx.mjs` et `ktx2.mjs` (même dossier)
- comparaison des poses de repos des 18 infectés : `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/technique/scripts/restcompare.mjs`
- inventaire d'un GLB (os, animations, images) : `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/technique/scripts/glbinfo.mjs`
- GLB compressés : `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/technique/comp/`
- clips extraits : `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/technique/anims/`