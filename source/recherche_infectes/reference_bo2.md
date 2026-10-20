# Référence Black Ops 2 Zombies comparée au jeu (chercheur « bo2 »)

# Les infectés de Black Ops 2 Zombies comparés aux nôtres (thème « rendu et sensation »)

**Les trois écarts qui pèsent le plus :**
- **Les animations** : un infecté ordinaire de Mob of the Dead en utilise 336 ; nous avons une seule animation procédurale pour tous.
- **Les yeux** : chez eux, un halo bien visible ; chez nous, deux sphères de 1,7 cm qui ne déclenchent pas le halo lumineux (bloom) et ne font plus qu'environ 1 pixel à 10 m.
- **Le gore** : plus fréquent et plus marquant (chapeau qui saute, infecté qui marche sans tête), avec des plaies modélisées.

À l'inverse, le nombre de corps différents n'est pas un gros écart : Mob of the Dead n'a que 3 corps ordinaires, comme notre Pénitencier.

**Ce que j'ai vraiment lu ou vu :**
- Les pages du wiki Call of Duty (lues par son API, le site renvoie 402 à la lecture directe).
- Les notes de la conférence SIGGRAPH 2013 de Treyarch.
- Trois images du wiki, regardées.
- Les scripts du jeu (GSC), lus dans le dépôt `plutoniummod/t6-scripts`. C'est du code d'Activision décompilé : je l'ai lu pour comprendre les règles du jeu, il ne faut rien en copier dans le nôtre. Les images sont des captures promotionnelles, également à ne pas réutiliser.
- Notre code : `09_zombies.js`, `09b_zreal.js`, `09c_gore.js`, `11_game.js`, `04_render.js`, `02_audio.js`, `00_core.js`, `tools/make_zombies.py`, et la section 6.0 de `PROCHAINES_ETAPES.md`.

Rien n'a été modifié dans `/home/user/Mon-jeu`.

---

## Les traits, du plus fort au plus faible impact

### 1. Animations : variété et qualité (impact 5)
- **BO2 :** le type d'infecté ordinaire de Mob of the Dead (`aitype/zm_alcatraz_basic.gsc`) cite 336 animations. 222 sont debout et 114 sont des variantes rampantes.
  - Déplacement : 10 marches, 3 courses, 11 sprints.
  - Attaques : 4 attaques en marchant et 3 en courant (`walk_attack`, `run_attack`), plus environ 6 attaques sur place.
  - Le reste : 9 morts, 9 sorties de terre, 14 entrées par la fenêtre, 54 arrachages de planches, 8 provocations, 45 franchissements (sauts, escalades), 15 poses « dormant », 10 « étourdi ».
  - L'attaque est choisie selon l'allure (`zm_walk_melee`, `zm_run_melee`, `zm_stumpy_melee` sans jambes). Le mode `zonly_physics` laisse probablement l'animation faire avancer l'infecté pendant le coup ; c'est ma lecture, non vérifiée.
  - À la mort, une animation joue d'abord, puis la poupée de chiffon prend le relais à 35 % de sa durée (`zm_death.gsc`, `waitforragdoll`).
  - Le wiki décrit des allures très typées : marche bras en l'air, trot bras tendus, sprint « un bras devant, l'autre derrière en l'air ».
- **Nous :** une seule fonction procédurale pour tous (`poseBody`, 09_zombies.js:305).
  - La variété se limite à la boiterie (30 % des infectés), l'inclinaison, la tête penchée et la phase du pas.
  - Pendant une attaque, l'infecté s'arrête net : `think` sort de la boucle sans avancer, 09_zombies.js:549-554.
  - La poupée de chiffon démarre tout de suite (`die`, ligne 692), sans animation de mort.
- **Ce qui manque :** plusieurs démarches par allure, des attaques en mouvement, une courte animation de mort avant la poupée de chiffon.
- **Ce que ça changerait :** c'est ce qui fait le plus « jeu commercial » dès qu'un groupe approche.

