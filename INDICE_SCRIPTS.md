# 📖 ÍNDICE DE SCRIPTS - Bruno Cakes

## 🚀 Scripts de Gerenciamento do Sistema

| Script | Tamanho | Funcionalidade | Uso |
|--------|---------|---------------|----|
| **start.sh** | 1.4K | Inicia sistema completo | `./start.sh` |
| **stop.sh** | 882B | Para todos os containers | `./stop.sh` |
| **backup.sh** | 1.3K | Faz backup do banco e código | `./backup.sh` |
| **restore.sh** | 3.2K | Restaura de backup anterior | `./restore.sh` |
| **restore_filiais.sh** | 5.2K | Restaura e migra para filiais | `./restore_filiais.sh brunocakes.sql` |
| **test.sh** | 2.0K | Valida configuração sistema | `./test.sh` |

---

## 📋 Descrição Detalhada

### ▶️ start.sh
**Inicia o sistema completo**
```bash
./start.sh
```

**O que faz:**
- Para containers anteriores
- Constrói imagens Docker
- Inicia todos os serviços
- Aguarda banco ficar pronto
- Executa migrations
- Exibe status final

**Resultado:**
- Sistema pronto em ~1-2 minutos
- Acesso: https://localhost:8889

---

### ⏹️ stop.sh
**Para o sistema sem deletar dados**
```bash
./stop.sh
```

**O que faz:**
- Para todos os containers
- Remove containers (preserva volumes)
- Oferece opção de limpar imagens
- Banco de dados intacto

**Resultado:**
- Sistema offline
- Dados preservados
- Pronto para restart com `./start.sh`

---

### 💾 backup.sh
**Faz backup completo do sistema**
```bash
./backup.sh
```

**O que faz:**
- Para containers
- Exporta banco de dados MySQL
- Compacta código do projeto
- Reinicia containers
- Salva em `./backups/`

**Resultado:**
- Arquivo: `backups/backup_YYYYMMDD_HHMMSS.tar.gz`
- Banco: `backups/db/brunocakes_TIMESTAMP.sql`

---

### 🔄 restore.sh
**Restaura de um backup anterior**
```bash
./restore.sh
```

**O que faz:**
- Lista backups disponíveis
- Pede confirmação
- Para containers
- Extrai backup
- Restaura banco de dados
- Reinicia sistema

**Resultado:**
- Sistema restaurado ao estado anterior
- Todos os dados preservados

---

### 🏢 restore_filiais.sh
**Restaura e migra para estrutura com filiais**
```bash
./restore_filiais.sh brunocakes.sql
```

**O que faz:**
1. Para containers
2. Limpa banco antigo
3. Importa SQL antigo
4. Executa migrations Laravel
5. Cria Filial Central (FIL001)
6. Vincula dados à filial
7. Cria estoques
8. Executa seeders

**Resultado:**
- Filial Central criada (FIL001)
- Todos os dados migrados
- Usuários, produtos, pedidos vinculados
- Estoques criados para cada produto

**Dados preenchidos automaticamente:**
- Filial: Filial Central
- Código: FIL001
- Email: central@brunocakes.com
- Endereço: Rua Principal, 100
- Cidade: São Gonçalo do Amarante
- Estado: RN

---

### ✅ test.sh
**Valida configuração do sistema**
```bash
./test.sh
```

**Verifica:**
- Sintaxe docker-compose.yml
- Presença de arquivos essenciais
- Scripts com permissão de execução
- Certificados SSL
- Integridade geral

**Resultado:**
- 11/11 testes (sucesso)
- ou detalhes de problemas

---

## 📚 Documentação Disponível

| Documento | Tamanho | Conteúdo |
|-----------|---------|----------|
| **RESTORE_FILIAIS.md** | 4.8K | Guia completo de restore com migração |
| **ESTRUTURA_FINAL.md** | 6.7K | Visão geral da arquitetura final |
| **SUMARIO_OTIMIZACOES.md** | 3.9K | Resumo das otimizações realizadas |
| **README.md** | 4.7K | Informações gerais do projeto |
| **DOCKER_SETUP.md** | 4.1K | Setup Docker original |
| **ARQUITETURA_FRONTEND.md** | 33K | Arquitetura detalhada do frontend |
| **RELATORIO_FINAL_PRODUCAO.md** | 11K | Relatório de produção |

---

## 🔄 Fluxos de Trabalho

### Desenvolvimento Normal
```bash
./start.sh          # Inicia sistema
# Desenvolver...
./stop.sh           # Para ao fim do dia
```

### Com Backup
```bash
./backup.sh         # Antes de grandes mudanças
./start.sh          # Usar sistema
# Se algo der errado:
./restore.sh        # Volta ao estado anterior
```

### Restaurar de Banco Antigo
```bash
# Copiar arquivo SQL antigo
cp /caminho/brunocakes.sql ./

# Restaurar e migrar para filiais
./restore_filiais.sh brunocakes.sql

# Sistema pronto com Filial Central
./start.sh
```

### Validação
```bash
./test.sh           # Sempre antes de usar
./start.sh          # Se OK
```

---

## 🎯 Checklist de Uso

### Primeira vez:
- [ ] `./test.sh` - Validar
- [ ] `./restore_filiais.sh brunocakes.sql` - Restaurar dados
- [ ] `./start.sh` - Iniciar
- [ ] Acessar: https://localhost:8889

### Dia a dia:
- [ ] `./start.sh` - Iniciar
- [ ] Trabalhar...
- [ ] `./stop.sh` - Parar

### Antes de mudanças importantes:
- [ ] `./backup.sh` - Fazer backup
- [ ] Fazer mudanças
- [ ] Se problema: `./restore.sh`

---

## 🆘 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Sistema não inicia | `./test.sh` depois `./start.sh` |
| Banco com erro | `./restore.sh` ou `./restore_filiais.sh` |
| Container travado | `docker compose down` depois `./start.sh` |
| Espaço em disco | `./stop.sh` depois `docker system prune -a` |
| Permissão negada | `chmod +x *.sh` |

---

## 📊 Resumo Rápido

```
Total de Scripts:      6 (todos otimizados)
Documentação:          7 arquivos completos
Teste de validação:   test.sh (11 testes)
Restore com filiais:  restore_filiais.sh

Status: ✅ 100% funcional
```

---

## 🔗 Próximos Passos

1. **Usar pela primeira vez:**
   ```bash
   ./restore_filiais.sh brunocakes.sql
   ```

2. **Ou sistema limpo:**
   ```bash
   ./start.sh
   ```

3. **Acessar:**
   ```
   Frontend: https://localhost:8889
   Backend:  http://localhost:81/api
   ```

---

*Índice de scripts - 7 de Março de 2026*
*Todos os scripts validados e testados ✓*
