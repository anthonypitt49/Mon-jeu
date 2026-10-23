# Infectés réalistes

Corps, peaux, vêtements et cheveux : [MakeHuman](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html) (pack « makehuman_system_assets », CC0, domaine public), assemblés par [MPFB2](https://static.makehumancommunity.org/mpfb.html). Zombification, assemblage et textures : `source/tools/make_zombies.py`.

Animations (marche zombie, attente, griffure, course, sprint) : [Universal Animation Library 1 et 2](https://quaternius.itch.io/universal-animation-library-2) de [Quaternius](https://quaternius.com) (versions Standard, CC0, domaine public), reciblées sur le squelette du jeu par `source/tools/make_anims.mjs` (données dans `source/src/09d_zanims.js`).

Démarches variées (marche zombie bras tendus, ivre, jambe traînée, course zombie à petits pas) : capture de mouvement [100STYLE](https://www.ianxmason.com/100style/) — *The 100STYLE Dataset*, Ian Mason, Sebastian Starke, Taku Komura (2022), sous licence [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) (styles Zombie, Drunk et DragLeftLeg). Modifications : un cycle extrait de chaque prise, avance retirée, couture lissée, reciblage sur le squelette du jeu par `source/tools/make_anims.mjs`.