### 2. Yeux lumineux (impact 5, coût faible)
- **BO2 :**
  - La lueur est un effet de particules accroché à l'os de l'œil gauche (`_zm.csc` : `createzombieeyesinternal`, `J_Eyeball_LE`, effet `misc/fx_zombie_eye_single`).
  - En plus, le globe lui-même est lumineux : Origins pousse sa luminance à 3 pour les croisés (`zm_tomb.csc` : `eyeball_luminance_override = 3`, `scriptVector2`).
  - Sur les trois images regardées, le halo est large, au centre presque blanc, et se voit aussi sur les infectés du fond.
  - La couleur dépend de la carte :

| Carte BO2 | Couleur des yeux | Source | Notre carte proche |
|---|---|---|---|
| Mob of the Dead | rouge | `fx_zombie_eye_single_red` | Pénitencier |
| Buried, TranZit, Die Rise | bleu | wiki | Filon (Buried) |
| Origins | orangés ; croisés en bleu (le wiki dit aussi blanc ou violet) | `eye_glow_blue` | Poste 7 |
| Nuketown Zombies | jaune, puis bleu à partir de la manche 25 | variantes `_beyes` | Cité |

- **Nous :**
  - Deux sphères de 0,85 cm de rayon, en matériau de base : orange avant la manche 12, bleu ensuite, sur toutes les cartes (09_zombies.js:492).
  - Calcul, pas vu à l'écran : l'orange a une luminance d'environ 0,53, sous le seuil du halo qui est à 0,9 (04_render.js:82). Les yeux n'ont donc aucun halo.
  - Ils subissent aussi le brouillard. Avec un champ de vision de 78° en 1080p, ils font environ 1,1 pixel à 10 m et 0,6 pixel à 20 m.
- **Ce qui manque :** une couleur plus forte que le blanc d'écran, sans mappage des tons ni brouillard ; un petit halo additif de 6 à 10 cm ; une couleur par carte.
- **À noter :** les masques à gaz d'Origins ont des verres lumineux (vu sur l'image).
- **Non vérifié :** la traînée lumineuse derrière les yeux dont on se souvient de BO1/BO2 ; je n'en ai trouvé aucune trace écrite.

### 3. Gore : règles et rendu (impact 4)
- **BO2** (`_zm_spawner.gsc`, `zm_death.gsc`, `_zm.csc`) :
  - Un coup peut arracher un membre dès qu'il retire au moins 10 % de la vie restante. Ni le pistolet de départ ni le couteau ne comptent.
  - Les bras partent même sur un coup non mortel : l'infecté continue avec un seul bras.
  - Les jambes ne partent que sur un coup mortel, ou par explosion ; une explosion peut donc créer un rampant vivant.
  - Un tir à la tête non mortel fait sauter le chapeau, projeté vers le haut.
  - Un tir à la tête qui laisse 10 % de vie ou moins fait éclater la tête (`zombie_head_gib`). La tête n'est pas un morceau qui vole : c'est un éclatement de chair (deux effets plus un son). Un jet de sang sort ensuite du cou au bout de 0,3 s.
  - Si l'infecté sans tête n'est pas mort, il continue de marcher en perdant 20 % de sa vie par seconde.
  - Chaque personnage a des corps déjà abîmés et modélisés : `g_rarmoff`, `g_larmoff`, `g_legsoff`, `g_behead`. Les membres arrachés sont des modèles séparés, lancés avec une traînée de sang (`trail/fx_trail_blood_streak`). Au plus 3 arrachages par demi-seconde.
  - Le torse éventré (« guts ») existe dans le code, mais aucun des personnages que j'ai lus ne le définit.
