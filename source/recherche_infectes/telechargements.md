# Modèles de zombies à télécharger (demande du propriétaire, 23 octobre 2026)

Le propriétaire n'est pas satisfait des infectés MakeHuman peints. Il télécharge lui-même les modèles retenus ci-dessous,
puisque Sketchfab et Meshy demandent un compte gratuit. Planche : `source/dev/shots/selection_modeles.jpg`.

## Sites regardés

- **Free3D** : inaccessible depuis le conteneur (403, même avec un vrai navigateur). Licences par modèle, souvent
  « Personal Use » (exclu pour un jeu public) ; beaucoup de zombies y sont extraits de jeux commerciaux. Écarté.
- **Unity Asset Store** : un seul zombie réaliste gratuit, « Zombie » de Pxltiger (le même que sur Sketchfab et
  Objaverse, style 2012) ; le reste est payant ou stylisé. Il faut installer l'éditeur Unity pour télécharger, et la
  licence demande que les joueurs ne puissent pas extraire le fichier (un jeu web le sert tel quel). Écarté.
- **Meshy** (modèles faits par IA) : conditions d'utilisation §3.3, les modèles 3D de la galerie communautaire sont
  en **CC0** (aucun crédit obligatoire ; on crédite quand même). Les modèles générés par un compte gratuit seraient
  en CC-BY 4.0 (crédit à Meshy). Inconnues avant téléchargement : nombre de triangles, squelette (probablement aucun :
  maillage figé), qualité des visages de près, éclairage cuit dans la texture.
- **Sketchfab** (recherche précédente, `candidats.md`) : CC-BY, crédit obligatoire.

## À télécharger

Sketchfab (« Download 3D Model », format **glTF**) :
- S1 Zombie (Male 1), martinezequielgorno : https://sketchfab.com/3d-models/zombie-male-1-f40dda49b8b94f2faedf58679f676763
- S2 Zombie (Female 1) : https://sketchfab.com/3d-models/zombie-female-1-ce037bf3c08e40eea92df46e4ec32b16
- S3 Zombie (Type Female 2) : https://sketchfab.com/3d-models/zombie-type-female-2-d0f13665d110448495e90421a55492ca
- S4 Zombie Hazmat, LxNazarov : https://sketchfab.com/3d-models/zombie-hazmat-49b3b4307f6a4d2386fdb02354158d04

Meshy (format **GLB**) :
- M1 zombie en pose T : https://www.meshy.ai/fr/posts/01a0a352-26b0-7080-a0a2-4f9da46d3c0a
- M2 Zombie Stance (vieil ouvrier, 1880 ou 1933) : https://www.meshy.ai/fr/posts/019a78ac-adbd-7ae4-ab1c-adfc613e61aa
- M3 zombie chemise et jean (1957) : https://www.meshy.ai/fr/posts/01a05c99-9511-75a6-91af-a6547c5d0e1f
- M4 The walking dead Zombie (1957) : https://www.meshy.ai/fr/posts/019841a3-5979-7b31-988b-9f302a1770fb
- M5 zombie hungry woman (1957) : https://www.meshy.ai/fr/posts/01a07dc0-6f59-744f-b84d-1720141cbc7c
- M6 Zombie Nightmare (décharné) : https://www.meshy.ai/fr/posts/0196e525-3a7e-7bb4-8259-23886b06aef5
- M7 brute zombie (brute) : https://www.meshy.ai/fr/posts/01a05d8e-d96e-7250-97ce-b57d3e143d61
- M8 Hyper-realistic fat zombie (brute ou spécial) : https://www.meshy.ai/fr/posts/0195de22-79e6-7720-b907-52d5f61276a8
- M9 Zombie Wanderer (haillons ; pose accroupie, plus dur à animer) : https://www.meshy.ai/fr/posts/019b1854-31be-7dae-85f5-ca5caece172e
- M10 Soldier in Uniform (1917, humain à zombifier) : https://www.meshy.ai/fr/posts/0196fe41-f177-712f-b016-64a3bf2fa6c4
- M11 World War I Soldier (humain à zombifier) : https://www.meshy.ai/fr/posts/01940cb0-3506-7623-b762-20d166816cb4
- M12 Frankenstein's Creation (redingote 1880, facultatif) : https://www.meshy.ai/fr/posts/019a118f-b14e-76ea-b449-ce57c1931a29

Livraison : fichiers joints dans la conversation, ou dépôt GitHub, dossier `import/` (25 Mo au plus par fichier par
le site web de GitHub).

## Suite prévue

Mesurer chaque fichier (triangles, squelette, textures), écarter les ratés, puis un essai dans la Cité (1957) avant /
après, avant de toucher aux autres cartes. Les modèles Meshy n'ont sans doute pas de squelette : les squeletter dans
Blender (pose en T ou en A : poids automatiques) sur le squelette du jeu.
