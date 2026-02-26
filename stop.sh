#!/bin/bash

# ============================================================================
# STOP - Bruno Cakes
# Para todos os containers e limpa recursos (SEM deletar banco de dados)
# ============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PARANDO SISTEMA - Bruno Cakes${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Parar containers
echo -e "${BLUE}ℹ Parando containers...${NC}"
docker-compose stop

echo ""
echo -e "${BLUE}ℹ Removendo containers (volumes preservados)...${NC}"
docker-compose down

# Opcional: limpar imagens não utilizadas
echo ""
echo -e "${YELLOW}Deseja limpar imagens Docker não utilizadas? (s/N)${NC}"
read -p "" -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
  echo -e "${BLUE}ℹ Limpando imagens...${NC}"
  docker image prune -f
  echo -e "${GREEN}✓ Imagens limpas${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ SISTEMA PARADO COM SUCESSO!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Informações:${NC}"
echo "  • Containers foram removidos"
echo "  • Volumes foram PRESERVADOS (banco de dados intacto)"
echo "  • Use './start.sh' para reiniciar"
echo "  • Use './restore.sh' para restaurar de um backup"
echo ""
