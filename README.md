# BrunoCakes - Sistema Docker Otimizado para Alto Tráfego

Este sistema foi configurado para suportar alto volume de vendas com Redis otimizado e todas as dependências necessárias.

## 🚀 Início Rápido

```bash
# Tornar scripts executáveis
chmod +x start.sh stop.sh manage.sh

# Iniciar todo o sistema
./start.sh
```

## 📋 Serviços Incluídos

- **Backend Laravel** (PHP 8.3 + extensões otimizadas)
- **Frontend React** (Node.js 20 + Vite)
- **MySQL 8.0** (configurações de performance)
- **Redis 7.2** (cache + sessões + filas)
- **Nginx** (proxy reverso + cache + rate limiting)
- **Queue Worker** (processamento de jobs)

## 🔧 Configurações de Performance

### Redis
- Memória: 512MB com política LRU
- Threading habilitado (4 threads)
- Persistência otimizada para performance
- Rate limiting configurado

### MySQL
- Buffer pool: 512MB
- Conexões máximas: 1000
- InnoDB otimizado para SSD
- Charset UTF8MB4

### Nginx
- Worker processes automático
- Cache de arquivos estáticos
- Rate limiting para API (100 req/s)
- Compressão Gzip habilitada

### PHP
- OPcache habilitado e otimizado
- APCu para cache adicional
- Session armazenada no Redis
- Memory limit: 512MB

## 📊 URLs de Acesso

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost
- **MySQL**: localhost:3306 (mapeado para 3310)
- **Redis**: localhost:6380

## 🛠️ Comandos Úteis

```bash
# Ver logs em tempo real
./manage.sh logs

# Status dos containers
./manage.sh status

# Executar comando artisan
./manage.sh artisan migrate

# Acessar shell do backend
./manage.sh shell-backend

# Conectar ao Redis
./manage.sh redis

# Monitorar recursos
./manage.sh monitor

# Parar sistema
./stop.sh
```

## 🔐 Credenciais Padrão

### MySQL
- Host: localhost:3306
- Database: brunocakes
- Username: brunocakes
- Password: brunocakes_secure_pass

### Redis
- Host: localhost:6379
- Password: redis_secure_pass

## ⚡ Otimizações para Alto Tráfego

1. **Cache Multi-layer**:
   - OPcache (PHP)
   - APCu (aplicação)
   - Redis (sessões/cache)
   - Nginx (arquivos estáticos)

2. **Rate Limiting**:
   - API geral: 100 req/s
   - Login/Auth: 5 req/s
   - Burst protection configurado

3. **Connection Pooling**:
   - MySQL: keepalive habilitado
   - Redis: pool de conexões
   - PHP-FPM: 50 workers

4. **Otimizações de Rede**:
   - Gzip compression
   - HTTP/2 ready
   - Keep-alive otimizado

## 🔄 Workflow de Desenvolvimento

1. **Desenvolvimento Local**:
   ```bash
   ./start.sh
   # Frontend roda em modo dev com hot reload
   # Backend com auto-reload via volumes
   # Jobs processando automaticamente
   ```

2. **Gerenciamento de Jobs**:
   ```bash
   # Ver status das filas
   ./manage.sh queue-status
   
   # Reiniciar workers se necessário
   ./manage.sh queue-restart
   
   # Ver jobs com falha
   ./manage.sh queue-failed
   
   # Reprocessar jobs com falha
   ./manage.sh queue-retry
   ```

3. **Deploy Produção**:
   - Sistema já configurado para auto-restart
   - Jobs rodando automaticamente
   - Health checks ativos
   - Logs centralizados

## 📈 Monitoramento

- Use `./manage.sh health` para health check completo
- Use `./manage.sh monitor` para recursos em tempo real
- Use `./manage.sh queue-status` para status das filas
- Logs centralizados via Docker com rotação automática
- Métricas do Nginx disponíveis em `/nginx_status`

## 🚀 Jobs e Filas Ativas

### Filas Configuradas:
- **high**: Jobs prioritários (3 workers, sleep 1s)
- **default**: Jobs normais (2 workers, sleep 3s) 
- **background**: Jobs longos (2 workers, sleep 5s)

### Comandos Automáticos:
- **Schedule**: Roda a cada 60 segundos
- **Queue Monitor**: Monitora filas ativas
- **Auto-restart**: Jobs reiniciam automaticamente se falharem
- **Health Check**: Verifica saúde dos workers

### Workers Ativos:
- 7 workers de fila simultâneos
- Schedule runner contínuo
- Horizon para dashboard (se instalado)
- Supervisor gerenciando todos os processos

## 🔧 Sistema de Auto-Recovery

- **Restart Policy**: `always` em todos os containers
- **Health Checks**: Automáticos em 30s intervals
- **Job Recovery**: Workers reiniciam automaticamente
- **Redis Persistence**: AOF + RDB para durabilidade
- **MySQL Recovery**: Auto-restart com health checks

## 🆘 Troubleshooting

### Container não inicia
```bash
./manage.sh logs
docker-compose ps
```

### Performance baixa
1. Verificar uso de memória: `./manage.sh monitor`
2. Verificar logs de slow queries no MySQL
3. Monitorar Redis: `./manage.sh redis` → `INFO memory`

### Problemas de conexão
1. Verificar se todos os serviços estão up: `./manage.sh status`
2. Testar conectividade: `./manage.sh shell-backend`
3. Verificar logs: `./manage.sh logs`