- **Nous :**
  - Les membres partent par dégâts cumulés (38 % de la vie pour un bras, 50 % pour une jambe, 60 points au moins). Des balles peuvent donc rendre un infecté rampant de son vivant.
  - La tête ne saute qu'à la mort, et pas de chapeau qui saute : casque et casquette sont fondus dans le modèle.
  - Le moignon est une sphère bosselée générique.
  - Les membres qui volent et saignent, les explosions et le jet de sang au cou existent déjà et ressemblent à BO2.
- **Ce qui manque :** l'infecté qui marche sans tête, le chapeau qui saute, des éclats de chair quand la tête éclate, des plaies modélisées (os, chair déchirée) au lieu de la sphère, les règles de fréquence de BO2.

### 4. Matière : peau, sang, vêtements, bouche (impact 4)
- **BO2, vu sur les images :**
  - Sang frais rouge vif et brillant, peau luisante, impacts de balles.
  - Vêtements en lambeaux aux bords déchiquetés.
  - Bouches sans lèvres, ouvertes, dents visibles ; une des têtes s'appelle `slackjaw` (mâchoire pendante).
  - Accessoires : fil barbelé sur les détenus de Mob of the Dead, masques à gaz à Origins.
- **BO2, technique (Lazarov, SIGGRAPH 2013) :** cartes de brillance peintes, reflets d'environnement corrigés par l'éclairage local, sondes de lumière pour les objets mobiles.
- **Nous :**
  - Une rugosité unique à 0,8 sur tout le corps (make_zombies.py:344).
  - Sang séché sombre.
  - Accrocs seulement peints en sombre (lignes 313-314).
  - Bouche fermée : le squelette n'a pas de mâchoire, et la valeur `jaw` du squelette procédural n'est reportée sur aucun os du modèle.
- **Ce qui manque :**
  - Une carte de rugosité tirée des masques de peinture, pour que sang, bouche et yeux brillent.
  - Du sang plus frais.
  - Des bords déchirés découpés dans les vêtements (la découpe sert déjà pour les cheveux).
  - Une bouche ouverte, sculptée ou en forme de morphose.
- **À vérifier :** je n'ai pas vérifié que MPFB2 sait exporter une expression de bouche ouverte.

### 5. Sons (impact 4)
- **BO2** (`_zm_audio.gsc`, `_zm_spawner.gsc`) :
  - Neuf catégories de voix : ambiance, sprint, attaque, arrachage de planches, provocation, « derrière vous », mort, rampant, électrocution.
  - Chaque infecté parle toutes les 1 à 4 s, avec la catégorie qui suit son allure.
  - Un son « derrière vous » joue quand un infecté est à moins de 5 à 7 m dans le dos du joueur (au-delà de ±95°), au plus une fois toutes les 5 s.
  - Des sons propres aux arrachages (`zmb_death_gibs`, `zombie_head_gib`).
- **Nous :**
  - Trois enregistrements : grognement (2 prises), cri (1 prise), attaque (2 prises).
  - Un grognement toutes les 3 à 9 s, seulement à moins de 30 m.
  - À la mort, le son d'attaque.
  - Ni son « derrière vous », ni cri de mort, ni voix d'arrachage de planches ou de rampant, ni pas des infectés (je n'ai trouvé aucun appel de pas pour eux).
- **Ce que ça changerait :** beaucoup de ressenti pour peu de code, si l'on trouve des sons CC0.

### 6. Sortie de terre (impact 3)
- **BO2 :**
  - Quatre animations selon l'allure.
  - Trois effets : terre qui éclate à la main, nuage autour du corps, puis terre qui tombe du dos toutes les 0,3 s pendant 5,5 s à partir de 2 s.
  - Variantes eau, neige et feuillage (haie à Buried), et morts spéciales si l'infecté est tué en sortant.
- **Nous :** le corps monte de 1,7 m en 0,9 à 1,4 s en agitant les bras, avec une seule gerbe de 22 particules de la couleur de la carte (`fxSnowBurst`).

