# Snowfall Protocol

FPS de survie en tranchées gelées. Tenez les barricades, rallumez le générateur du secteur et survivez manche après manche, seul ou jusqu'à quatre en coopération.

Tout le jeu tient dans un seul fichier : **`index.html`**.

## Jouer

**En ligne (recommandé)** : dans ce dépôt, allez dans **Settings → Pages**, choisissez *Deploy from a branch*, branche `main`, dossier `/ (root)`, puis **Save**. Au bout d'une minute, le jeu est jouable ici : `https://anthonypitt49.github.io/Mon-jeu/`. C'est aussi ce lien qu'il faut partager avec vos amis pour le co-op.

**En local** : ouvrez `index.html` dans Chrome, Edge ou Firefox. Une connexion Internet est nécessaire, car le moteur 3D (Three.js) et les polices sont chargés depuis un CDN.

**Autonome** : le jeu ne dépend ni de Claude ni d'aucun serveur à vous. Solo, co-op, classement, objectif caché : tout fonctionne depuis GitHub Pages. La version publiée sur claude.ai n'est qu'une porte d'entrée de plus.

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
| Q | Signaler (co-op) : un infecté, un objet ou un endroit |
| Échap / P | Pause |

Sur téléphone ou tablette, des commandes tactiles s'affichent : joystick à gauche, visée par glissement à droite, et des boutons pour tirer, viser, sauter, recharger, interagir, lancer une grenade, utiliser le couteau, allumer la lampe et, en co-op, signaler (PING).

## Coopération (2 à 4 joueurs)

1. Un joueur clique sur **Rejoindre une partie**, saisit son indicatif, laisse le code vide et valide. Il héberge alors la partie et reçoit un code à 6 caractères.
2. Les autres joueurs saisissent ce code.
3. L'hôte clique sur **Lancer la partie**.

La connexion est directe entre navigateurs (WebRTC via PeerJS). Certains réseaux d'entreprise ou d'école bloquent ce type de connexion. Sur claude.ai, la page utilise à la place le salon intégré de Claude (joueurs invités avec le rôle Contributeur).

- **Relève de l'hôte** : si l'hôte quitte ou perd sa connexion, un camarade reprend automatiquement la partie (manche, infectés, points, portes et atouts conservés). Départ annoncé : quelques secondes ; coupure brutale : une dizaine de secondes. Le nouvel hôte reprend aussi le code, pour que d'autres puissent encore rejoindre.
- **Signaler** (Q ou PING) : un losange coloré à votre couleur apparaît chez tout le monde, avec la distance. Il suit l'infecté visé, ou indique l'objet utile le plus proche (caisse, atout, arme, radio…).
- **Spectateur** : éliminé en co-op, vous suivez un camarade en vue à l'épaule (clic ou Espace pour changer) jusqu'à la manche suivante.
- **Onglet de l'hôte en arrière-plan** : la partie continue pour les autres.

## Contenu

- **4 zones** : la tranchée de première ligne, le poste de commandement (bunker), le dépôt du générateur et la tranchée de soutien. Elles s'ouvrent avec des portes payantes.
- **12 barricades** à réparer. Les infectés arrachent les planches puis descendent dans la tranchée.
- **Générateur** : rétablir le courant allume les lampes et met en service les atouts et l'établi.
- **5 atouts** : Sang-Froid, Main Leste, Double Détente, Pas de Loup et Second Souffle.
- **11 armes** : pistolet, fusil à verrou, fusil à pompe, mitraillette, carabine, fusil d'assaut, fusil-mitrailleur, revolver, fusil de précision, lance-grenades et le prototype cryogénique Givre-7.
- **Caisse de ravitaillement** (arme aléatoire, elle change d'emplacement) et **établi d'armurier** (amélioration des armes).
- **Bonus lâchés par les infectés** : munitions max, mort subite, points doubles, frappe d'artillerie et barricades.
- **Manches** de difficulté croissante, avec des « brutes » blindées et une tempête blanche toutes les 6 manches. La résistance des infectés augmente moins vite après la 20e manche, pour que les parties longues restent jouables.
- **Personnages** : infectés à corps organique animé (six morphologies, brutes à masque à gaz et gilet), réactions aux impacts et chutes physiques (ragdoll) ; camarades en tenue de soldat.
- **Barbelés électrifiés** (1000 points, 25 s) dans deux boyaux, une fois le courant rétabli.
- **Objectif caché** : après le retour du courant, tendez l'oreille du côté du poste de commandement.
- **Classement des camarades** (bouton *Classement*) : meilleurs résultats et soldat de la semaine. Il se met à jour tout seul quand vous jouez ensemble ; sinon, échangez un code de classement par message (*Copier mon code* / *Importer le code*).
- Neige, vent et brouillard ; fusées éclairantes, projecteurs et lueurs d'artillerie ; sang sur la neige, douilles, impacts ; sons 100 % synthétisés et spatialisés.
- 4 niveaux de graphismes avec résolution dynamique, record personnel sauvegardé.

<details>
<summary>Solution de l'objectif caché (à ne pas lire si vous voulez chercher)</summary>

1. Rétablissez le courant, puis écoutez la radio du poste de commandement.
2. Trouvez les trois lampes d'émetteur (une en première ligne, les autres au poste, au dépôt ou en soutien) et installez-les dans la radio.
3. Maintenez E sur la radio pour calibrer la fréquence : les infectés affluent.
4. Tenez 90 secondes : un barrage d'artillerie nettoie le secteur, +3000 points par soldat, et une étoile s'ajoute à votre ligne du classement.

</details>
