#!/bin/zsh
for contract in contracts/**/*.sol; do
    echo 'Graphing' ${contract}
    solgraph ${contract} | dot -Tpng > solgraph/${${contract#contracts/}%\.sol}.png
done