### 7. Barricades (impact 3)
- **BO2 :**
  - Jusqu'à trois places par fenêtre (gauche, milieu, droite).
  - Une animation par planche arrachée, des provocations entre les planches.
  - Un bras passé à travers les planches pour frapper : portée d'environ 2,8 m, une fois sur deux.
  - Une animation pour enjamber la fenêtre, selon l'allure et le côté.
- **Nous :** les bras s'agitent en boucle, une planche part toutes les 0,85 à 1,35 s, l'infecté attaque si le joueur est à moins de 1,9 m, et il passe ensuite sans animation pour enjamber.

### 8. Franchissements et comportement de groupe (impact 3, surtout au Pénitencier)
- **BO2 :**
  - 24 infectés au plus en même temps.
  - Ils poursuivent le joueur le plus proche et ignorent ceux qui sont à terre.
  - Mob of the Dead a 20 scripts de franchissement : escalade de grillage, montée et descente des étages du bloc cellulaire, sortie de l'eau sur le quai.
  - TranZit a des infectés dormants qui se réveillent quand on approche.
- **Nous :**
  - Déplacement par champ de flux (chaque case indique le chemin vers le joueur), écartement entre infectés, contournement des obstacles, réapparition s'ils restent bloqués.
  - 26 infectés en solo d'après `roundParams`.
  - Aucun franchissement en hauteur.

### 9. Variété des corps (impact 3)
- **BO2 :** un corps, une tête tirée au hasard et un chapeau, combinés au moment de l'apparition.

| Carte BO2 | Corps | Têtes | Chapeaux et coiffes |
|---|---|---|---|
| Mob of the Dead | 3 (gardien, deux détenus) | 4 | casquette ou non pour le gardien |
| Origins | 3 corps allemands, plus 5 croisés à part | 3 pour les Allemands, 2 pour les croisés | avec ou sans |
| Buried | 11 | 3 hommes, 2 femmes | variantes de chapeaux et de cheveux |
| TranZit | 18 variantes | 4 | — |

- **Nous :** 3 ou 4 corps ordinaires plus un costaud par époque. Chaque tête est fixe, un même modèle a le même matériau sur toutes ses copies, la taille varie de ±7 %.
- **Ce qui manque :** séparer têtes et chapeaux dans `make_zombies.py`, et faire varier un peu la teinte des vêtements d'une copie à l'autre.

### 10. Éclairage, brouillard, effets d'ambiance (impact 3)
- **BO2 :**
  - Un étalonnage des couleurs par carte, qui change selon la zone où se trouve le joueur.
  - Un brouillard en hauteur : TranZit utilise `setvolfog`, avec une hauteur de base et une hauteur de demi-densité.
  - Une grille de lumière qui éclaire les infectés selon l'endroit (TranZit : intensité 1,4, contraste 0,2).
  - Des effets d'ambiance :
    - Mob of the Dead : rayons de lumière à travers les grilles, brouillard au sol, braises.
    - Origins : pluie et neige avec leur propre étalonnage, poussières en suspension.
    - Buried : poussières, rayons de lumière.
  - À Mob of the Dead, des éclairs font varier l'exposition (3 à 5 éclats, retour en 0,1 à 0,35 s).
- **Nous :**
  - Mappage des tons ACES, brouillard uniforme, ombrage d'ambiance N8AO, halo lumineux, vignette, teinte des ombres, grain, anticrénelage SMAA.
  - Les éclairs existent déjà au Pénitencier.
  - Pas de brouillard en hauteur, pas de rayons de lumière, un seul éclairage d'environnement pour toute la carte.

### 11. Rampants (impact 2)
- **BO2 :** une variante rampante pour presque tout (114 animations sur 336), une voix de rampant, et un mode « sans jambes » à part. D'après le wiki, un infecté qui a perdu un bras ne peut pas devenir rampant.
- **Nous :** une seule pose rampante. Un rampant qui attaque perd son geste, car la pose rampante est appliquée après l'attaque et réécrit les bras (09_zombies.js:341 puis 347).

