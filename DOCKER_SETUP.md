# Bruno Cakes - Docker Setup

## 📋 Estrutura de Serviços

Este projeto está configurado com Docker Compose em 3 camadas:

### 1. **Frontend - Desenvolvimento** (porta 8888)
- **URL:** `https://localhost:8888`
- **Tipo:** Vite em modo desenvolvimento (hot reload)
- **Acesso:** Localhost apenas
- **Dockerfile:** `brunocakes_front_v3/Dockerfile.dev`

### 2. **Frontend - Produção** (porta 9999)
- **URL:** `https://localhost:9999`
- **Tipo:** Build estático com Nginx
- **Acesso:** Localhost apenas (para teste antes de enviar ao Cloudflare)
- **Dockerfile:** `brunocakes_front_v3/Dockerfile`

### 3. **Backend** (rede interna)
- **URL:** `http://backend` (apenas na rede interna dos containers)
- **Tipo:** API Laravel (PHP-FPM)
- **Acesso:** Interno apenas (sem ports expostas)
- **Porta interna:** 80

## 🚀 Como Usar (4 Scripts Principais)

### 1️⃣ Iniciar o Sistema
```bash
./start.sh
```
**O que faz:**
- Constrói todas as imagens Docker
- Inicia containers em background (-d)
- Aguarda serviços ficarem prontos
- Testa conectividade
- Mostra portas disponíveis

### 2️⃣ Parar o Sistema
```bash
./stop.sh
```
**O que faz:**
- Para todos os containers
- Remove containers (volumes preservados)
- Opcionalmente limpa imagens não utilizadas
- **NÃO deleta banco de dados** ✓

### 3️⃣ Fazer Backup
```bash
./backup.sh
```
**O que faz:**
- Exporta banco de dados MySQL
- Backup dos volumes Docker
- Backup do código do projeto

### 4️⃣ Restaurar de Backup
```bash
./restore.sh
```
**O que faz:**
- Lista backups disponíveis
- Restaura tudo (com confirmação)
- Reinicia serviços

---

## 🔒 Segurança de Rede

- **MySQL:** `127.0.0.1:3310` (localhost apenas)
- **Redis:** `127.0.0.1:6380` (localhost apenas)
- **Backend:** Sem portas expostas (apenas rede interna)
- **Frontend Dev:** `127.0.0.1:8888` (localhost apenas)
- **Frontend Prod:** `127.0.0.1:9999` (localhost apenas)

## 📚 Variáveis de Ambiente

### Backend
```
APP_URL=http://backend:80
APP_ENV=production
DB_HOST=mysql
DB_PORT=3306
CACHE_DRIVER=redis
SESSION_DRIVER=redis
```

### Frontend Dev
```
VITE_API_URL=http://backend
```

## 🐛 Troubleshooting

### Portas em uso
```bash
# Verificar qual processo usa a porta
lsof -i :8888
lsof -i :9999

# Matar processo na porta
kill -9 <PID>
```

### Ver status dos containers
```bash
docker-compose ps
```

### Ver logs
```bash
docker-compose logs -f
```

### Limpar tudo e começar do zero
```bash
docker-compose down -v
docker system prune -a
./start.sh
```

## 📝 Modificações Feitas

1. **docker-compose.yml**
   - Reorganizado com rede interna (`internal`)
   - Backend sem ports expostas (apenas expose)
   - Dois Frontends: dev e prod
   - MySQL e Redis restritos a localhost

2. **Dockerfile** (Produção)
   - Multi-stage build
   - Node para build, Nginx para servir
   - Otimizado para produção

3. **Dockerfile.dev** (Desenvolvimento)
   - Node com hot reload
   - Volumes mapeados
   - Porta 5173 exposta

4. **Scripts de Gerenciamento**
   - `start.sh` - Iniciar sistema
   - `stop.sh` - Parar sistema
   - `backup.sh` - Fazer backup
   - `restore.sh` - Restaurar de backup

## ⚡ Performance

- **Frontend Dev:** Hot reload ativado (bom para desenvolvimento)
- **Frontend Prod:** Build estático servido por Nginx (rápido para produção)
- **Backend:** Configurado para produção (APP_ENV=production)
- **Startup:** ~30-60 segundos
- **Recursos:** MySQL + Redis + Backend + 2x Frontend ≈ 2-3GB RAM

## 🔄 Fluxo de Trabalho Recomendado

### Início do Dia
```bash
./start.sh
# Sistema pronto para uso
```

### Durante o Dia
```bash
# Monitorar logs
docker-compose logs -f

# Testar serviços
docker-compose ps

# Executar migrations
docker-compose exec backend php artisan migrate
```

### Antes de Grandes Mudanças
```bash
./backup.sh
# Sistema está seguro
```

### Final do Dia
```bash
./stop.sh
# Sistema parado, banco preservado
```

### Se Algo Deu Errado
```bash
./restore.sh
# Selecione o backup desejado
# Sistema restaurado
```

## 📖 Documentação Completa

Para mais detalhes sobre cada script, consulte: `SCRIPTS.md`
