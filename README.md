# Snowfall Protocol

FPS de survie à la manière des modes Zombies : tenez les barricades, rétablissez le courant, achetez atouts et armes, et survivez manche après manche, seul ou jusqu'à quatre en coopération, sur **quatre cartes**.

Tout le jeu tient dans un seul fichier : **`index.html`**.

## Jouer

**En ligne (recommandé)** : dans ce dépôt, allez dans **Settings → Pages**, choisissez *Deploy from a branch*, branche `main`, dossier `/ (root)`, puis **Save**. Au bout d'une minute, le jeu est jouable ici : `https://anthonypitt49.github.io/Mon-jeu/`. C'est aussi ce lien qu'il faut partager avec vos amis pour le co-op.

**En local** : ouvrez `index.html` dans Chrome, Edge ou Firefox. Une connexion Internet est nécessaire, car le moteur 3D (Three.js) et les polices sont chargés depuis un CDN.

**Sur iPhone, en plein écran** : Safari ne laisse aucune page cacher sa barre d'adresse. Ajoutez le jeu à l'écran d'accueil (bouton *Partager*, puis *Sur l'écran d'accueil*) et lancez-le depuis son icône : il s'ouvre en plein écran. Le bouton *Plein écran* du menu l'explique pas à pas.

**Autonome** : le jeu ne dépend ni de Claude ni d'aucun serveur à vous. Solo, co-op, classement, objectifs : tout fonctionne depuis GitHub Pages. La version publiée sur claude.ai n'est qu'une porte d'entrée de plus.

## Les cartes

Choisissez la carte avec le bouton **Carte** du menu. En co-op, les camarades basculent automatiquement sur la carte de l'hôte. Chaque carte garde son propre record.

Les cartes sont des créations originales, inspirées de l'ambiance des cartes Zombies de Black Ops 2 (aucun décor, nom ni élément n'en est copié).

| Carte | Ambiance | Particularités |
|---|---|---|
| **Poste 7** | Tranchées gelées, hiver 1917 | La carte d'origine : bunker, dépôt du générateur, le Cratère (un vrai trou d'obus, en pente) et son biplan en feu, char abandonné, canon de campagne, téléphone de mortier, barbelés électrifiés, objectif caché de la radio. Un géant d'acier arpente l'horizon. |
| **Cité Atomique** | Village témoin d'un site d'essais nucléaires, au crépuscule | Deux pavillons meublés (cuisines, salles de bains, bibliothèques), un abri antiatomique, une station-service, un bus scolaire calciné, un camion de déménagement, des berlines des années 50. Les machines d'atouts **tombent du ciel**, une par manche. Mission : **Alerte atomique**. |
| **Le Pénitencier** | Île-prison, nuit d'orage | Blocs de cellules, cantine, infirmerie, douches, bureau du directeur, quais battus par les vagues, phare et pont suspendu. **Le Geôlier**, un boss casqué, cadenasse atouts et caisse. Trois pièces cachées permettent de fabriquer un **bouclier**. Mission : **L'évasion**. |
| **Filon Maudit** | Ville minière du Far West engloutie sous la montagne | Galerie de mine, grand-rue, saloon, magasin, banque, prison, église à charpente apparente, sous une voûte de roche percée d'un puits de lumière. **Le Colosse**, un géant enfermé chez le shérif : libérez-le, offrez-lui des bonbons et il écrase les infectés autour de vous (sans s'égarer) et fracasse les éboulis brillants près desquels vous le menez. **Banque** : les points déposés sont conservés d'une partie à l'autre. Mission : **Le trésor du Filon**. |

### Décors

Les quatre cartes ont été reprises en détail : fenêtres avec encadrements, appuis, croisillons, volets, jardinières ou barreaux selon le bâtiment ; vitres qui reflètent vraiment (plus de « murs transparents ») ; avant-toits, gouttières, plinthes, corniches et lambris ; fils barbelés en hélice sur les murs d'enceinte ; salissures, coulures, fissures, moisissures, graffitis et traces de sang ; débris, feuilles, douilles et gravats semés au sol ; meubles et objets posés là où ils ont un sens (plus rien ne flotte ni ne traverse un mur).

**Les quatre cartes en textures photo**, chacune avec un éclairage d'ambiance tiré d'une vraie photo de ciel :
- **Poste 7** : planches usées des coffrages et des caillebotis, parois de boue, sol de boue piétinée sous la neige, sacs de sable en toile tachée (chaque sac différent), tôle ondulée rouillée, béton du bunker ; ciel nocturne couvert.
- **Cité Atomique** : route d'asphalte fissurée, trottoirs en dalles, pelouses arrosées, terre craquelée du lac asséché, bardeaux d'asphalte, brique, peinture des clins, parquet, damier de la cuisine, carrelage des salles de bains, béton de l'abri ; coucher de soleil sur le désert.
- **Le Pénitencier** : moellons des murs, béton crasseux des couloirs, peinture écaillée des cellules, carrelage des douches, quais en planches lavées par le sel, rochers du rivage ; nuit brumeuse.
- **Filon Maudit** : planches délavées des façades, trottoirs de bois, terre battue de la grand-rue, roche de la caverne, parquet usé et papier peint damassé du saloon, brique de la banque, bardeaux, pierre de l'église ; lumière de caverne.

