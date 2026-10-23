# Infectés au niveau de Black Ops 2 Zombies : suivi de l'étape

Fichier de reprise, mis à jour et poussé après chaque morceau.

Demande du propriétaire (après la 6.3.2) : « passe à l'amélioration des infectés, je veux vraiment qu'on aille chercher un autre
niveau, le plus proche possible de Call of Duty Black Ops 2 Zombies. Cherche des modèles ou autre sur des sites web. »

## Recherche (workflow « recherche-infectes-bo2 »)

Résultats gardés dans `source/recherche_infectes/` (les fichiers téléchargés pour inspection restent dans le conteneur et se
perdent à son redémarrage) :
- `reference_bo2.md` : ce qui fait le rendu BO2, comparé à notre code, classé par impact.
- `technique_threejs.md` : architecture three.js pour des infectés animés (mélangeur, reciblage, mâchoire, démembrement, poids).
- `candidats.md` : modèles et banques trouvés (personnages, banques gratuites), licences lues par le chercheur.
- `resultats_bruts.json` : sortie complète.

État : la limite de sessions du propriétaire a coupé le premier passage. Faits : référence BO2, technique, personnages,
banques. Coupés : animations, outils, les deux vérifications indépendantes, la synthèse. Relance demandée (« Réessayer »).
La reprise du même workflow (resumeFromRunId) refaisait en direct les recherches finies (cache manqué) : arrêtée. Seconde passe
lancée à part (workflow « recherche-infectes-bo2-suite », 7 agents) : vérifie les candidats sauvegardés, cherche animations et
outils, puis synthèse ; elle lit les résultats de la première passe dans ce dossier au lieu de les refaire.

Constats déjà sûrs (chercheur « personnages ») : aucun zombie CC0 réaliste sur Sketchfab ; le gisement utile est en CC-BY
(compte gratuit requis pour télécharger, ou copies d'Objaverse sur Hugging Face pour les modèles d'avant 2023) ; beaucoup de
zombies « réalistes » sortent d'Adobe Fuse/Mixamo (redistribution des fichiers bruts interdite : risqué) ; modèles extraits de
Call of Duty et d'autres jeux présents sous étiquette CC-BY : exclus. Bibliothèque communautaire MakeHuman : 1 362 vêtements
(558 CC0, 804 CC-BY) utilisables par notre chaîne actuelle.

## Résultat de la recherche (seconde passe terminée, 7 agents)

Plan de décision complet : `recherche_infectes/plan_decision.md` (constat classé, ressources vérifiées avec licences et accès,
trois voies comparées, plan en 11 étapes, questions au propriétaire). Résultats bruts : `recherche_infectes/resultats_seconde_passe.json`.

Recommandation : voie A (garder nos 18 infectés MakeHuman et les enrichir : yeux lumineux par carte, animations capturées CC0
Quaternius UAL1/UAL2 et CC-BY 100STYLE, mâchoire, gibs façon BO2, matière et vêtements d'époque), plus deux variantes
téléchargées (Hazmat CC-BY pour la Cité, soldat 1917 tiré du Panzergrenadier CC0). Voie C (IA) écartée.

En attente des réponses du propriétaire (achats UAL2 Source 14,99 $, comptes Sketchfab/Gumroad, Mixamo, ordre, gore, crédits).

## Plan (voie A)

1. [x] (version 6.4) Yeux lumineux par carte : rouge au Pénitencier, bleu au Filon, orangé au Poste 7, jaune à la Cité
   (bleu dès la 12e manche) ; couleur rendue 6 fois au-dessus de la normale (le halo du post-traitement les fait rayonner),
   sans brouillard ; un halo additif par œil qui garde une taille apparente minimale (≈ 6 pixels en 1080p) pour qu'on les
   voie à 20 m. Préchauffés avec les mêmes matières. Vérifié : `dev/yeux.mjs` (5 à 20 m, zoom, de près, de dos : cachés),
   `gels.mjs penitencier 2` (0 shader tardif). Choix du propriétaire (« vas-y ») : gratuit seulement, sans Mixamo, yeux
   puis animations, gore jusqu'au marcheur sans tête.
   (version 6.4.1) Retour du propriétaire : « trop de lumière, seulement le globe de l'œil ». Halos retirés ; clarté du
   globe poussée juste sous le seuil du halo du post-traitement (luminance 0,8 < 0,9) : il brille sans rien éclairer
   autour. Contrepartie : à 15-20 m, les yeux redeviennent de petits points.
2. [ ] Outil d'animations hors du jeu (UAL1 et UAL2 Standard, CC0) : reciblage sur nos 53 os, fichier compressé.
3. [ ] Mixeur d'animations dans le jeu, avec rétro-reciblage vers le squelette procédural (tirs, gore, poupée inchangés).
4. [ ] Os de mâchoire dans make_zombies.py, 18 GLB regénérés.
5. [ ] Variété des démarches (100STYLE).
6. [ ] Animations fournies par le propriétaire (UAL2 Source, pack Rohr), si achetées ou téléchargées.
7. [ ] Gore façon BO2 (morceaux préparés, chapeaux, marcheur sans tête).
8. [ ] Matière et vêtements d'époque.
9. [ ] Poids et performance (meshopt, KTX2, LOD).
10. [ ] Variantes spéciales (Hazmat, soldat 1917), téléchargées par le propriétaire.
11. [ ] (option) Rictus figés.
