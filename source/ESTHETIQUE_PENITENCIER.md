# Esthétique du Pénitencier : suivi de l'étape

Fichier de reprise, mis à jour et poussé après chaque morceau. Pas de workflow à plusieurs agents (voir AUDIT_MURS.md).

Demande du propriétaire : « passe à l'esthétique du Pénitencier maintenant » (après les sols du Poste 7 et le chargement).

Outil : `dev/photo.mjs penitencier 2 <préfixe> '[[26,16],[10,16],[45,17],[35,7],[19,23],[35,24],[35,31],[50,28]]'`
(carreaux : bloc cellulaire, douches, réfectoire, cour, infirmerie, direction, quais, chemin de ronde ; 4 vues par point).
Vues rapprochées : `'[[x,z,cap,inclinaison],…]'` en mètres. Préfixes : `avant_` (état de départ), `apres_` (après chaque zone).

Pièges trouvés :
- photo.mjs posait la caméra et dessinait aussitôt ; l'éclairage intérieur (hémisphère, lumière de rebond qui éclaire les
  plafonds) se règle en ~2 s en jeu, les photos sortaient donc avec des plafonds noirs. L'outil pose maintenant directement
  l'état atteint en jeu (intensité de l'hémisphère et de l'éclairage d'ambiance, rebond intérieur) avant chaque vue.
- photo.mjs tombait au 3e ou 4e point (« Target page, context or browser has been closed ») : le noyau tuait le rendu du
  navigateur, à court de mémoire (5 Go, journal du noyau : oom-kill). Ce n'est pas une fuite du jeu (sonde : tas JavaScript
  stable à 77 Mo en se téléportant et en dessinant 5 min) mais le rendu logiciel en 1280 × 720 plus les copies d'image.
  La page est maintenant en 640 × 360, la taille de chaque vue dans la planche : même résultat, 4 points en 1 min.
- La buée du souffle (fxBreath) n'est pas effacée par l'outil (pas de mise à jour des effets) : photo.mjs coupe le souffle.
- Les plafonds noirs n'étaient pas qu'un défaut de photo : en jeu aussi, un plafond de béton sombre n'est éclairé que par le
  rebond (couleur basse de l'hémisphère) ; il faut un plafond clair et un rebond suffisant.
- Les taches empilées (dégradés radiaux superposés) deviennent opaques au centre : on peint maintenant au pixel.

## Constat de départ (tournée `esth_`, 6.2.1)

- Partout à l'intérieur : taches rondes noires au sol (flaques « fuite ») et aux murs (taches d'eau) qui font des trous ; plafonds très sombres.
- Douches : la pièce la plus faible. Faïence blanche propre du sol au plafond, pommeaux sur de simples tiges qui montent du sol,
  aucun collecteur, aucun robinet, une bonde ; taches noires partout ; aucune lumière propre.
- Réfectoire : tables correctes, murs bicolores plats, plafond noir, petites lampes vertes perdues.
- Cour : murs de pierre au motif très répétitif ; lignes blanches qui font parking ; touffes d'herbe sur l'asphalte.
- Infirmerie : cloisons de plâtre blanc nues (sans plinthe ni soubassement), peu de mobilier médical.
- Direction : boiseries correctes mais pièce sombre.
- Quais et chemin de ronde : réussis (phare, pont, ville, pluie) ; rochers en polyèdres à grosses facettes.

## Plan

1. [x] Salissures et plafonds : fuite, tache d'eau, moisissure et terre peintes au pixel avec un contour irrégulier (les taches
   rondes empilées devenaient noires au centre) ; plafonds enduits clairs au lieu du béton sombre ; rebond intérieur relevé
   (0x7a7c74) ; auréoles et moisissure au plafond (M.decals.ceil). Vérifié : tournées `sal_`, `v2_`.
2. [x] Douches : faïence jusqu'à 1,9 m, enduit au-dessus, baguette (K.up des murs fins, wallIn/wallUp des murs épais, fenêtres
   barricadées comprises) ; collecteur au mur, colonnes avec robinet à croisillon et col de cygne, 10 pommes placées hors des
   fenêtres, de l'arme et de l'atout ; coulures de rouille, sol mouillé, bondes en fonte ajourée, bancs à lattes, patère,
   lampe-cage et une lumière propre (lumière « shower »). Vérifié : tournées `dou_`, `v2_`.
3. [x] Réfectoire : poutres, 6 suspensions émaillées, gobelets, marmites, tableau du menu. Infirmerie : cloisons en faïence vert
   d'eau à hauteur d'appui, armoire à pharmacie vitrée, lavabo, chariot, croix rouge. Direction : lampe de bureau, lumière
   déplacée vers le passage des archives. Vérifié : tournée `v2_`.
4. [x] Extérieurs : terrain de balle au mur à la peinture écaillée à la place des deux traits blancs ; murs de pierre :
   photo lue deux fois avec un décalage horizontal, les deux lectures alternant tous les quelques mètres (photoDetile,
   `detile: true` dans PHOTO_SETS) et teinte qui varie sur une dizaine de mètres (M.macro) ; rochers du rivage fracturés et
   irréguliers (boulderGeo, faces cassées, photo projetée face par face). Vérifié : tournées `ext_`, `ext2_`.
5. [x] Vérifications : `gels.mjs penitencier 2` → 0 shader tardif, 0 erreur ; `verif_carte.sh penitencier` → 0 mur invisible,
   placement sans constat moyen ni grave (colliers des conduites dans le mur : voulu), partie, courant, mission sans erreur,
   25 entrées sur 25. Version 6.3 en ligne.
