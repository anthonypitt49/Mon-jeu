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