### 12. Vitesses et rythme des manches (impact 2)
- **BO2** (`_zm.gsc`, `_zm_utility.gsc`) :
  - Un score de vitesse vaut 8 × le numéro de manche, plus un tirage entre 0 et 35 : jusqu'à 35 l'infecté marche, jusqu'à 70 il court, au-delà il sprinte.
  - Concrètement : environ 78 % de marcheurs à la manche 1, presque tous des sprinteurs dès la manche 9.
  - Le dernier infecté de la manche se met à sprinter, sauf s'il rampe.
- **Nous :** quatre vitesses, une montée plus lente, et rien pour le dernier infecté.

### 13. Recul quand on tire dessus (impact 1)
- Le wiki note que les infectés de Treyarch ne bronchent presque pas sous les balles. Notre petit recul en ressort ne pose pas de problème.

---

## Ce que je n'ai pas pu vérifier
- La traînée lumineuse des yeux.
- Le nombre de triangles et la taille des textures des modèles de BO2.
- Si les infectés de BO2 ont une animation du visage.
- Les pas des infectés et le nombre d'enregistrements de voix dans BO2.
- Que l'attaque fasse vraiment avancer l'infecté pendant le coup (c'est ma lecture de `zonly_physics`).
- Les images sont des visuels promotionnels : le rendu en jeu est peut-être moins fin.

## Sources
- Wiki Call of Duty, lu par son API (`api.php?action=parse&prop=wikitext`) : pages Zombie, Gib, Crawler_Zombie, Origins, Mob_of_the_Dead, Buried, TranZit, Die_Rise (https://callofduty.fandom.com/wiki/Zombie, etc.).
- Scripts BO2 (lus seulement, ne pas copier), https://raw.githubusercontent.com/plutoniummod/t6-scripts/main/ suivi de :
  - `ZM/Core/maps/mp/zombies/` : `_zm_spawner.gsc`, `_zm.gsc`, `_zm_utility.gsc`, `_zm_audio.gsc` ;
  - `ZM/Core/maps/mp/animscripts/` : `zm_melee.gsc`, `zm_death.gsc` ;
  - `ZM/Core/clientscripts/mp/zombies/_zm.csc` ;
  - Mob of the Dead : `clientscripts/mp/zm_prison.csc`, `clientscripts/mp/zm_prison_fx.csc`, `aitype/zm_alcatraz_basic.gsc`, `character/c_zom_inmate1.gsc`, `character/c_zom_guard.gsc`, les `xmodelalias/*_head_als.gsc` ;
  - Origins : `clientscripts/mp/zm_tomb.csc`, `clientscripts/mp/zm_tomb_fx.csc`, `aitype/zm_tomb_basic_german.gsc` ;
  - Buried : `clientscripts/mp/zm_buried_fx.csc` ;
  - TranZit : `maps/mp/createart/zm_transit_art.gsc` ;
  - la liste des fichiers vient de https://data.jsdelivr.com/v1/packages/gh/plutoniummod/t6-scripts@main.
- Treyarch, Dimitar Lazarov, « Getting More Physical in Call of Duty: Black Ops II », SIGGRAPH 2013 : https://blog.selfshadow.com/publications/s2013-shading-course/ (notes : `lazarov/s2013_pbs_black_ops_2_notes.pdf`).
- Images regardées (fichiers du wiki) : `MotD_-_Horrors_amassing_BOII.jpg`, `German_Zombies_Origins.jpg`, `Buried_Zombies_BOII.jpg`.

Tous les téléchargements (16 Mo : scripts, notes PDF, images) sont dans `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/rendu_bo2/dl/`. La liste des 336 animations est dans `/tmp/claude-0/-home-user-Mon-jeu/a5e8b0c5-d5d4-5781-9d88-2973c482adb0/scratchpad/recherche_infectes/rendu_bo2/dl/chars/motd_anims.txt`.