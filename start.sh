#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  INICIANDO SISTEMA - Bruno Cakes${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

cd /srv/Bruno_Cakes_filial

echo -e "${BLUE}Limpando containers...${NC}"
docker rm -f queue_worker backend_filial frontend-prod frontend-dev 2>/dev/null || true

echo -e "${BLUE}Parando containers...${NC}"
docker compose down 2>/dev/null || true
sleep 2

echo -e "${BLUE}Iniciando containers...${NC}"
docker compose up -d --build

echo -e "${BLUE}Aguardando servicos ficarem prontos...${NC}"

echo -n "  Backend: "
for i in {1..30}; do
  if docker compose exec -T backend_filial curl -s http://localhost/api/branches >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
    break
  fi
  sleep 2
  echo -n "."
done

echo -e "${BLUE}Verificando migrations...${NC}"
docker compose exec -T backend_filial php artisan migrate --force 2>&1 | tail -3 || true

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}OK SISTEMA INICIADO COM SUCESSO!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "Acesso:"
echo "  Frontend Dev:   https://localhost:8889"
echo "  Frontend Prod:  http://localhost:9999"
echo ""
