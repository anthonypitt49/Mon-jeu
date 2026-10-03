#!/bin/sh
# Relance au besoin les serveurs locaux de test (web 8088, PeerJS 9000, relais MQTT 8883).
cd "$(dirname "$0")"
[ -e assets ] || ln -s ../../assets assets   # textures photo servies comme sur GitHub Pages
curl -s -o /dev/null http://127.0.0.1:8088/index.html || (nohup npx --yes http-server -a 127.0.0.1 -p 8088 -s -c-1 . > http.log 2>&1 &)
(echo > /dev/tcp/127.0.0.1/9000) 2>/dev/null || (nohup node peersrv.mjs > peer.log 2>&1 &)
(echo > /dev/tcp/127.0.0.1/8883) 2>/dev/null || (nohup node brokersrv.mjs > broker.log 2>&1 &)
for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null http://127.0.0.1:8088/index.html && break; sleep 1; done
echo "serveurs prêts"
