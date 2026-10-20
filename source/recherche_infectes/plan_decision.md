# Infectés façon Black Ops 2 : document de décision

*Synthèse du 20/10/2026, faite à partir de la version 6.0 du jeu. Sources : `reference_bo2.md`, `technique_threejs.md`, `candidats.md`, puis la seconde passe de vérification. Seuls les éléments vérifiés sont retenus. Tout ce qui n'a pas été revérifié porte la mention « non vérifié ».*

---

## 1. Constat franc

**L'essentiel :** aucun modèle gratuit et juridiquement sûr ne fait nettement mieux que nos 18 infectés MakeHuman. Les zombies téléchargeables les plus proches de BO2 posent tous un problème :
- les uns ont une origine douteuse (martinezequielgorno) ;
- d'autres ont une licence incompatible avec un jeu web public (« Egor », Mixamo) ;
- le dernier n'est d'aucune de nos époques (better_peter, en tenue moderne).

Ce qui nous sépare de BO2 tient d'abord au **mouvement**, aux **yeux**, au **gore** et à la **matière**, bien plus qu'au maillage lui-même.

| Rang | Écart | Impact | BO2 | Nous (v6.0) |
|---|---|---|---|---|
| 1 | Animations | 5 | 336 animations pour un infecté ordinaire de Mob of the Dead (dont 114 rampantes), attaques en marchant, courte animation de mort puis poupée de chiffon à 35 % de sa durée | une seule fonction procédurale pour tous ; l'infecté s'arrête net pour attaquer ; poupée de chiffon immédiate |
| 2 | Yeux lumineux | 5 (coût faible) | halo large, couleur propre à chaque carte | sphères de 1,7 cm sous le seuil du halo (0,53 contre 0,9), à peine 1 pixel à 10 m |
| 3 | Gore | 4 | bras arrachés même sur un coup non mortel, chapeau qui saute, tête qui éclate, marcheur sans tête, corps et membres préparés à l'avance | membres arrachés par dégâts cumulés, tête arrachée seulement à la mort, moignon en sphère générique |
| 4 | Matière et bouche | 4 | sang frais brillant, peau luisante, vêtements déchirés, mâchoire pendante | rugosité uniforme de 0,8, sang séché, bouche fermée, aucun os de mâchoire |
| 5 | Sons | 4 | 9 catégories de voix, son « derrière vous » | 3 enregistrements. **Les sons n'ont pas été cherchés pendant cette campagne.** |
| 6 à 8 | Sortie de terre, barricades, franchissements | 3 | animations dédiées (9 sorties de terre, 54 arrachages de planches, 45 franchissements) | mouvements procéduraux, pas d'animation pour enjamber la fenêtre |
| 9 | Variété des corps | 3 | un corps, une tête et un chapeau tirés au hasard | 3 ou 4 corps par époque. Pas un gros écart, mais têtes et chapeaux ne sont pas séparés |
| 10 | Éclairage et brouillard | 3 | étalonnage par zone, brouillard en hauteur | brouillard uniforme |
| 11 et 12 | Rampants, rythme des manches | 2 | | |

---

## 2. Ressources

### 2a. Retenues (vérifiées en seconde passe)

Abréviations des cartes : **P7** Poste 7 (1917), **Cité** (1957), **Pén.** Pénitencier (1933), **Filon** (1880). « Les 4 » signifie toutes les cartes.

