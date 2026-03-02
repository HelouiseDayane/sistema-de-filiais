#!/bin/bash

# ============================================================================
# START - Bruno Cakes
# Inicia containers e testa conectividade (SEM DESTRUIR DADOS)
# ============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  INICIANDO SISTEMA - Bruno Cakes${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Parar containers anteriores (mantém volumes/dados)
echo -e "${BLUE}ℹ Parando containers anteriores (mantendo dados)...${NC}"
docker compose down 2>/dev/null || true

# Iniciar containers em background (sem rebuild)
echo -e "${BLUE}ℹ Iniciando containers...${NC}"
docker compose up -d --build

# Aguardar serviços ficarem prontos
echo -e "${BLUE}ℹ Aguardando serviços ficarem prontos...${NC}"

# Esperar MySQL (container 'db' externo)
echo -n "  • MySQL (db externo): "
for i in {1..30}; do
  if docker exec db mysqladmin ping -h localhost -u root -paligayra658691 &>/dev/null; then
    echo -e " ${GREEN}✓${NC}"
    break
  fi
  sleep 2
  echo -n "."
done


# Esperar Redis (removido pois não faz parte do compose)
# echo -n "  • Redis: "
# for i in {1..15}; do
#   if docker compose exec -T redis redis-cli -a cakes12345671571285415715715785421478214782171285742557 ping &>/dev/null; then
#     echo -e " ${GREEN}✓${NC}"
#     break
#   fi
#   sleep 2
#   echo -n "."
# done

# Esperar Backend
echo -n "  • Backend: "
for i in {1..30}; do
  if docker compose exec -T backend php -v &>/dev/null; then
    echo -e " ${GREEN}✓${NC}"
    break
  fi
  sleep 2
  echo -n "."
done

# Garantir que nginx está rodando no backend (corrige problema recorrente)
echo -e "${BLUE}ℹ Verificando serviços críticos...${NC}"
echo -n "  • Nginx (backend): "
if docker compose exec -T backend service nginx status 2>&1 | grep -q "running"; then
  echo -e "${GREEN}✓ Rodando${NC}"
else
  echo -n "Iniciando... "
  docker compose exec -T backend service nginx start &>/dev/null
  sleep 3
  if docker compose exec -T backend service nginx status 2>&1 | grep -q "running"; then
    echo -e "${GREEN}✓${NC}"
  else
    # Tentar forçar inicio com docker exec direto (fallback)
    docker exec backend service nginx start &>/dev/null
    sleep 2
    if docker exec backend service nginx status 2>&1 | grep -q "running"; then
      echo -e "${GREEN}✓ (forçado)${NC}"
    else
      echo -e "${RED}✗ Falhou - execute manualmente: docker exec backend service nginx start${NC}"
    fi
  fi
fi

# Executar migrations (mantém dados)
echo -e "${BLUE}ℹ Verificando migrations...${NC}"
docker compose exec -T backend php artisan migrate --force 2>&1 | grep -E "(Migrat|Nothing|error)" || echo "  ✓ Migrations OK"

# Executar seeders (apenas se o banco estiver vazio)
echo -e "${BLUE}ℹ Verificando seeders...${NC}"
USER_COUNT=$(docker compose exec -T backend php artisan tinker --execute="echo \App\Models\User::count();" 2>/dev/null | tail -1 | tr -d '\r\n' || echo "0")
if [ "$USER_COUNT" == "0" ] || [ -z "$USER_COUNT" ]; then
  echo "  • Banco vazio, executando seeders..."
  docker compose exec -T backend php artisan db:seed --force 2>&1 | grep -E "(Seed|Database|error)" || echo "  ✓ Seeders executados"
else
  echo "  ✓ Já existem $USER_COUNT usuários, seeders não necessários"
fi

# Corrigir permissões
echo -e "${BLUE}ℹ Corrigindo permissões...${NC}"
docker compose exec -T backend chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true
docker compose exec -T backend chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true



# Executar scheduler Laravel
echo -e "${BLUE}ℹ Iniciando scheduler Laravel...${NC}"
docker compose exec -T backend php artisan schedule:run &

# Iniciar worker da fila Laravel (jobs)
echo -e "${BLUE}ℹ Iniciando worker de fila Laravel...${NC}"
docker compose exec -T backend nohup php artisan queue:work redis --sleep=1 --tries=3 > /dev/null 2>&1 &

# Limpar cache
echo -e "${BLUE}ℹ Limpando cache...${NC}"
docker compose exec -T backend php artisan config:clear 2>/dev/null || true
docker compose exec -T backend php artisan cache:clear 2>/dev/null || true
docker compose exec -T backend php artisan route:cache 2>/dev/null || true

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ CONTAINERS INICIADOS!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""

# Status dos containers
echo -e "${YELLOW}Status dos containers:${NC}"
docker compose ps
echo ""

# ============================================================================
# TESTES DE CONECTIVIDADE
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  EXECUTANDO TESTES DE CONECTIVIDADE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Testar MySQL
echo -n "1. MySQL - Conexão e consulta: "
if docker compose exec -T backend php artisan tinker --execute="DB::connection()->getPdo(); echo 'OK';" 2>&1 | grep -q "OK"; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ Falhou${NC}"
fi