Les photos (4 à 6,5 Mo par carte) se chargent pendant que vous jouez ; en graphismes « bas » (téléphones), une version allégée (≈ 1 Mo). En graphismes « élevé » et « ultra », un **ombrage d'ambiance** assombrit les coins, les recoins et le pied des murs. Ressources libres de droits (CC0) de [Poly Haven](https://polyhaven.com), crédits dans `assets/<carte>/CREDITS.md` ([Poste 7](assets/poste7/CREDITS.md), [Cité](assets/cite/CREDITS.md), [Pénitencier](assets/penitencier/CREDITS.md), [Filon](assets/filon/CREDITS.md)).

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

**Ça marche sur n'importe quel réseau** (maison, école, partage de connexion 4G) : la partie passe par quatre relais publics gratuits (MQTT sur WebSocket, dont un sur le port 443 du web, rarement bloqué), et quand deux ordinateurs arrivent à se parler directement, les positions et les infectés prennent ce chemin plus court. Dans le salon, chaque camarade affiche **DIRECT** ou **RELAIS**.

**Si aucun relais ne répond chez l'hôte**, le salon l'affiche en orange : la partie passe en connexion directe, que seuls les joueurs du même Wi-Fi peuvent rejoindre. Le jeu retente les relais toutes les 12 secondes et, dès que l'un d'eux répond, affiche un **nouveau code** à donner aux amis. Côté invité, le message d'erreur dit pourquoi la partie est introuvable : hôte en connexion directe, partie hébergée sur claude.ai, relais bloqués par votre réseau, ou code erroné.

**L'hôte et ses amis doivent avoir la même version** (affichée en haut du menu, par exemple « V4.6 ») : le jeu se met à jour tout seul en arrivant sur le menu. Si un ami a encore une ancienne version, il recharge la page avec Ctrl+F5.

- **Relève de l'hôte** : si l'hôte quitte ou perd sa connexion, un camarade reprend automatiquement la partie en quelques secondes. Si l'ordinateur de l'hôte n'avait fait que geler (chargement, ralentissement), il rejoint tout seul la partie reprise à son retour : plus de partie coupée en deux.
- **Signaler** (Q ou PING) : un losange à votre couleur apparaît chez tout le monde, avec la distance.
- **Spectateur** : éliminé en co-op, vous suivez un camarade jusqu'à la manche suivante, où vous revenez **avec vos armes**.

## Le courant : il se mérite

Le générateur ne s'allume plus d'un simple appui. En haut de l'écran, le **bandeau d'objectif** vous guide :

1. **Trouver trois pièces** (fusible, bidon, bobine, courroie… selon la carte). Elles sont cachées **à un endroit différent à chaque partie**, dans les zones à ouvrir ; le bandeau indique les zones où chercher.
2. **Les installer** au générateur (maintenir E).
3. **Lancer le moteur** (maintenir E).
4. **Défendre le générateur** pendant 45 secondes de montée en régime : les infectés affluent, et la jauge ne progresse que si un soldat reste à moins de 8 mètres. Elle redescend si tout le monde s'éloigne.

Récompense : +500 points par soldat, et tout ce qui demande du courant s'allume.

## Missions

Chaque carte a une mission en plusieurs étapes, toujours affichée dans le bandeau en haut de l'écran (avec, tant que le courant n'est pas rétabli, une seconde ligne « En parallèle »). Dès qu'une étape se joue à un endroit précis (générateur, radio, établi, clés, vedette, magasin, Colosse, éboulis, chambre forte), un **repère doré « OBJECTIF »** indique la direction et la distance ; les étapes de fouille (pièces, mannequins, lampes) restent à chercher. L'accomplir donne l'étoile au classement, et l'écran de fin rappelle si la mission a été accomplie et si le courant a été rétabli.

| Carte | Mission | Étapes |
|---|---|---|
| **Poste 7** | Opération Aube blanche | L'objectif caché de la radio (solution plus bas). |
| **Cité Atomique** | Alerte atomique | Abattre les six mannequins au foulard rouge → lancer l'alerte avec la radio d'urgence de l'abri (il faut du courant) → **survivre 60 secondes** à l'alerte, sous la sirène. +3000 points par soldat. |
| **Le Pénitencier** | L'évasion | Trouver les trois pièces du bouclier et l'assembler → le Geôlier fait sa ronde dès la 3ᵉ manche : l'abattre et **ramasser ses clés** → préparer la vedette amarrée aux quais → **la défendre 60 secondes** à moins de 9 mètres… mais personne ne quitte le rocher. +3000 points par soldat. |
| **Filon Maudit** | Le trésor du Filon | Libérer le Colosse → lui donner des bonbons → le **guider** jusqu'aux trois éboulis qui brillent (il les fracasse en passant ; 40 s par sachet de bonbons) → ramasser les trois pépites → les déposer dans la **chambre forte** de la banque. +3000 points par soldat et +2000 sur votre compte en banque. |

