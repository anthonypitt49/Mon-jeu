# Gels au chargement et qualité d'image : suivi de l'étape

Fichier de reprise, mis à jour et poussé après chaque morceau. Pas de workflow à plusieurs agents (voir AUDIT_MURS.md).

Demande du propriétaire (joue surtout sur ordinateur, qualité « élevé ») : « le jeu gèle beaucoup, surtout en début de partie ou à la page d'accueil » ; son idée : un écran de chargement au début qui charge le nécessaire (accueil et choix de la carte sans à-coup), et un petit écran de chargement avec une image de la carte au lancement de la partie. Puis : résolution et qualité d'image.

Outil : `dev/gels.mjs <carte> [qualité] [secondes]` compte, phase par phase (chargement, menu, menu au repos, début de partie, puis une partie scriptée : infectés, tir, mise à mort, grenade, couteau, caisse, armes, atout, armurier), les shaders compilés, les textures envoyées à la carte graphique, les tâches longues ; il nomme les shaders tardifs. Le rendu logiciel du conteneur ne donne pas la durée réelle d'un gel : ce qui compte, ce sont les compilations et les gros envois après l'affichage du menu (sur Windows, chaque compilation coûte de 20 à 300 ms).

## Mesure de départ (6.1.4, Poste 7, qualité élevée)

- Menu : 40 shaders compilés après son affichage (les photos des matières remplacent les textures dessinées, l'éclairage d'ambiance HDRI, les infectés réalistes) et 306 envois de texture dont 113 grandes (photos) : c'est le gel de la page d'accueil.
- Début de partie : 5 shaders (arme et mains en main, scène de l'arme sans brouillard), clic « Solo » 180 ms.
- En jeu, au premier usage : grenade 3, couteau 1, caisse 2 (rayons et halo verts), changement d'arme 2, atout 2 (bouteille) ; nouvelles grandes textures à la sortie des premiers infectés d'un type pas encore vu.

## Plan

1. [ ] Écran de chargement plein écran (image de la carte, nom, barre de progression, étapes) qui ne laisse place au menu qu'une fois tout prêt : photos posées, infectés réalistes chargés, ombrage d'ambiance, textures envoyées, shaders préchauffés.
2. [ ] Préchauffage : armes en main (toutes, améliorées comprises), couteau, grenade, bouteille d'atout, chaque infecté réaliste, effets (explosion, caisse ouverte…) dessinés une fois sous l'écran de chargement. Objectif mesuré : 0 shader tardif au menu et en partie.
3. [ ] Lancement de la partie : carton de la carte (image + nom) pendant la mise en place.
4. [ ] Qualité d'image en « élevé » : anticrénelage, résolution dynamique moins agressive (et réglable), filtrage des textures, diagnostic (carte graphique, résolution, images/s).
5. [ ] Version 6.2 en ligne.
