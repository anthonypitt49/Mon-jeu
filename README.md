# Snowfall Protocol

FPS de survie à la manière des modes Zombies : tenez les barricades, rétablissez le courant, achetez atouts et armes, et survivez manche après manche, seul ou jusqu'à quatre en coopération, sur **quatre cartes**.

Tout le jeu tient dans un seul fichier : **`index.html`**.

## Jouer

**En ligne (recommandé)** : dans ce dépôt, allez dans **Settings → Pages**, choisissez *Deploy from a branch*, branche `main`, dossier `/ (root)`, puis **Save**. Au bout d'une minute, le jeu est jouable ici : `https://anthonypitt49.github.io/Mon-jeu/`. C'est aussi ce lien qu'il faut partager avec vos amis pour le co-op.

**En local** : ouvrez `index.html` dans Chrome, Edge ou Firefox. Une connexion Internet est nécessaire, car le moteur 3D (Three.js) et les polices sont chargés depuis un CDN.

**Autonome** : le jeu ne dépend ni de Claude ni d'aucun serveur à vous. Solo, co-op, classement, objectifs : tout fonctionne depuis GitHub Pages. La version publiée sur claude.ai n'est qu'une porte d'entrée de plus.

## Les cartes

Choisissez la carte avec le bouton **Carte** du menu. En co-op, les camarades basculent automatiquement sur la carte de l'hôte. Chaque carte garde son propre record.

Les cartes sont des créations originales, inspirées de l'ambiance des cartes Zombies de Black Ops 2 (aucun décor, nom ni élément n'en est copié).

| Carte | Ambiance | Particularités |
|---|---|---|
| **Poste 7** | Tranchées gelées, hiver 1917 | La carte d'origine : bunker, dépôt du générateur, le Cratère et son biplan en feu, téléphone de mortier, barbelés électrifiés, objectif caché de la radio. Un géant d'acier arpente l'horizon. |
| **Cité Atomique** | Village témoin d'un site d'essais nucléaires, au crépuscule | Deux pavillons, un abri antiatomique, une station-service, un bus en feu. Les machines d'atouts **tombent du ciel**, une par manche, à un endroit différent à chaque partie. Six mannequins cachent un secret. |
| **Le Pénitencier** | Île-prison, nuit d'orage | Blocs de cellules, cantine, infirmerie, douches, bureau du directeur, quais battus par les vagues, phare et pont suspendu. **Le Geôlier**, un boss casqué, surgit toutes les 5 manches et cadenasse atouts et caisse. Trois pièces cachées permettent de fabriquer un **bouclier**. |
| **Filon Maudit** | Ville minière du Far West engloutie sous la montagne | Galerie de mine, grand-rue, saloon, magasin, banque, prison, église, sous une voûte de roche percée d'un puits de lumière. **Le Colosse**, un géant enfermé chez le shérif : libérez-le, offrez-lui des bonbons et il écrase les infectés pour vous. **Banque** : les points déposés sont conservés d'une partie à l'autre. |

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
| 1 · 2 · 3 ou molette | Changer d'arme (la 3ᵉ arme demande l'atout Troisième Arme) |
| G | Grenade |
| V ou clic molette | Couteau |
| F | Lampe torche |
| Q | Signaler un infecté, un objet ou un endroit (co-op) ; désigner la cible du mortier (Poste 7) |
| Échap / P | Pause |

Sur téléphone ou tablette, des commandes tactiles s'affichent : joystick à gauche, visée par glissement à droite, et des boutons pour tirer, viser, sauter, recharger, interagir, lancer une grenade, utiliser le couteau, allumer la lampe, changer d'arme et, en co-op, signaler (PING).

## Coopération (2 à 4 joueurs)

1. Un joueur clique sur **Rejoindre une partie**, saisit son indicatif, laisse le code vide et valide. Il héberge alors la partie et reçoit un code à 6 caractères.
2. Les autres joueurs saisissent ce code. Ils passent automatiquement sur la carte choisie par l'hôte.
3. L'hôte clique sur **Lancer la partie**.

