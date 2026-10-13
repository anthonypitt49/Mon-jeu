#!/bin/sh
# Relance au besoin les serveurs locaux de test (web 8088, PeerJS 9000, relais MQTT 8883).
cd "$(dirname "$0")"
[ -e assets ] || ln -s ../../assets assets   # textures photo, sons et icônes servis comme sur GitHub Pages
[ -e manifest.webmanifest ] || ln -s ../../manifest.webmanifest manifest.webmanifest   # appli web (écran d'accueil)
[ -e zviewer/zombies ] || ln -s ../../../assets/zombies zviewer/zombies   # infectés réalistes pour la visionneuse (dev/zviewer)
# (WEBPORT=8095 sh servers.sh : second serveur web, pour une copie du dépôt ; les outils le suivent avec WEB=http://127.0.0.1:8095 ; pas PORT, que lit brokersrv.mjs)
P=${WEBPORT:-8088}
[ -e node_modules ] || [ ! -d /home/user/Mon-jeu/source/dev/node_modules ] || ln -s /home/user/Mon-jeu/source/dev/node_modules node_modules   # copie du dépôt : modules du dépôt principal
curl -s -o /dev/null http://127.0.0.1:$P/index.html || (nohup npx --yes http-server -a 127.0.0.1 -p $P -s -c-1 . > http.log 2>&1 &)
(echo > /dev/tcp/127.0.0.1/9000) 2>/dev/null || (nohup node peersrv.mjs > peer.log 2>&1 &)
(echo > /dev/tcp/127.0.0.1/8883) 2>/dev/null || (nohup node brokersrv.mjs > broker.log 2>&1 &)
for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null http://127.0.0.1:$P/index.html && break; sleep 1; done
echo "serveurs prêts"