## Secrets

Chaque carte cache **trois vieux disques**, toujours aux mêmes endroits, dans trois zones différentes. Un léger reflet les trahit de temps en temps. Écoutez-les tous les trois (maintenir E) et le morceau de la carte se joue pour toute l'équipe.

## Difficulté

Quatre niveaux dans les options : **Recrue**, **Régulier**, **Vétéran** et **Cauchemar**. Les manches sont plus fournies et plus rapides qu'avant (les coureurs arrivent plus tôt, les infectés spéciaux aussi), sans que les infectés frappent plus fort : le défi vient du nombre et de la pression, pas de morts injustes. En **Cauchemar**, les coureurs sont là dès la 2ᵉ manche et les spéciaux arrivent très tôt.

## Contenu commun

- **8 atouts** : Sang-Froid (plus de vie), Main Leste (rechargement), Double Détente (cadence), Pas de Loup (sprint), Second Souffle (se relever), **Troisième Arme** (porter 3 armes), **Œil de Lynx** (précision et tirs à la tête) et **Décharge** (onde électrique en rechargeant). Quatre au maximum par soldat ; chaque carte en propose sept.
- **12 armes** : pistolet, fusil à verrou, fusil à pompe, mitraillette, carabine, fusil d'assaut, fusil-mitrailleur, revolver, fusil de précision, lance-grenades, prototype cryogénique Givre-7 et le **Rayonneur**, un pistolet à énergie verte dont le trait éclabousse les infectés autour de l'impact (caisse uniquement).
- **Caisse de ravitaillement** (arme aléatoire, elle change d'emplacement) et **établi d'armurier** (amélioration des armes).
- **8 bonus lâchés par les infectés** : munitions max, mort subite, points doubles, frappe d'artillerie, barricades, **Braderie** (caisse à 10 points pendant 30 s), **Sang Infecté** (les infectés ne vous voient plus pendant 20 s) et **Prime** (+500 points pour tout le monde).
- **Manches** : marquées à la craie rouge jusqu'à la 5ᵉ, de plus en plus dures ensuite, avec des brutes blindées (manche 5+), le Givreux (manche 6+), le Hurleur (manche 9+) et une tempête toutes les 6 manches. Ces seuils valent en Régulier : ils arrivent plus tard en Recrue, plus tôt en Vétéran et en Cauchemar.
- **Armes d'époque en main** : Colt 1911, revolver Webley, Mauser Kar98k, Winchester 1897 de tranchée, Thompson, carabine M1, AK à crosse bois, Lewis, couteau de tranchée et grenade Mills, aux vraies dimensions : acier bruni et usé, noyer verni, bakélite quadrillée, mains gantées qui enserrent la poignée.
- **Vrais sons** (enregistrements libres de droits, Freesound) : tirs, recharges, impacts, pas, infectés, vent, artillerie au loin. Réglages : volume général, et volumes détaillés pour les armes, les infectés, l'ambiance et la musique.
- **Morts réalistes** : les infectés s'effondrent sur place (plus de corps qui s'envolent), et vous encaissez plus de coups qu'avant.
- **Réalisme des tirs** : impacts de balles, traces de sang et brûlures d'explosion bien visibles ; éclaboussures sur le mur juste derrière un infecté touché ; flaque qui s'étale lentement sous les corps (et coule entre les lattes des caillebotis) ; empreintes de pas dans la neige du Poste 7 et la terre battue du Filon ; douilles qui retombent et se couchent au sol ; fumée de bouche légère, qui part bien du canon ; écho des coups de feu en plein air.
- **Classement des camarades** (bouton *Classement*) : meilleurs résultats par carte, avec une étoile quand l'objectif de la carte est accompli.
- **Astuces** pour les nouveaux joueurs : chacune s'affiche une seule fois, au bon moment (réparer les fenêtres, le repère d'objectif, signaler en co-op…).
- **Plus léger à faire tourner** : halos lumineux regroupés, ombres réservées aux objets qui comptent, décor découpé par zones pour que la carte graphique ignore ce qui est hors de vue (jusqu'à 45 % de triangles en moins selon la carte).
- Neige, cendres, pluie et poussière selon la carte ; éclairs, fusées éclairantes, sons 100 % synthétisés et spatialisés ; 4 niveaux de graphismes avec résolution dynamique.

## Objectifs (étoile au classement)

L'étoile récompense la mission de la carte (voir **Missions**) : la radio de Poste 7, l'alerte atomique tenue, la vedette défendue jusqu'au bout, l'or déposé dans la chambre forte.

<details>
<summary>Solution de l'objectif caché de Poste 7 (à ne pas lire si vous voulez chercher)</summary>

1. Rétablissez le courant, puis écoutez la radio du poste de commandement.
2. Trouvez les trois lampes d'émetteur (une en première ligne, les autres au poste, au dépôt ou en soutien) et installez-les dans la radio.
3. Maintenez E sur la radio pour calibrer la fréquence : les infectés affluent.
4. Tenez 90 secondes : un barrage d'artillerie nettoie le secteur, +3000 points par soldat.

</details>
