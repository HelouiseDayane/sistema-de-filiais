#!/bin/sh
# Script pós-build para atualizar o manifest.json
set +e
node ./scripts/updateManifestFromStoreSettings.js || echo "[AVISO] Não foi possível atualizar o manifest.json (backend pode estar offline durante o build). Prosseguindo..."
set -e