| Ressource | Lien | Licence | Redistribution | Accès | Ce qu'elle apporte | Cartes |
|---|---|---|---|---|---|---|
| Quaternius UAL2, version Standard | https://quaternius.itch.io/universal-animation-library-2 | CC0 1.0 (License.txt du zip). La QAL v1.0 du site date du 28/08/2026 et n'est pas rétroactive : **garder le License.txt** | oui dans le jeu ; ne pas publier le pack brut à part | direct (zip de 18,7 Mo testé) | Zombie_Walk_Fwd_Loop, Zombie_Idle_Loop, Zombie_Scratch, Hit_Knockback, LayToIdle, ClimbUp_1m. Ses 65 os portent les mêmes noms que nos 53 (seules différences : la casse de Head et Root) | les 4 |
| Quaternius UAL2, version Source (14,99 $) | même page | CC0 (pas achetée) | oui | **achat par le propriétaire** | liste vue sur l'image officielle : Zombie_Run en 8 directions, Zombie_Walk en 8 directions, Zombie_Bite, Zombie_Spawn (nom seulement, jamais vu bouger), SafetyVault, ClimbUp_2m, GetOffWall. Le .blend demande probablement Blender ≥ 4.3 (la version Standard est en 4.3) | les 4 |
| Quaternius UAL1, version Standard | https://quaternius.itch.io/universal-animation-library | CC0 1.0 (License.txt) | oui (même réserve QAL) | direct (zip de 15,9 Mo testé) | Hit_Head, Hit_Chest, Death01, Sprint_Loop, Jog, Punch, Push_Loop (base possible pour les coups sur barricade), même squelette. La rampe n'existe que dans les versions Pro et Source, **noms de clips non vus** | les 4 |
| 100STYLE (Mason, Starke, Komura) | https://zenodo.org/record/8127870 | CC-BY 4.0. Crédit : « The 100STYLE Dataset - Ian Mason » | oui | direct (1,47 Go au total, lecture partielle par plages HTTP testée) | vraie capture de mouvement : Zombie (marche 173 s, course 83 s, attente 36 s), Drunk, DragLeftLeg et DragRightLeg, LimpLeft et LimpRight. BVH de 23 articulations sans doigts : table de correspondance à écrire. **Ne pas prendre le maillage Geno** | les 4 |
| Anderson Rohr, pack gratuit n° 8 « Halloween » | https://andersonrohr.gumroad.com/l/mocap_pack8 | gratuit, usage commercial permis, sans crédit ; seule interdiction : redistribuer le pack « comme produit autonome » | oui une fois intégré au jeu (risque faible) | **connexion requise** (Gumroad demande une adresse courriel) | 5 marches zombies et environ 6 attaques en capture de mouvement, squelette Manny UE5 (spine_01 à 05 : petite table à écrire). **Fichiers non mesurés** | les 4 |
| Vêtements MakeHuman (packs et catalogue) | https://static.makehumancommunity.org/assets/assetpacks.html et http://www.makehumancommunity.org/clothes.html | CC0 ou CC-BY selon l'objet. **C'est l'en-tête du .mhclo qui fait foi, pas l'étiquette du pack** (de l'AGPL3 et du NC y ont été trouvés) | oui (CC0 et CC-BY seulement) | direct | silhouettes d'époque compatibles MPFB : veste d'uniforme punkduck (Pén., 5 054 triangles, carte de normales), melon culturalibre (Filon, 2 368 triangles), casquette plate, trilby et haut-de-forme d'Elvaerwyn, costumes Toigo en CC0 (Pén. et Cité), toigo_wool_pants en CC0, bleu de travail (34 633 triangles à réduire, écussons modernes à repeindre), trench (19 924 triangles), casque colonial, patrol cap, bottes punkduck. **Aucun casque Adrian ni Brodie** | les 4 |
| WW2 Panzergrenadier 2k et kit WW2 headwear (britdawgmasterfunk) | https://sketchfab.com/3d-models/ww2-panzergrenadier-2k-cc0-6a104431bcb8400080b79446ec019696 et https://sketchfab.com/3d-models/ww2-headwear-cc0-7092309d3b0d4ca6bcd4bfeec9640e29 | CC0 déclaré par l'auteur, étiquette Sketchfab CC-BY (au pire, donc, créditer) | oui | **connexion requise** (compte Sketchfab) | meilleure base libre pour un soldat : 27 005 faces, 23 textures 2k, aucune animation. Le kit contient un casque britannique presque identique au Brodie (625 730 faces, modificateurs non appliqués). L'uniforme est de 1939-1945 : il faut retirer le filet, changer le casque et revoir les poches | P7 |
| Zombie Hazmat (LxNazarov) | https://sketchfab.com/3d-models/zombie-hazmat-49b3b4307f6a4d2386fdb02354158d04 | CC-BY 4.0 (créditer LxNazarov) | oui | **connexion requise** | variante spéciale en combinaison anti-radiation, visage pourri derrière la visière. 15 521 faces, 4 animations Mixamo **à supprimer**, squelette Mixamo à recibler | Cité |
| Zombie Soldier (better_peter) | https://sketchfab.com/3d-models/zombie-soldier-176e930e63d144cc8f615b8dd3a8c74f | CC-BY 4.0 (créditer better_peter) ; origine propre impossible à prouver | oui | **connexion requise** | référence de rendu la plus proche de BO2 (visage arraché, avant-bras écorchés). 7 176 faces, 6 animations Mixamo **à supprimer**. Vêtements modernes : sert de référence, ou de base pour la tête et les bras | aucune telle quelle |
| TextureCan, Others 0001 (chair) | https://www.texturecan.com/details/137/ | CC0 1.0 (page des conditions lue) | oui | direct, **avec des en-têtes de navigateur complets** (sinon erreur 406) | chair pour les moignons, les coupes et le cou. À assombrir et désaturer ; les cartes utiles sont la normale et la hauteur | les 4 |
| TextureCan, Skin 0001 | https://www.texturecan.com/details/574/ | CC0 1.0 | oui | direct (même réserve d'en-têtes) | normale de détail pour les pores de la peau, à répéter. Priorité basse : la couleur est inutile | les 4 |
| OpenGameArt, ~100 grunge brushstrokes and splatters (Dino0040) | https://opengameart.org/content/100-grunge-brushstrokes-and-splatters-set | CC0 | oui | direct (34,7 Mo) | environ 50 vraies éclaboussures pour peindre sang séché et crasse dans make_zombies.py, et pour les décalques au mur et au sol | les 4 |
| Peau sohh_female_zombie_skin (pack skins03) | https://static.makehumancommunity.org/assets/assetpacks/skins03.html | CC0 (page du pack et .mhmat) | oui | direct (lecture partielle du zip de 137 Mo) | diffuse et relief 4096 sur l'UV MakeHuman : couche de veines, d'ecchymoses et de plaies, à réduire en 2048 | les 4 |
| Os de mâchoire MPFB « default » | https://github.com/makehumancommunity/mpfb2 | squelettes et poids en CC0 (section C de LICENSE.md) ; outil GPL, non distribué | oui | déjà installé | mâchoire : 53 → 54 os, testée sans écran avec export GLB. **La langue ne suit pas d'elle-même** (2 sommets sur 226) : à pondérer à la main. Le jeu a déjà `BN.jaw` et `p.jaw` | les 4 |
| Faceunits 01 (52 formes de visage ARKit) | https://static.makehumancommunity.org/assets/assetpacks/faceunits01.html | CC0 (Mika Suominen) | oui | direct (258 Ko) | rictus fixé dans le maillage, différent pour chaque infecté. Le report sur le maillage allégé est vérifié (Surface Deform, en donnant d'abord la forme du corps à la copie). Priorité basse | les 4 |
| Découpe gore hors du jeu (bpy et bmesh) | https://pypi.org/project/bpy/ | Blender GPL ; le résultat nous appartient | oui | déjà installé | corps et membres préparés à l'avance, comme dans BO2. Découpe et bouchage testés, à condition de filtrer les groupes qui ne sont pas des os. Le capuchon est un polygone plat de 26 côtés, sans UV : il reste à habiller | les 4 |

