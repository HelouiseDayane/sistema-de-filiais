#!/bin/bash

GREEN='[0;32m'
BLUE='[0;34m'
YELLOW='[1;33m'
NC='[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  PARANDO SISTEMA - Bruno Cakes${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

cd /srv/Bruno_Cakes_filial

echo -e "${BLUE}ℹ Parando containers...${NC}"
docker compose stop

echo -e "${BLUE}ℹ Removendo containers...${NC}"
docker compose down

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}OK SISTEMA PARADO COM SUCESSO!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "Informacoes:"
echo "  • Containers foram removidos"
echo "  • Volumes foram PRESERVADOS (banco de dados intacto)"
echo "  • Use ./start.sh para reiniciar"
echo ""
