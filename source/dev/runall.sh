#!/bin/bash
# Batterie complète : chaque test tourne seul (swiftshader est lent), résultats dans results/.
cd "$(dirname "$0")"
sh servers.sh >/dev/null
mkdir -p results
run() { local name=$1; shift; local t0=$(date +%s); timeout 900 "$@" > results/$name.txt 2>&1; echo "$name exit=$? $(( $(date +%s) - t0 ))s $(grep -h -E "^ERRORS|ERRORS:|^ÉCARTS" results/$name.txt | tail -1)" >> results/summary.txt; }
: > results/summary.txt
run feat node feat.mjs
run sounds node sounds.mjs
run volumes node volumes.mjs
run sounds_mp3 env Q=mp3 node sounds.mjs
run fullscreen node fullscreen.mjs
for m in poste7 cite penitencier filon; do for q in 0 2; do run photo_${m}_$q env CHECK=1 node photo.mjs $m $q; done; done
for m in poste7 cite penitencier filon; do run entries_$m env MAPID=$m node entries.mjs; done
for m in poste7 cite penitencier filon; do run mapplay_$m node mapplay.mjs $m; done
for m in poste7 cite penitencier filon; do run codfeat_$m node codfeat.mjs $m; done
for m in cite penitencier filon; do run power_$m node power.mjs $m; done
for m in cite penitencier filon; do run mission_$m node mission.mjs $m; done
run secret node secret.mjs
run quest node quest.mjs
run crater node crater.mjs
run box node box.mjs
run bench node bench.mjs
run board node board.mjs
run touch node touch.mjs
run coop node coop.mjs
run coopmap node coopmap.mjs
run migrate node migrate.mjs
run weap node weap.mjs
run mergeaudit node mergeaudit.mjs
run netdiag node netdiag.mjs
for m in cite penitencier filon; do run coopmission_$m node coopmission.mjs $m; done
for m in cite penitencier; do run coopjoin_$m node coopjoin.mjs $m; done
run freeze_relay node freeze.mjs cite
run freeze_peer env Q='relay=ws://127.0.0.1:1&peer=127.0.0.1:9000' node freeze.mjs cite
for m in relay relaydead room; do run migrate_$m node migrate.mjs $m; done
run coop3_relay node coop3.mjs cite
run coop3_peer env Q='relay=ws://127.0.0.1:1&peer=127.0.0.1:9000' node coop3.mjs cite
echo FINI >> results/summary.txt
