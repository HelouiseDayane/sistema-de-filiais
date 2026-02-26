#!/bin/bash

# ============================================================================
# BACKUP COMPLETO - Bruno Cakes
# Faz backup de bancos de dados, volumes Docker e código
# ============================================================================

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  BACKUP COMPLETO - Bruno Cakes${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Criar diretório de backups
mkdir -p "$BACKUP_DIR"

# Parar containers (opcionalmente)
echo -e "${BLUE}ℹ Parando containers...${NC}"
docker-compose stop 2>/dev/null || true

# Exportar MySQL
echo -e "${BLUE}ℹ Exportando banco de dados MySQL...${NC}"
mkdir -p "$BACKUP_DIR/db"
docker-compose exec -T mysql mysqldump -u brunocakes -pbrunocakes145236521478214821782171285742557 \
  brunocakes > "$BACKUP_DIR/db/brunocakes_$(date +%Y%m%d_%H%M%S).sql" 2>/dev/null || {
  echo -e "${RED}✗ Erro ao exportar MySQL${NC}"
  exit 1
}

# Fazer backup dos volumes Docker
echo -e "${BLUE}ℹ Fazendo backup dos volumes Docker...${NC}"
mkdir -p "$BACKUP_DIR/volumes"

# MySQL Data
if docker volume inspect mysql_data &>/dev/null; then
  tar -czf "$BACKUP_DIR/volumes/mysql_data_$TIMESTAMP.tar.gz" \
    -C /var/lib/docker/volumes mysql_data 2>/dev/null || true
fi

# Redis Data
if docker volume inspect redis_data &>/dev/null; then
  tar -czf "$BACKUP_DIR/volumes/redis_data_$TIMESTAMP.tar.gz" \
    -C /var/lib/docker/volumes redis_data 2>/dev/null || true
fi

# Fazer backup da pasta do projeto
echo -e "${BLUE}ℹ Fazendo backup do código...${NC}"
tar -czf "$BACKUP_FILE" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='vendor' \
  --exclude='storage/logs' \
  --exclude='storage/app/*' \
  --exclude='.env' \
  -C /srv Bruno_Cakes_filial 2>/dev/null || {
  echo -e "${RED}✗ Erro ao fazer backup do código${NC}"
  exit 1
}

# Reiniciar containers
echo -e "${BLUE}ℹ Reiniciando containers...${NC}"
docker-compose start 2>/dev/null || true

echo ""
echo -e "${GREEN}✓ BACKUP CONCLUÍDO COM SUCESSO!${NC}"
echo ""
echo -e "Arquivo: ${GREEN}$BACKUP_FILE${NC}"
echo -e "Tamanho: ${GREEN}$(du -h "$BACKUP_FILE" | cut -f1)${NC}"
echo -e "Banco de dados: ${GREEN}$BACKUP_DIR/db/${NC}"
echo -e "Volumes: ${GREEN}$BACKUP_DIR/volumes/${NC}"
echo ""
