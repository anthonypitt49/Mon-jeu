#!/bin/sh
# Vérification complète d'une carte après une correction de décor (étape « murs invisibles », voir source/AUDIT_MURS.md) :
# détecteurs murs.mjs et placement.mjs, puis tests de non-régression, l'un après l'autre (un seul navigateur à la fois).
# Usage : sh verif_carte.sh <carte> ; résumé dans results/verif_<carte>.txt (journaux complets dans results/verif_<carte>_*.log).
cd "$(dirname "$0")"
m=${1:-cite}; R=results; mkdir -p $R; O=$R/verif_$m.txt; : > $O
sh servers.sh > /dev/null; node ../build.mjs index.html > /dev/null
GRAINE=1 timeout 600 node murs.mjs $m 0 > $R/verif_${m}_murs.log 2>&1
echo "murs : $(grep -h '=== MURS' $R/verif_${m}_murs.log)" >> $O; grep "^# " $R/verif_${m}_murs.log | cut -c1-220 >> $O
timeout 1800 node placement.mjs $m > $R/verif_${m}_placement.log 2>&1
grep -A14 "constats par catégorie" $R/verif_${m}_placement.log | grep -v "^→" | cut -c1-260 >> $O; grep "accessibilité (m²)\|^ERRORS" $R/verif_${m}_placement.log | cut -c1-300 >> $O
T="mapplay codfeat"; [ "$m" = poste7 ] || T="$T power mission"
for t in $T; do timeout 900 node $t.mjs $m > $R/verif_${m}_$t.log 2>&1; echo "$t → code $? : $(grep -h -E '^ERRORS|ERRORS:' $R/verif_${m}_$t.log | tail -1)" >> $O; done
MAPID=$m timeout 900 node entries.mjs > $R/verif_${m}_entries.log 2>&1
echo "entries → $(grep -c '"all":true' $R/verif_${m}_entries.log) entrées atteintes, $(grep -c '"all":false' $R/verif_${m}_entries.log) non ; $(tail -1 $R/verif_${m}_entries.log)" >> $O
echo FINI >> $O; cat $O
