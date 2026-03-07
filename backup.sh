#!/bin/bash

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

GREEN='[0;32m'
BLUE='[0;34m'
RED='[0;31m'
NC='[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  BACKUP - Bruno Cakes${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}ℹ Parando containers...${NC}"
docker compose stop 2>/dev/null || true

echo -e "${BLUE}ℹ Exportando banco de dados...${NC}"
mkdir -p "$BACKUP_DIR/db"
docker compose exec -T db mysqldump -u root -paligayra658691 brunocakes > "$BACKUP_DIR/db/brunocakes_$TIMESTAMP.sql" 2>/dev/null || {
  echo -e "${RED}Erro ao exportar MySQL${NC}"
  exit 1
}

echo -e "${BLUE}ℹ Fazendo backup do codigo...${NC}"
tar -czf "$BACKUP_FILE" --exclude='node_modules' --exclude='.git' --exclude='vendor' --exclude='storage/logs' --exclude='storage/app/*' --exclude='.env' -C /srv Bruno_Cakes_filial 2>/dev/null || {
  echo -e "${RED}Erro ao fazer backup${NC}"
  exit 1
}

echo -e "${BLUE}ℹ Reiniciando containers...${NC}"
docker compose start 2>/dev/null || true

echo ""
echo -e "${GREEN}OK BACKUP CONCLUIDO!${NC}"
echo ""
echo "Arquivo: $BACKUP_FILE"
echo ""
