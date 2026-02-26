<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Branch;
use App\Services\EvolutionApiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use App\Jobs\SyncStockJob;
use App\Events\StockUpdated;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;


class PaymentWebhookController extends Controller
{

    public function notify(Request $request)
    {
        // Log detalhado de todos os dados recebidos (apenas query string)
        

        // Exige payment_id e random_key
        $paymentId = $request->get('payment_id');
        $randomKey = $request->get('random_key');
        $status = $request->get('status'); // paid, failed, pending

        if (!$paymentId || !$randomKey) {
            return response()->json(['error' => 'payment_id e random_key são obrigatórios'], 400);
        }

        $payment = Payment::with('order.items')->find($paymentId);
        if (!$payment) {
            return response()->json(['error' => 'Pagamento não encontrado'], 404);
        }
        $order = $payment->order;
        if (!$order) {
            return response()->json(['error' => 'Pedido não encontrado'], 404);
        }

        // Log detalhado para depuração da random_key

        // Validação: payment_id e random_key devem bater com o mesmo pedido
        if (trim((string)$randomKey) !== trim((string)$order->payment_reference)) {
            return response()->json(['error' => 'Chave de validação inválida'], 403);
        }

        // Se status for "paid", confirma o pedido
        if ($status === 'paid') {
            $this->finalizeOrder($order, $payment);
        } elseif ($status === 'failed') {
            $this->revertOrderStock($order, $payment);
        }

        $order->refresh();
        $payment->refresh();

        return response()->json([
            'message' => 'Webhook processed',
            'order_status' => $order->status,
            'payment_status' => $payment->status,
            'order_id' => $order->id,
            'payment_id' => $payment->id
        ]);
    }