# 2. Testar Redis (removido pois não faz parte do compose)
# echo -n "2. Redis - Conexão e set/get: "
# if docker compose exec -T redis redis-cli -a cakes12345671571285415715715785421478214782171285742557 SET test_key "test_value" &>/dev/null && \
#    docker compose exec -T redis redis-cli -a cakes12345671571285415715715785421478214782171285742557 GET test_key &>/dev/null; then
#   echo -e "${GREEN}✓${NC}"
#   docker compose exec -T redis redis-cli -a cakes12345671571285415715715785421478214782171285742557 DEL test_key &>/dev/null
# else
#   echo -e "${RED}✗ Falhou${NC}"
# fi

# 3. Testar Backend - Endpoint público
echo -n "3. Backend - API /api/branches: "
BACKEND_RESPONSE=$(docker compose exec -T backend curl -s -o /dev/null -w "%{http_code}" http://localhost/api/branches)
if [ "$BACKEND_RESPONSE" == "200" ]; then
  echo -e "${GREEN}✓ (200 OK)${NC}"
else
  echo -e "${YELLOW}⚠ (HTTP $BACKEND_RESPONSE)${NC}"
fi

# 4. Testar Nginx no Backend (verifica se está acessível internamente)
echo -n "4. Backend - Nginx interno: "
NGINX_CHECK=$(docker compose exec -T backend curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
if [ "$NGINX_CHECK" == "200" ] || [ "$NGINX_CHECK" == "404" ] || [ "$NGINX_CHECK" == "302" ]; then
  echo -e "${GREEN}✓ Respondendo${NC}"
else
  echo -e "${RED}✗ Não responde (HTTP $NGINX_CHECK)${NC}"
fi

# 5. Testar Login Admin (credenciais do seeder)
echo -n "5. Backend - Login Admin: "

LOGIN_RESPONSE=$(docker compose exec -T backend curl -s -X POST http://localhost/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"GatoPreto11."}' \
  -w "%{http_code}" -o /tmp/login_response.json)

if [ "$LOGIN_RESPONSE" == "200" ] && grep -q "token" /tmp/login_response.json 2>/dev/null; then
  echo -e "${GREEN}✓ Login OK, token gerado${NC}"
else
  echo -e "${YELLOW}⚠ (HTTP $LOGIN_RESPONSE)${NC}"
  cat /tmp/login_response.json 2>/dev/null | head -n 3
fi
rm -f /tmp/login_response.json

# 6. Testar Frontend Dev - Acesso interno ao Backend
echo -n "6. Frontend Dev - Acesso ao backend: "
if docker compose exec -T frontend-dev curl -s -o /dev/null -w "%{http_code}" http://backend/api/branches | grep -q "200"; then
  echo -e "${GREEN}✓ Conectado${NC}"
else
  echo -e "${YELLOW}⚠ Problema na comunicação${NC}"
fi

# 7. Testar Frontend Prod - Acesso interno ao Backend
echo -n "7. Frontend Prod - Acesso ao backend: "
if docker compose exec -T frontend-prod curl -s -o /dev/null -w "%{http_code}" http://backend/api/branches | grep -q "200"; then
  echo -e "${GREEN}✓ Conectado${NC}"
else
  echo -e "${YELLOW}⚠ Problema na comunicação${NC}"
fi

# 8. Testar acesso público aos Frontends (portas expostas ao Cloudflare)
echo -n "8. Frontend Prod - Porta 9999 (Cloudflare): "
if curl -k -s -o /dev/null -w "%{http_code}" https://localhost:9999 2>/dev/null | grep -qE "200|404|302"; then
  echo -e "${GREEN}✓ Acessível${NC}"
else
  echo -e "${RED}✗ Inacessível${NC}"
fi

echo -n "9. Frontend Dev - Porta 8888 (Cloudflare): "
if curl -k -s -o /dev/null -w "%{http_code}" https://localhost:8889 2>/dev/null | grep -qE "200|404|302"; then
  echo -e "${GREEN}✓ Acessível${NC}"
else
  echo -e "${RED}✗ Inacessível${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ TESTES CONCLUÍDOS!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""

# Informações úteis
echo -e "${YELLOW}📋 Credenciais de Teste (do seeder):${NC}"
echo "   Email: admin@admin.com"
echo "   Senha: Gatopreto11."
echo ""
echo -e "${YELLOW}🌐 URLs (Servidor):${NC}"
echo "   Público (Cloudflare): https://brunocake.zapsrv.com"
echo "   Frontend Dev (8889):  http://localhost:8889"
echo "   Frontend Prod (9999): http://localhost:9999"
echo "   Backend (interno):    http://backend (apenas na rede Docker)"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "   • MySQL: Usando container 'db' externo (mysql:8.0.45 na porta 3305)"
echo "   • Backend NÃO está exposto publicamente (apenas interno)"
echo "   • Cloudflare acessa apenas frontends (8889 e 9999)"
echo "   • Frontends acessam backend via rede interna Docker"
echo ""
echo -e "${BLUE}ℹ Para ver logs: ${NC}docker compose logs -f [backend|frontend-dev]${NC}"
echo ""
