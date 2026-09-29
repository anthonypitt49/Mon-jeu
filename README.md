# Snowfall Protocol

FPS de survie en tranchées gelées. Tenez les barricades, rallumez le générateur du secteur et survivez manche après manche, seul ou jusqu'à quatre en coopération.

Tout le jeu tient dans un seul fichier : **`index.html`**.

## Jouer

**En ligne (recommandé)** : dans ce dépôt, allez dans **Settings → Pages**, choisissez *Deploy from a branch*, branche `main`, dossier `/ (root)`, puis **Save**. Au bout d'une minute, le jeu est jouable ici : `https://anthonypitt49.github.io/Mon-jeu/`. C'est aussi ce lien qu'il faut partager avec vos amis pour le co-op.

**En local** : ouvrez `index.html` dans Chrome, Edge ou Firefox. Une connexion Internet est nécessaire, car le moteur 3D (Three.js) et les polices sont chargés depuis un CDN.

## Commandes

| Clavier / souris | Action |
|---|---|
| W A S D (Z Q S D sur AZERTY) | Se déplacer |
| Souris, ← → ↑ ↓ | Viser, tourner |
| Clic gauche / clic droit | Tirer / viser |
| Maj | Sprinter |
| C ou Ctrl | S'accroupir |
| Espace | Sauter |
| R | Recharger |
| E (maintenir) | Acheter, ouvrir, réparer une barricade, relever un camarade |
| 1 · 2 ou molette | Changer d'arme |
| G | Grenade |
| V ou clic molette | Couteau |
| F | Lampe torche |
| Échap / P | Pause |

Sur téléphone ou tablette, des commandes tactiles s'affichent : joystick à gauche, visée par glissement à droite, et des boutons pour tirer, viser, sauter, recharger, interagir, lancer une grenade, utiliser le couteau et allumer la lampe.

## Coopération (2 à 4 joueurs)

1. Un joueur clique sur **Rejoindre une partie**, saisit son indicatif, laisse le code vide et valide. Il héberge alors la partie et reçoit un code à 6 caractères.
2. Les autres joueurs saisissent ce code.
3. L'hôte clique sur **Lancer la partie**.

La connexion est directe entre navigateurs (WebRTC via PeerJS). Certains réseaux d'entreprise ou d'école bloquent ce type de connexion.

## Contenu

- **4 zones** : la tranchée de première ligne, le poste de commandement (bunker), le dépôt du générateur et la tranchée de soutien. Elles s'ouvrent avec des portes payantes.
- **12 barricades** à réparer. Les infectés arrachent les planches puis descendent dans la tranchée.
- **Générateur** : rétablir le courant allume les lampes et met en service les atouts et l'établi.
- **5 atouts** : Sang-Froid, Main Leste, Double Détente, Pas de Loup et Second Souffle.
- **11 armes** : pistolet, fusil à verrou, fusil à pompe, mitraillette, carabine, fusil d'assaut, fusil-mitrailleur, revolver, fusil de précision, lance-grenades et le prototype cryogénique Givre-7.
- **Caisse de ravitaillement** (arme aléatoire, elle change d'emplacement) et **établi d'armurier** (amélioration des armes).
- **Bonus lâchés par les infectés** : munitions max, mort subite, points doubles, frappe d'artillerie et barricades.
- **Manches** de difficulté croissante, avec des « brutes » blindées et une tempête blanche toutes les 6 manches.
- Neige, vent et brouillard ; fusées éclairantes, projecteurs et lueurs d'artillerie ; sang sur la neige, douilles, impacts ; sons 100 % synthétisés et spatialisés.
- 4 niveaux de graphismes avec résolution dynamique, record personnel sauvegardé.
