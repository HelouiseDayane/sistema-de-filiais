# Limpa todas as chaves de reserva global e por filial
if docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" --scan --pattern 'product_reserved_*' | xargs -r docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" del; then
  echo "Reservas globais e por filial removidas."
else
  echo "Falha ao remover reservas globais e por filial."
fi
#!/bin/bash
# Limpa todas as reservas e estoques do Redis (forçado)

REDIS_CONTAINER=redis
REDIS_PASSWORD='cakes12345671571285415715715785421478214782171285742557'

# Limpa todas as chaves de reserva
if docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" --scan --pattern 'reserve:*' | xargs -r docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" del; then
  echo "Reservas removidas."
else
  echo "Falha ao remover reservas."
fi

# Limpa todas as chaves de estoque
if docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" --scan --pattern 'product_stock_*' | xargs -r docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" del; then
  echo "Estoques removidos."
else
  echo "Falha ao remover estoques."
fi

# Limpa todas as chaves de reservado
if docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" --scan --pattern 'product_reserved_*' | xargs -r docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" del; then
  echo "Reservados removidos."
else
  echo "Falha ao remover reservados."
fi

# Limpa todas as chaves de tempo de reserva
if docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" --scan --pattern 'product_reserved_time_*' | xargs -r docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" del; then
  echo "Tempos de reserva removidos."
else
  echo "Falha ao remover tempos de reserva."
fi

# Limpa todas as chaves de carrinho
if docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" --scan --pattern 'cart:*' | xargs -r docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" del; then
  echo "Carrinhos removidos."
else
  echo "Falha ao remover carrinhos."
fi

echo "Redis limpo!"