### 2b. En réserve : non vérifiés en seconde passe

Ces éléments n'ont été vus que lors de la première passe (`candidats.md`).

- **Zombie de pxltiger** (CC-BY plus une note de l'auteur, téléchargement direct par Objaverse) : 4 824 triangles, os de mâchoire, 10 animations. Utile pour tester une mâchoire, pas comme modèle du jeu.
- **Eric Rigged 001 (Renderpeople)** : CC-BY, connexion requise, scan avec textures 8k. Possible pour Pén. et Cité.
- **Western Cowboy (stevedaman)** : CC-BY, direct, 35 310 triangles, origine du corps non décrite. Possible pour le Filon.
- **Textures** : tissus Poly Haven et ambientCG (CC0), Blood overlay OGA (CC0), Splatter pack de johndh (CC-BY 3.0), Blue Rose Sonata (CC-BY 4.0).
- **CMU mocap** (« free for all uses », revente des données interdite) : relevés du sol et chutes. Capture ancienne et bruitée.
- **TRELLIS.2 et TripoSG** (poids sous licence MIT) : aucune génération lancée.

### 2c. Écartées

- **Zombies de martinezequielgorno** : origine douteuse. Le même compte publie un Phoenix Wright (personnage de Capcom) en CC-BY et 7 personnages finis en environ 40 h. Ils ne sont pas riggés.
- **Zombie « Egor »** : la licence Sketchfab Standard (§2.2 b et h) interdit un fichier extractible. Il pèse aussi 109 403 faces.
- **Mixamo** : la FAQ Adobe interdit « free distribution of … raw files », et nos GLB sont publics. Il faut en plus un compte Adobe. Le propriétaire peut lever ce choix (question 1).
- **MoCap Online** : sa licence exige une distribution binaire dont on ne peut pas extraire les animations, ce qu'un jeu web ne permet pas. Payant.
- **Bandai-Namco** (CC BY-NC, aucun zombie) et **LAFAN1** (CC BY-NC-ND) : licences non commerciales.
- **Half-Eaten Zombie (G4G)** : fabriqué avec l'IA, redistribution interdite, squelette maison de 24 os.
- **TextureCan Steak** : la version téléchargeable est de la viande cuite qui fait un quadrillage au pavage. La version « Inside » ne s'obtient qu'avec le logiciel Substance.
- **naim_abbassi_zombie_skin** : style dessin animé, filigrane « ©MakeHuman.org », aucune ligne de licence dans le .mhmat.
- **Corps Adobe Fuse** (Zombie Detective, Zombie Walk Test, corps des modèles de tnnv) : distribution des fichiers bruts interdite.
- **Male City Zombie (OGA)** : animations Mixamo publiées sous un faux CC0.
- **Vêtements AGPL3 ou NC trouvés dans des packs « libres »** : jujube_newsboy_cap, maciekg_leather_boots, ews_striped_shirt, maciekg_leather_helmet, scailman_low-heeled_boots, etc. ; punkduck_diver_suit est en CC-BY-NC-SA ; cortu_cargo_pants n'a aucune licence. Le « Newsboy cap » marqué CC0 dans le catalogue est peut-être un autre objet : vérifier son .mhclo.
- **Rigify** : 930 os. Inutile sans animateur devant Blender ; à revoir plus tard.
- **Hunyuan3D 2 et 2.1** : la licence ne s'applique pas dans l'UE, au Royaume-Uni ni en Corée du Sud.
- **Meshy** (gratuit en CC BY 4.0, mais les marqueurs d'IA ne doivent pas être retirés), **Rodin** (usage libre seulement en payant), **Tripo** (conditions illisibles) : risqués.
- **UniRig** : il faut un GPU, absent du conteneur.
- **Tout contenu extrait d'un jeu** (BO2 Mob of the Dead et Nuketown vus sur Sketchfab, L4D, HL2, Fallout, etc.) : interdit.

---

## 3. Voies possibles

| | A. Garder MakeHuman et l'enrichir | B. Remplacer par des modèles téléchargés | C. Génération IA et rig automatique |
|---|---|---|---|
| Principe | animations capturées (UAL, 100STYLE, Rohr) sur nos 18 GLB, os de mâchoire, gibs préparés, vêtements d'époque, matière, yeux | Zombie Soldier, Hazmat et Panzergrenadier à la place de nos corps | TRELLIS.2 ou TripoSG sur Hugging Face, puis rig automatique |
| Qualité visée | proche de BO2 pour le mouvement, le gore et la silhouette d'époque ; les visages restent un cran sous les meilleurs zombies sculptés | meilleur visage pour better_peter, mais en tenue moderne. Aucun civil de 1880 ou 1933 ni soldat de 1917 prêt à l'emploi | **non vérifiée** : aucune génération lancée ; pas de squelette, topologie sale, pas de mâchoire |
| Travail | élevé mais découpé en petites étapes. La chaîne actuelle est conservée ; dans le banc de mesure (node), 24 infectés coûtent 0,43 à 0,87 ms par image avec le mixeur, et 1,08 à 1,14 ms avec le rétro-reciblage | élevé pour chaque modèle : retirer les animations Mixamo, recibler un squelette Mixamo, réduire, zombifier. On perd la chaîne MPFB (vêtements, mâchoire, formes de visage, gibs) | élevé et incertain. Impossible dans le conteneur (TRELLIS.2 exige un GPU de 24 Go) |
| Licences | faible risque : CC0 et CC-BY avec crédits | CC-BY correct ; l'origine de better_peter reste impossible à prouver | poids MIT corrects, mais sorties d'IA ; Meshy et Tripo flous ; Hunyuan exclu dans l'UE |
| Poids web | environ 130 Ko gzip pour 25 clips (extrapolé). Après compression, 2 à 2,5 Mo par carte au lieu de 4 à 5 | de 7 000 à 27 000 faces par modèle, à réduire ; non mesuré | inconnu |
| Rôle du propriétaire | juger à l'œil ; en option, acheter UAL2 Source (14,99 $) et laisser un courriel sur Gumroad | compte Sketchfab, téléchargements à la main | lancer lui-même les générations (compte Hugging Face), avec des images d'entrée qui ne viennent pas de BO2 |

---

## 4. Recommandation et plan

**Je recommande la voie A**, avec un peu de voie B pour deux variantes spéciales : le Hazmat pour la Cité, et un soldat de 1917 tiré du Panzergrenadier et du casque du kit. **La voie C est à écarter**, sauf peut-être pour des accessoires (casques de 1917, lampes de mineur).

On commence par ce qui pèse le plus pour le moins de travail : les yeux, puis les animations. La qualité « élevé » est la cible ; la version téléphone reste telle quelle.

**Règle pour toutes les étapes :** on peut s'inspirer des règles de BO2, mais rien ne doit être copié de ses scripts décompilés ni de ses images. Chaque ressource CC-BY est ajoutée aux crédits du jeu à l'étape où elle entre.

### Étape 1. Yeux lumineux par carte (code seulement)
- [ ] Couleur émissive au-dessus du seuil du halo (0,9, `04_render.js:82`), sans brouillard ni mappage des tons.
- [ ] Petit halo additif de 6 à 10 cm.
- [ ] Une couleur par carte : Pén. rouge, Filon bleu, P7 orangé, Cité jaune puis bleu en manches avancées.
- **Vérifié quand :** le halo se voit à 20 m en « élevé » (capture d'écran par le propriétaire).

### Étape 2. Outil d'animations hors du jeu (`tools/make_anims.mjs`, UAL1 et UAL2 Standard)
- [ ] Ranger les License.txt CC0 avec les sources ; ne pas publier les packs bruts.
- [ ] Recibler sur une référence MakeHuman en listant **les 53 os** (piège de `retarget()` dans r186 : sans la liste complète, le clip est figé).
- [ ] Corriger la hauteur du bassin clip par clip (de −6,4 à +8,3 cm mesurés).
- [ ] Produire un seul fichier d'animations compressé (gltfpack `-cc`).
- **Vérifié quand :** le fichier pèse environ 150 Ko gzip au plus et les pieds touchent le sol à ±1 cm dans le banc de mesure.

### Étape 3. Mixeur dans le jeu
- [ ] Un `AnimationMixer` par infecté, avec une correction de pose de repos par modèle au chargement.
- [ ] États : attente, marche, sprint, attaque **en marchant** (haut du corps seulement), coup reçu en additif ; fondus d'environ 0,2 s ; vitesse de lecture = vitesse du jeu ÷ 0,97 m/s.
- [ ] Courte mort (Death01) avant la poupée de chiffon.
- [ ] Rétro-reciblage vers les 20 os procéduraux, pour que les sphères de tir, le gore et la poupée restent inchangés.
- **Vérifié quand :** 24 infectés coûtent environ 1,2 ms par image au plus, sans régression du gore ni de la poupée, et le propriétaire valide à l'œil.

### Étape 4. Os de mâchoire (`make_zombies.py`)
- [ ] Greffer `jaw` (squelette default) sur game_engine, ce qui donne 54 os ; retirer ses poids du groupe `head`.
- [ ] Faire suivre les dents du bas ; pondérer la langue à la main.
- [ ] Vérifier l'axe et le signe de l'os dans le reciblage ; `p.jaw` doit ouvrir la bouche pour l'attaque et le cri.
- [ ] Regénérer les 18 GLB.
- **Vérifié quand :** la bouche s'ouvre en jeu et chaque GLB a 54 os.

### Étape 5. Variété des démarches (100STYLE)
- [ ] Récupérer seulement les styles Zombie, Drunk, DragLeftLeg et DragRightLeg, LimpLeft et LimpRight.
- [ ] Écrire la table BVH → nos os ; découper des boucles avec Frame_Cuts.csv.
- [ ] Tirer une démarche au hasard pour chaque infecté (elle remplace la boiterie procédurale) ; ajouter le crédit 100STYLE.
- **Vérifié quand :** dans un groupe de 10 marcheurs, deux voisins n'ont jamais la même démarche.

### Étape 6. Animations fournies par le propriétaire (dès qu'elles sont disponibles)
- [ ] UAL2 Source : vérifier la version du .blend (un bpy plus récent que 4.2 sera peut-être nécessaire).
- [ ] Intégrer Zombie_Run (sprinteurs), Zombie_Bite, la marche en 8 directions, Zombie_Spawn (**à visionner d'abord**), SafetyVault et ClimbUp (fenêtre).
- [ ] Pack Rohr : mesurer les FBX, écrire la table Manny UE5, ajouter les marches et attaques.
- **Vérifié quand :** la sortie de terre et l'enjambement de la fenêtre sont animés en jeu.

### Étape 7. Gore façon BO2
- [ ] `make_zombies.py` : découper le corps par os dominant (en filtrant les groupes qui ne sont pas des os), avec tête, bras et jambes en primitives séparées sur le même squelette et des capuchons cachés.
- [ ] Capuchons en chair (TextureCan Others 0001 assombrie), UV à créer.
- [ ] Chapeaux séparés, qui sautent sur un tir à la tête non mortel.
- [ ] Règles : un bras peut partir sur un coup non mortel, les jambes sur un coup mortel ou une explosion, la tête éclate quand il reste 10 % de vie ou moins, l'infecté sans tête continue de marcher.
- **Vérifié quand :** les 5 cas se produisent en jeu.

### Étape 8. Matière et vêtements d'époque
- [ ] Carte de rugosité tirée des masques de peinture (sang, bouche et yeux brillants).
- [ ] Sang plus frais ; éclaboussures OGA teintées ; couche de peau sohh (veines, ecchymoses, relief) en 2048.
- [ ] Vêtements MakeHuman par carte, **en lisant la licence du .mhclo de chacun**. Réduire le bleu de travail à environ 3 800 triangles et repeindre ses écussons ; faire varier la teinte d'une copie à l'autre.
- **Vérifié quand :** le tableau des licences et des crédits est complet, et chaque infecté reste dans son budget de triangles.

### Étape 9. Poids et performance
- [ ] gltfpack `-cc` (meshopt) ; couleur en KTX2 ETC1S (**le fonctionnement dans l'Artifact n'est pas vérifié**) ; niveau de détail `-si 0.4` ; maillage d'ombre allégé.
- **Vérifié quand :** une carte pèse 2 à 2,5 Mo au lieu de 4 à 5, et le propriétaire valide à l'œil.

### Étape 10. Variantes spéciales (le propriétaire télécharge depuis Sketchfab)
- [ ] Hazmat pour la Cité : supprimer les animations Mixamo, recibler, créditer LxNazarov.
- [ ] Soldat de P7 : Panzergrenadier avec le casque du kit ; retirer le filet, zombifier, réduire à environ 14 000 triangles, regrouper les 23 textures.
- **Vérifié quand :** chaque GLB pèse environ 1 Mo au plus et sa licence est consignée.

### Étape 11 (option). Rictus avec Faceunits 01, fixé dans le maillage
- [ ] Un rictus différent par infecté, cuit dans le maillage (aucun coût en jeu).

### Hors plan : sons
Une recherche de sons CC0 reste à lancer (impact 4, rien n'a été cherché dans cette campagne).

---

## 5. Questions au propriétaire

1. **Mixamo :** accepte-t-il le risque de licence pour avoir la rampe, les relevés et les morsures ? (Par défaut : non.)
2. **Achats :** UAL2 Source à 14,99 $ ? UAL1 Pro à 9,99 $ pour la rampe, alors que les noms de ses clips n'ont pas été vus ?
3. **Téléchargements à la main :** peut-il utiliser un compte Sketchfab (Hazmat, Panzergrenadier et casques, éventuellement better_peter) et donner une adresse courriel sur Gumroad (pack Rohr) ?
4. **Crédits CC-BY :** où les afficher (écran de crédits, README) ? La liste comptera une dizaine de noms.
5. **Ordre :** commencer par les yeux et les animations (recommandé) ou par l'apparence (vêtements, gore) ?
6. **Gore :** aller jusqu'au marcheur sans tête et à la tête qui éclate ?
7. **Téléphones :** garder la version simplifiée, sans animations capturées ?
8. **Sons :** faut-il lancer maintenant la recherche de sons CC0 ?
9. (Seulement si la voie C l'intéresse.) Habite-t-il dans l'UE ? Cela exclut Hunyuan3D.

---

*Fichiers de travail utiles au développeur. Ils sont temporaires et peuvent disparaître :*
- `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/outils/scripts/test_machoire.py`
- `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/outils/scripts/test_report_formes.py`
- `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/verif_outils_scripts/rzip.py` (lecture partielle de zips distants)
- `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/technique/bench/bench.mjs` (banc de reciblage et de coût)
- `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/banques_assets/scripts/itchdl.sh` (téléchargement itch sans compte)