**Ça marche sur n'importe quel réseau** (maison, école, partage de connexion 4G) : la partie passe par des relais publics gratuits (MQTT sur WebSocket), et quand deux ordinateurs arrivent à se parler directement, les positions et les infectés prennent ce chemin plus court. Dans le salon, chaque camarade affiche **DIRECT** ou **RELAIS**. Si les relais sont bloqués, le jeu se rabat tout seul sur la connexion directe.

**L'hôte et ses amis doivent avoir la même version** (affichée en haut du menu, par exemple « V4.0 ») : le jeu se met à jour tout seul en arrivant sur le menu. Si un ami a encore une ancienne version, il recharge la page avec Ctrl+F5.

- **Relève de l'hôte** : si l'hôte quitte ou perd sa connexion, un camarade reprend automatiquement la partie en quelques secondes.
- **Signaler** (Q ou PING) : un losange à votre couleur apparaît chez tout le monde, avec la distance.
- **Spectateur** : éliminé en co-op, vous suivez un camarade jusqu'à la manche suivante, où vous revenez **avec vos armes**.

## Contenu commun

- **8 atouts** : Sang-Froid (plus de vie), Main Leste (rechargement), Double Détente (cadence), Pas de Loup (sprint), Second Souffle (se relever), **Troisième Arme** (porter 3 armes), **Œil de Lynx** (précision et tirs à la tête) et **Décharge** (onde électrique en rechargeant). Quatre au maximum par soldat ; chaque carte en propose sept.
- **12 armes** : pistolet, fusil à verrou, fusil à pompe, mitraillette, carabine, fusil d'assaut, fusil-mitrailleur, revolver, fusil de précision, lance-grenades, prototype cryogénique Givre-7 et le **Rayonneur**, un pistolet à énergie verte dont le trait éclabousse les infectés autour de l'impact (caisse uniquement).
- **Caisse de ravitaillement** (arme aléatoire, elle change d'emplacement) et **établi d'armurier** (amélioration des armes).
- **8 bonus lâchés par les infectés** : munitions max, mort subite, points doubles, frappe d'artillerie, barricades, **Braderie** (caisse à 10 points pendant 30 s), **Sang Infecté** (les infectés ne vous voient plus pendant 20 s) et **Prime** (+500 points pour tout le monde).
- **Manches** : marquées à la craie rouge jusqu'à la 5ᵉ, de plus en plus dures ensuite, avec des brutes blindées, le Givreux (manche 7+), le Hurleur (manche 11+) et une tempête toutes les 6 manches.
- **Morts réalistes** : les infectés s'effondrent sur place (plus de corps qui s'envolent), et vous encaissez plus de coups qu'avant.
- **Classement des camarades** (bouton *Classement*) : meilleurs résultats par carte, avec une étoile quand l'objectif de la carte est accompli.
- Neige, cendres, pluie et poussière selon la carte ; éclairs, fusées éclairantes, sons 100 % synthétisés et spatialisés ; 4 niveaux de graphismes avec résolution dynamique.

## Objectifs (étoile au classement)

- **Poste 7** : l'objectif caché de la radio (solution ci-dessous).
- **Cité Atomique** : abattre les têtes des six mannequins.
- **Le Pénitencier** : abattre le Geôlier.
- **Filon Maudit** : libérer le Colosse.

<details>
<summary>Solution de l'objectif caché de Poste 7 (à ne pas lire si vous voulez chercher)</summary>

1. Rétablissez le courant, puis écoutez la radio du poste de commandement.
2. Trouvez les trois lampes d'émetteur (une en première ligne, les autres au poste, au dépôt ou en soutien) et installez-les dans la radio.
3. Maintenez E sur la radio pour calibrer la fréquence : les infectés affluent.
4. Tenez 90 secondes : un barrage d'artillerie nettoie le secteur, +3000 points par soldat.

</details>
