#!/bin/bash

echo "=================================================="
echo "  APLICANDO CORREÇÕES - BRUNO CAKES"
echo "=================================================="
echo ""

cd /srv/Bruno_Cakes_filial

echo "1. Parando containers..."
docker-compose down

echo ""
echo "2. Removendo imagens antigas do frontend-dev..."
docker rmi brunocakes_front_v3-frontend-dev 2>/dev/null || true
docker rmi bruno_cakes_filial-frontend-dev 2>/dev/null || true

echo ""
echo "3. Reconstruindo containers..."
docker-compose build frontend-dev

echo ""
echo "4. Iniciando todos os containers..."
docker-compose up -d

echo ""
echo "5. Aguardando containers iniciarem (15 segundos)..."
sleep 15

echo ""
echo "6. Verificando status dos containers..."
docker-compose ps

echo ""
echo "7. Testando conectividade..."
echo ""
echo "Frontend Dev:"
curl -s -k -o /dev/null -w "Status: %{http_code}\n" https://localhost:8888

echo ""
echo "Frontend Prod:"
curl -s -k -o /dev/null -w "Status: %{http_code}\n" https://localhost:9999

echo ""
echo "=================================================="
echo "  CORREÇÕES APLICADAS COM SUCESSO!"
echo "=================================================="
echo ""
echo "Acesse:"
echo "  - Frontend Dev: http://seu-servidor:8888"
echo "  - Frontend Prod: http://seu-servidor:9999"
echo ""
echo "Para ver logs:"
echo "  docker-compose logs -f frontend-dev"
echo "  docker-compose logs -f backend"
echo ""
