#!/bin/bash

GREEN='[0;32m'
BLUE='[0;34m'
RED='[0;31m'
NC='[0m'

PASS=0
FAIL=0

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  VALIDACAO - Bruno Cakes${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

echo "1. Verificando Configuracao"
if docker compose config > /dev/null 2>&1; then
  echo -e "${GREEN}OK${NC} docker-compose.yml e valido"
  ((PASS++))
else
  echo -e "${RED}FALHA${NC} docker-compose.yml"
  ((FAIL++))
fi

echo ""
echo "2. Verificando Arquivos"
for file in start.sh stop.sh backup.sh restore.sh; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}OK${NC} $file existe"
    ((PASS++))
  else
    echo -e "${RED}FALHA${NC} $file nao encontrado"
    ((FAIL++))
  fi
done

echo ""
echo "3. Verificando Scripts Executaveis"
for file in start.sh stop.sh backup.sh restore.sh; do
  if [ -x "$file" ]; then
    echo -e "${GREEN}OK${NC} $file e executavel"
    ((PASS++))
  else
    echo -e "${RED}FALHA${NC} $file nao e executavel"
    ((FAIL++))
  fi
done

echo ""
echo "4. Verificando Certificados SSL"
if [ -f "brunocakes_front_v3/ssl/localhost.crt" ]; then
  echo -e "${GREEN}OK${NC} Certificado CRT existe"
  ((PASS++))
else
  echo -e "${RED}FALHA${NC} Certificado CRT nao encontrado"
  ((FAIL++))
fi

if [ -f "brunocakes_front_v3/ssl/localhost.key" ]; then
  echo -e "${GREEN}OK${NC} Certificado KEY existe"
  ((PASS++))
else
  echo -e "${RED}FALHA${NC} Certificado KEY nao encontrado"
  ((FAIL++))
fi

echo ""
echo -e "${BLUE}============================================================${NC}"
echo "Resumo: $PASS OK $FAIL FALHA"
echo -e "${BLUE}============================================================${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}OK TUDO VALIDADO COM SUCESSO!${NC}"
  echo ""
  echo "Proximos passos:"
  echo "  1. Executar: ./start.sh"
  echo "  2. Acessar: https://localhost:8889"
  exit 0
else
  echo -e "${RED}ERROS ENCONTRADOS${NC}"
  exit 1
fi
