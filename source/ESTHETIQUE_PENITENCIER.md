# Esthétique du Pénitencier : suivi de l'étape

Fichier de reprise, mis à jour et poussé après chaque morceau. Pas de workflow à plusieurs agents (voir AUDIT_MURS.md).

Demande du propriétaire : « passe à l'esthétique du Pénitencier maintenant » (après les sols du Poste 7 et le chargement).

Outil : `dev/photo.mjs penitencier 2 <préfixe> '[[26,16],[10,16],[45,17],[35,7],[19,23],[35,24],[35,31],[50,28]]'`
(carreaux : bloc cellulaire, douches, réfectoire, cour, infirmerie, direction, quais, chemin de ronde ; 4 vues par point).
Vues rapprochées : `'[[x,z,cap,inclinaison],…]'` en mètres. Préfixes : `avant_` (état de départ), `apres_` (après chaque zone).

Piège trouvé : photo.mjs posait la caméra et dessinait aussitôt ; l'éclairage intérieur (hémisphère, lumière de rebond qui
éclaire les plafonds) se règle en ~2 s en jeu, les photos sortaient donc avec des plafonds noirs. Il laisse maintenant 3 s.

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
4. [ ] Extérieurs : terrain de balle au mur usé à la place des deux traits blancs ; teinte des murs de pierre qui varie sur
   une dizaine de mètres (M.macro) ; rochers du rivage arrondis (boulderGeo).
5. [ ] Vérifications (gels.mjs, verif_carte.sh) et version en ligne.
