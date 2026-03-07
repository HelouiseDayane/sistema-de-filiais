# 📋 RESTORE com Migração para Filiais

## 🎯 O que este script faz

Restaura dados do banco de dados antigo e os migra automaticamente para a nova estrutura com suporte a múltiplas filiais, criando a **Filial Central (FIL001)**.

### Dados que são migrados:
- ✅ Usuários (vinculados à Filial Central)
- ✅ Produtos (vinculados à Filial Central)
- ✅ Pedidos (vinculados à Filial Central)
- ✅ Endereços (vinculados à Filial Central)
- ✅ Estoques (criados para cada produto)
- ✅ Transações e históricos

### Dados que são criados automaticamente:
- ✅ Filial Central (FIL001) com dados padrão
- ✅ Usuário admin (se não existir)
- ✅ Configurações de loja padrão
- ✅ Estoques para todos os produtos

---

## 🚀 Como usar

### Requisito:
Arquivo SQL do banco antigo (`brunocakes.sql`)

### Passo 1: Preparar o arquivo SQL
Coloque o arquivo SQL na raiz do projeto:
```bash
# Copiar arquivo para a raiz
cp /caminho/do/backup.sql ./brunocakes.sql
```

### Passo 2: Executar o restore
```bash
./restore_filiais.sh brunocakes.sql
```

### Ou com arquivo em outro diretório:
```bash
./restore_filiais.sh ./backups/backup_antigo.sql
```

---

## 📊 Filial Central - FIL001

### Dados padrão criados:
| Campo | Valor |
|-------|-------|
| **Código** | FIL001 |
| **Nome** | Filial Central |
| **Email** | central@brunocakes.com |
| **Telefone** | (84) 99999-9999 |
| **Status** | Ativo |
| **Endereço** | Rua Principal, 100 |
| **Cidade** | São Gonçalo do Amarante |
| **Estado** | RN |

### Atualizar após restore:
```bash
# Acessar admin
# https://localhost:8889

# Ir para: Admin → Filiais → FIL001
# Editar dados da filial conforme necessário
```

---

## 🔐 Usuários

### Admin criado automaticamente:
- **Email**: admin@brunocakes.com
- **Role**: admin
- **Acesso**: Filial Central (FIL001)

### Usuários existentes:
- Mantidos com seus dados originais
- Vinculados à Filial Central
- Role atualizado para 'user' ou 'admin' conforme necessário

---

## 📦 Estoque

### Criação automática:
Para cada produto no banco antigo:
- Quantidade: migrada do campo `stock`
- Reservado: 0
- Filial: FIL001

Você pode ajustar depois:
```bash
# Acessar admin → Produtos → [Produto] → Estoque por Filial
```

---

## ⚠️ Importante

### Backup anterior:
O script fará um backup automático antes de restaurar:
```bash
./backup.sh  # Antes de rodar restore_filiais.sh
```

### Confirmar operação:
O script pedirá confirmação antes de apagar dados:
```
Deseja continuar? (s/N)
```

### Rollback:
Se algo der errado, restaure do backup anterior:
```bash
./restore.sh
```

---

## 🔄 Passo a passo do script

```
1. ✓ Parar containers
2. ✓ Limpar banco antigo
3. ✓ Criar banco novo
4. ✓ Importar SQL antigo
5. ✓ Executar migrations Laravel
6. ✓ Criar Filial Central (FIL001)
7. ✓ Vincular usuarios à filial
8. ✓ Vincular produtos à filial
9. ✓ Vincular pedidos à filial
10. ✓ Vincular enderecos à filial
11. ✓ Criar estoques
12. ✓ Executar seeders
13. ✓ Exibir resumo
```

---

## 📈 Verificar migração

Após o restore, verifique no admin:
```
https://localhost:8889/admin
```

Você verá:
- ✅ Filial Central ativa
- ✅ Todos os produtos com estoque
- ✅ Todos os pedidos vinculados
- ✅ Todos os usuários com acesso

---

## 🆘 Troubleshooting

### Erro: "Arquivo não encontrado"
```bash
# Certifique-se que o arquivo existe
ls -la brunocakes.sql

# Use caminho completo se necessário
./restore_filiais.sh /caminho/completo/brunocakes.sql
```

### Erro: "MySQL não respondendo"
```bash
# Verifique se containers estão rodando
docker compose ps

# Ou recomece
docker compose down
./restore_filiais.sh brunocakes.sql
```

### Erro: "Permissão negada"
```bash
# Dar permissão de execução
chmod +x restore_filiais.sh

# Ou rodar com bash
bash restore_filiais.sh brunocakes.sql
```

---

## 📚 Scripts relacionados

| Script | Função |
|--------|--------|
| `./start.sh` | Inicia sistema normalmente |
| `./stop.sh` | Para sistema |
| `./backup.sh` | Faz backup completo |
| `./restore.sh` | Restaura de backup anterior |
| `./restore_filiais.sh` | Restaura e migra para filiais |

---

## 📝 Próximas ações após restore

1. **Ajustar Filial Central**:
   - Ir para Admin → Filiais → FIL001
   - Preencher dados bancários se necessário
   - Preencher dados de PIX se houver

2. **Verificar Produtos**:
   - Admin → Produtos
   - Verificar se todos foram importados
   - Ajustar estoques se necessário

3. **Verificar Pedidos**:
   - Admin → Pedidos
   - Confirmar que todos foram migrados

4. **Criar mais Filiais**:
   - Admin → Filiais → Novo
   - Adicionar code único (ex: FIL002, FIL003)
   - Produtos e estoques já estarão disponíveis

---

*Última atualização: 7 de Março de 2026*