    public function gerarPixPagamento($orderId, $randomKey = null, $descricao = null)
    {
    $order = Order::with('items')->findOrFail($orderId);
    // Se não veio a chave, usa a do pedido
    $randomKey = $randomKey ?: $order->payment_reference;

    // Calcular o valor total
    $valorTotal = $order->items->sum(fn($item) => (float)$item->total_price);

    // Pega o payment
    $payment = Payment::where('order_id', $order->id)->firstOrFail();
    $paymentId = $payment->id;

    // Se $descricao vier do CheckoutController, usa ele. Senão, monta padrão.
    if (!$descricao) {
        $descricao .= "==============================\n";
        $nomeCliente = mb_strimwidth($order->customer_name, 0, 32);
        $descricao .= "BRUNO CAKE\n";
        $descricao .= "==============================\n";
        // Sempre mostra ID antes do pagamento aprovado
        $descricao .= "Pedido: ID: " . str_pad($order->id, 6, '0', STR_PAD_LEFT) . "\n";
        $descricao .= "Nome: $nomeCliente\n";
        $descricao .= "Tel: {$order->customer_phone}\n";
        $descricao .= "------------------------------\n";
        foreach ($order->items as $item) {
            $nomeProduto = mb_strimwidth($item->product_name, 0, 28);
            $descricao .= "Item: $nomeProduto\n";
            $descricao .= "Qtd: {$item->quantity}  Vlr: R$" . number_format($item->total_price, 2, ',', '') . "\n";
        }
        $descricao .= "------------------------------\n";
        $descricao .= "Pedido: R$" . number_format($valorTotal, 2, ',', '') . "\n";
        $descricao .= "Total:  R$" . number_format($valorTotal, 2, ',', '') . "\n";
        $descricao .= "Pagamento: {$order->payment_method}\n";
        $descricao .= "Retirada no local.\n";
        $descricao .= "==============================\n\n\n\n";
        $descricao .= strtoupper("Já recebi o seu pedido! 🙌\nAssim que ele estiver pronto pra ser retirado, eu te aviso, tá bom?\n\nVolto já com a confirmação! 🍰\n");
    }


        $produtos = [];
        foreach ($order->items as $item) {
            $produtos[] = [
                'id' => $item->product_id,
                'nome' => $item->product_name,
                'quantidade' => $item->quantity,
                'preco' => $item->unit_price,
                'total' => $item->total_price,
            ];
        }

        // Extrai telefone
        $ddd = null;
        $numero = preg_replace('/\D/', '', $order->customer_phone ?? '');
        if (preg_match('/^(\d{2})(\d+)$/', $numero, $matches)) {
            $ddd = $matches[1];
            $numero = $matches[2];
        }

        // Gerar SKU único (igual ao exemplo)
        $sku = 'TORA' . $order->id . '-' . strtoupper(\Str::random(12));

        // Pega sobrenome se existir
        $nomeParts = explode(' ', trim($order->customer_name));
        $ultNome = count($nomeParts) > 1 ? array_pop($nomeParts) : 'Integrado';

        // E-mail padrão se não houver
        $emailCliente = $order->customer_email ?: 'BRUNO_CAKE-DELIVERY@system.com';

        // Só no retorno/finalização, usa REF
        $referencia_externa = ($payment->status === 'paid')
            ? "REF-" . strtoupper(str_pad(dechex($order->id), 6, '0', STR_PAD_LEFT))
            : "ID: " . str_pad($order->id, 6, '0', STR_PAD_LEFT);

        // Definir URL de notificação do backend
        $url_notificacao = url('/api/payment/webhook');

        $branch = Branch::find($order->branch_id);
        $accessTokenVendedor = $branch->pix_access_token ?? "APP_USR-2954630391946213-092218-3c911573cc885ff46d176fd1e56b3a10-41047718";
        $urlNotificacao = $branch->pix_webhook_url ?? $url_notificacao;

        $payload = [
            "random_key" => $randomKey,
            "valor" => (string)number_format($valorTotal, 2, '.', ''),
            "titulo" => "Bruno Miranda Cake",
            "descricao" => (string)$descricao,
            "produtos" => $produtos,
            "referencia_externa" => $referencia_externa,
            "SKU" => $sku,
            "NomeCliente" => (string)$order->customer_name,
            "UltNomeCliente" => $ultNome,
            "email_cliente" => $emailCliente,
            "DDD_Cliente" => (string)$ddd,
            "Tel_Cliente" => (string)$numero,
            "tipo_notificacao" => "JSON",
            "url_notificacao" => (string)$urlNotificacao,
            "texto" => "Pagamento realizado com sucesso!",
            "access_token_plataforma" => "APP_USR-2954630391946213-092217-6b5cdbe01a967e4debb13f09bac7b210-672482120",
            "access_token_vendedor" => $accessTokenVendedor,
        ];


        // Log detalhado do payload serializado para debug
        Log::info('PIX payload enviado para API externa', ['payload' => $payload]);
        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json'
            ])->post('https://01.zapsrv.com/zap_request/delivery/mppix/', $payload);
            Log::info('Resposta da API PIX', ['status' => $response->status(), 'body' => $response->body()]);
        } catch (\Exception $e) {
            Log::error('Erro ao chamar API PIX', ['error' => $e->getMessage(), 'payload' => $payload]);
            return response()->json([
                'message' => 'Erro ao processar pagamento PIX',
                'error' => $e->getMessage()
            ], 500);
        }

        // 📱 Enviar QR Code PIX via WhatsApp da filial conectada
        try {
            $this->sendPixToCustomer($order, $response->json());
        } catch (\Exception $e) {
            Log::error('Erro ao enviar PIX via WhatsApp', ['error' => $e->getMessage()]);
        }

        if ($response->successful()) {
            // Chama o método notify internamente, sem depender de endpoint externo
            try {
                $notifyRequest = new \Illuminate\Http\Request([
                    'payment_id' => $paymentId,
                    'random_key' => $randomKey,
                    'status' => 'paid',
                ]);
                $this->notify($notifyRequest);
            } catch (\Exception $e) {
                Log::error('Erro ao notificar pagamento PIX', ['error' => $e->getMessage()]);
            }
        }

        $pixResponse = $response->json();
        Log::info('PIX API response completa', ['pixResponse' => $pixResponse]);
        // Corrigir mapeamento dos campos
        $pixQrCodeBase64 = $pixResponse['QrCode'] ?? $pixResponse['qr_code'] ?? $pixResponse['qrcode'] ?? null;
        $pixCopiaECola = $pixResponse['codePIX'] ?? $pixResponse['pix_copia_e_cola'] ?? $pixResponse['qrcode_text'] ?? null;

        return response()->json([
            'message' => 'Pedido e pagamento PIX criados com sucesso',
            'order_id' => $order->id,
            'payment_id' => $paymentId,
            'pix_qr_code_base64' => $pixQrCodeBase64,
            'pix_copia_e_cola' => $pixCopiaECola,
            'response_api' => $pixResponse,
        ]);
    }



    private function finalizeOrder($order, $payment)
    {
        // Atualiza status do pagamento
        $payment->update(['status' => 'paid']);
        // Atualiza status do pedido
        $order->update([
            'status' => 'confirmed',
            'stock_reserved' => false
        ]);

        // Dispara evento de atualização de status do pedido
        broadcast(new \App\Events\OrderStatusUpdated($order));

        // Remove definitivamente do estoque (Redis e MySQL) - por filial
        foreach ($order->items as $item) {
            $branchId = $order->branch_id;
            // Remove do estoque no Redis (já estava reservado, agora remove definitivo)
            $stockKey = "product_stock_{$branchId}_{$item->product_id}";
            Redis::connection('stock')->decrby($stockKey, $item->quantity);
            
            // Atualiza MySQL (product_stocks)
            DB::table('product_stocks')
                ->where('product_id', $item->product_id)
                ->where('branch_id', $branchId)
                ->decrement('quantity', $item->quantity);
            
            // ✅ Dispara evento de atualização de estoque
            broadcast(new StockUpdated($item->product_id, 'stock_decreased'));
            
            // Sincroniza Redis com MySQL
            dispatch(new SyncStockJob($item->product_id, $branchId));
        }
        
        // 📢 Envia notificação via WhatsApp para o admin da filial
        $this->sendWhatsAppNotification($order, $payment);
    }

    private function revertOrderStock($order, $payment)
    {
        // Atualiza status do pagamento
        $payment->update(['status' => 'failed']);
        
        // Atualiza status do pedido
        $order->update([
            'status' => 'canceled',
            'stock_reserved' => false
        ]);

        // Reverte estoque (Redis e MySQL) - por filial
        foreach ($order->items as $item) {
            $branchId = $order->branch_id;
            
            // Remove do reservado no Redis (por filial)
            $reservedKey = "product_reserved_{$branchId}_{$item->product_id}";
            $currentReserved = Redis::connection('stock')->get($reservedKey) ?? 0;
            $newReserved = max(0, $currentReserved - $item->quantity);
            Redis::connection('stock')->set($reservedKey, $newReserved);

            // Adiciona de volta ao estoque disponível no Redis (por filial)
            $stockKey = "product_stock_{$branchId}_{$item->product_id}";
            Redis::incrby($stockKey, $item->quantity);

            // Atualiza MySQL (product_stocks)
            DB::table('product_stocks')
                ->where('product_id', $item->product_id)
                ->where('branch_id', $branchId)
                ->increment('quantity', $item->quantity);

            // ✅ Dispara evento de atualização de estoque
            broadcast(new StockUpdated($item->product_id, 'stock_increased'));

            // Sincroniza Redis com MySQL
            dispatch(new SyncStockJob($item->product_id, $branchId));

            // Log detalhado
        }
    }
    
    /**
     * Envia QR Code PIX para o cliente via WhatsApp da filial
     */
    private function sendPixToCustomer($order, $pixResponse)
    {
        try {
            // Buscar filial com WhatsApp conectado
            $branch = Branch::find($order->branch_id);
            
            if (!$branch || !$branch->whatsapp_instance_name || $branch->whatsapp_status !== 'connected') {
                Log::warning('WhatsApp não conectado para enviar PIX ao cliente', [
                    'branch_id' => $order->branch_id,
                    'order_id' => $order->id,
                ]);
                return;
            }
            
            // Extrair número do cliente (limpar formatação)
            $numeroCliente = preg_replace('/\D/', '', $order->customer_phone);
            
            // Montar mensagem com QR Code
            $valorTotal = $order->items->sum(fn($item) => (float)$item->total_price);
            $referencia = "ID: " . str_pad($order->id, 6, '0', STR_PAD_LEFT);
            
            $mensagem = "🎂 *BRUNO CAKE*\n\n";
            $mensagem .= "Olá, *{$order->customer_name}*! 👋\n\n";
            $mensagem .= "Já recebi o seu pedido! 🙌\n\n";
            $mensagem .= "━━━━━━━━━━━━━━━━━━━━\n";
            $mensagem .= "📋 *Pedido:* {$referencia}\n";
            $mensagem .= "━━━━━━━━━━━━━━━━━━━━\n\n";
            
            // Itens do pedido
            $mensagem .= "🛍️ *Seus itens:*\n";
            foreach ($order->items as $item) {
                $mensagem .= "• {$item->quantity}x {$item->product_name}\n";
            }
            
            $mensagem .= "\n━━━━━━━━━━━━━━━━━━━━\n";
            $mensagem .= "💰 *Total:* R$ " . number_format($valorTotal, 2, ',', '.') . "\n";
            $mensagem .= "━━━━━━━━━━━━━━━━━━━━\n\n";
            
            // Se tiver QR Code no response, incluir
            if (isset($pixResponse['qr_code']) || isset($pixResponse['qrcode'])) {
                $qrCodeBase64 = $pixResponse['qr_code'] ?? $pixResponse['qrcode'] ?? null;
                $pixCopiaECola = $pixResponse['pix_copia_e_cola'] ?? $pixResponse['qrcode_text'] ?? null;
                
                $mensagem .= "📱 *Para pagar:*\n";
                $mensagem .= "1️⃣ Abra o app do seu banco\n";
                $mensagem .= "2️⃣ Escolha pagar com PIX\n";
                $mensagem .= "3️⃣ Escaneie o QR Code ou copie o código\n\n";
                
                if ($pixCopiaECola) {
                    $mensagem .= "📋 *Pix Copia e Cola:*\n";
                    $mensagem .= "`{$pixCopiaECola}`\n\n";
                }
            }
            
            $mensagem .= "Assim que o pagamento for confirmado, eu te aviso! ✅\n\n";
            $mensagem .= "🍰 *Retirada no local*";
            
            // Enviar via Evolution API
            $evolutionApi = app(EvolutionApiService::class);
            
            $result = $evolutionApi->sendTextMessage(
                $branch->whatsapp_instance_name,
                $numeroCliente,
                $mensagem
            );
            
            if ($result['success']) {
                Log::info('PIX enviado via WhatsApp para cliente', [
                    'order_id' => $order->id,
                    'customer_phone' => $numeroCliente,
                    'branch_id' => $branch->id,
                ]);
                
                // Se tiver QR Code como imagem, enviar também
                if (isset($pixResponse['qr_code_base64'])) {
                    // TODO: Implementar envio de imagem se necessário
                }
            } else {
                Log::error('Erro ao enviar PIX via WhatsApp para cliente', [
                    'order_id' => $order->id,
                    'error' => $result['error'] ?? 'Unknown error',
                ]);
            }
            
        } catch (\Exception $e) {
            Log::error('Exceção ao enviar PIX via WhatsApp', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
    
    /**
     * Envia notificação via WhatsApp para o admin da filial
     */
    private function sendWhatsAppNotification($order, $payment)
    {
        try {
            // Buscar filial com WhatsApp conectado
            $branch = Branch::find($order->branch_id);
            
            if (!$branch || !$branch->whatsapp_instance_name || $branch->whatsapp_status !== 'connected') {
                Log::warning('WhatsApp não conectado para a filial', [
                    'branch_id' => $order->branch_id,
                    'whatsapp_status' => $branch->whatsapp_status ?? 'no_branch',
                ]);
                return;
            }
            
            // Calcular valor total
            $valorTotal = $order->items->sum(fn($item) => (float)$item->total_price);
            
            // Gerar REF do pedido
            $referencia = "REF-" . strtoupper(str_pad(dechex($order->id), 6, '0', STR_PAD_LEFT));
            
            // URL do pedido no frontend
            $urlPedido = "https://brunocake.zapsrv.com/admin/orders?id={$order->id}";
            
            // Montar mensagem
            $mensagem = "🎉 *NOVO PEDIDO CONFIRMADO!*\n\n";
            $mensagem .= "━━━━━━━━━━━━━━━━━━━━\n";
            $mensagem .= "📋 *Pedido:* {$referencia}\n";
            $mensagem .= "👤 *Cliente:* {$order->customer_name}\n";
            $mensagem .= "📱 *Telefone:* {$order->customer_phone}\n";
            $mensagem .= "━━━━━━━━━━━━━━━━━━━━\n\n";
            
            // Itens do pedido
            $mensagem .= "🛍️ *Itens do Pedido:*\n";
            foreach ($order->items as $item) {
                $mensagem .= "• {$item->quantity}x {$item->product_name}\n";
                $mensagem .= "  R$ " . number_format($item->total_price, 2, ',', '.') . "\n";
            }
            
            $mensagem .= "\n━━━━━━━━━━━━━━━━━━━━\n";
            $mensagem .= "💰 *Total:* R$ " . number_format($valorTotal, 2, ',', '.') . "\n";
            $mensagem .= "💳 *Pagamento:* {$order->payment_method}\n";
            $mensagem .= "✅ *Status:* Pagamento Confirmado\n";
            $mensagem .= "━━━━━━━━━━━━━━━━━━━━\n\n";
            
            $mensagem .= "🔗 Ver pedido: {$urlPedido}\n\n";
            $mensagem .= "⏰ " . now()->format('d/m/Y H:i');
            
            // Enviar via Evolution API
            $evolutionApi = app(EvolutionApiService::class);
            
            // Número do WhatsApp da filial (usar o número conectado)
            $numeroDestino = $branch->whatsapp_number;
            
            $result = $evolutionApi->sendTextMessage(
                $branch->whatsapp_instance_name,
                $numeroDestino,
                $mensagem
            );
            
            if ($result['success']) {
                Log::info('Notificação WhatsApp enviada com sucesso', [
                    'order_id' => $order->id,
                    'branch_id' => $branch->id,
                    'whatsapp_number' => $numeroDestino,
                ]);
            } else {
                Log::error('Erro ao enviar notificação WhatsApp', [
                    'order_id' => $order->id,
                    'error' => $result['error'] ?? 'Unknown error',
                ]);
            }
            
        } catch (\Exception $e) {
            Log::error('Exceção ao enviar notificação WhatsApp', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}