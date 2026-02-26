<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Services\EvolutionApiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WhatsAppController extends Controller
{
    private EvolutionApiService $evolutionApi;

    public function __construct(EvolutionApiService $evolutionApi)
    {
        $this->evolutionApi = $evolutionApi;
    }

    /**
     * Criar/conectar instância do WhatsApp
     */
    public function connect(Request $request)
    {
        $admin = Auth::guard('sanctum')->user();
        
        if (!$admin) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        $request->validate([
            'branch_id' => 'required|exists:branches,id',
        ]);

        $branchId = $request->branch_id;

        // Verificar permissão
        if ($admin->role !== 'master' && $admin->branch_id !== $branchId) {
            return response()->json(['message' => 'Sem permissão para esta filial'], 403);
        }

        $branch = Branch::findOrFail($branchId);

    // Salvar nome da instância como 'whatsapp_filial_{id}' para evitar conflitos e garantir unicidade
    $instanceName = 'whatsapp_filial_' . $branch->id;

        // Se já existe instância, verificar estado
        if ($branch->whatsapp_instance_name) {
            // Verificar estado atual
            $state = $this->evolutionApi->connectionState($instanceName);
            
            if ($state['success'] && $state['state'] === 'open') {
                return response()->json([
                    'message' => 'WhatsApp já está conectado',
                    'status' => 'connected',
                    'number' => $branch->whatsapp_number,
                ]);
            }
            
            // Se não está conectada mas existe, deletar e recriar
            $this->evolutionApi->deleteInstance($instanceName);
        }
        
        // Criar ou recriar instância
        // Usar URL pública para webhook (Evolution API precisa acessar de fora do Docker)
        $webhookUrl = 'https://brunocake.zapsrv.com/api/webhooks/evolution/' . $branch->id;
        
        $result = $this->evolutionApi->createInstance($instanceName, $webhookUrl);

        if (!$result['success']) {
            return response()->json([
                'message' => 'Erro ao criar instância',
                'error' => $result['error'],
            ], 500);
        }

        // Salvar nome da instância SEMPRE (mesmo que o QR Code ainda não esteja pronto)
        $branch->update([
            'whatsapp_instance_name' => $instanceName,
            'whatsapp_status' => 'connecting',
        ]);

        // Tentar obter QR Code (com retry pois pode demorar alguns segundos)
        // Na Evolution API v2.3.6, o QR Code pode demorar para ser gerado
        $qrCode = null;
        $maxRetries = 15; // Aumentado para 15 tentativas
        
        for ($i = 0; $i < $maxRetries; $i++) {
            if ($i > 0) {
                sleep(2); // Aguardar 2 segundos entre tentativas  
            }
            
            $qrCode = $this->evolutionApi->fetchQrCode($instanceName);
            
            if ($qrCode['success'] && !empty($qrCode['qrcode'])) {
                break;
            }
        }

        // Se ainda não tiver QR Code, retornar mensagem para tentar novamente
        if (!$qrCode || !$qrCode['success'] || empty($qrCode['qrcode'])) {
            return response()->json([
                'message' => 'Instância criada. O QR Code está sendo gerado, por favor aguarde alguns segundos e clique em "Atualizar Status"',
                'error' => 'QR Code ainda não disponível',
                'instance_name' => $instanceName,
                'status' => 'connecting',
                'retry' => true,
            ], 202); // 202 Accepted - processando
        }

        return response()->json([
            'message' => 'QR Code gerado com sucesso',
            'qrcode' => $qrCode['qrcode'],
            'instance_name' => $instanceName,
            'status' => 'connecting',
        ]);
    }

    /**
     * Buscar QR Code de uma instância existente
     */
    public function getQrCode(Request $request, $branchId)
    {
        $admin = Auth::guard('sanctum')->user();
        
        if (!$admin) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        // Verificar permissão
        if ($admin->role !== 'master' && $admin->branch_id != $branchId) {
            return response()->json(['message' => 'Sem permissão'], 403);
        }

        $branch = Branch::findOrFail($branchId);

        if (!$branch->whatsapp_instance_name) {
            return response()->json([
                'message' => 'Nenhuma instância configurada',
                'error' => 'Instância não encontrada',
            ], 404);
        }

        $qrCode = $this->evolutionApi->fetchQrCode($branch->whatsapp_instance_name);

        if (!$qrCode['success'] || empty($qrCode['qrcode'])) {
            return response()->json([
                'message' => 'QR Code ainda não disponível',
                'error' => 'Aguarde alguns segundos e tente novamente',
                'retry' => true,
            ], 202);
        }

        return response()->json([
            'message' => 'QR Code obtido com sucesso',
            'qrcode' => $qrCode['qrcode'],
            'instance_name' => $branch->whatsapp_instance_name,
            'status' => 'connecting',
        ]);
    }

    /**
     * Verificar status da conexão
     */
    public function status(Request $request, $branchId)
    {
        $admin = Auth::guard('sanctum')->user();
        
        if (!$admin) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        // Verificar permissão
        if ($admin->role !== 'master' && $admin->branch_id != $branchId) {
            return response()->json(['message' => 'Sem permissão'], 403);
        }

        $branch = Branch::findOrFail($branchId);

        if (!$branch->whatsapp_instance_name) {
            return response()->json([
                'status' => 'disconnected',
                'number' => null,
                'connected_at' => null,
                'instance_name' => null,
            ]);
        }

        $state = $this->evolutionApi->connectionState($branch->whatsapp_instance_name);

        // Log completo do estado para debug
        \Log::info('WhatsApp Status Check', [
            'branch_id' => $branchId,
            'instance_name' => $branch->whatsapp_instance_name,
            'state_response' => $state,
        ]);

        // Se houve erro na comunicação com a API, retornar status atual do banco
        if (!$state['success']) {
            \Log::warning('Erro ao consultar Evolution API, retornando status do banco', [
                'branch_id' => $branchId,
                'error' => $state['error'] ?? 'Unknown',
            ]);
            
            return response()->json([
                'status' => $branch->whatsapp_status ?? 'disconnected',
                'number' => $branch->whatsapp_number,
                'connected_at' => $branch->whatsapp_connected_at,
                'instance_name' => $branch->whatsapp_instance_name,
                'warning' => 'Status do banco de dados (Evolution API indisponível)',
            ]);
        }

        $status = 'disconnected';
        if ($state['state'] === 'open') {
            $status = 'connected';
        } elseif ($state['state'] === 'connecting') {
            $status = 'connecting';
        }

        // Atualizar banco de dados sempre que conectado
        if ($status === 'connected') {
            $updateData = ['whatsapp_status' => $status];
            
            // Sempre atualizar connected_at quando conectado
            if (!$branch->whatsapp_connected_at) {
                $updateData['whatsapp_connected_at'] = now();
            }
            
            // Tentar extrair número de várias formas
            $phoneNumber = null;
            if (isset($state['instance']['owner'])) {
                $phoneNumber = $state['instance']['owner'];
            } elseif (isset($state['instance']['instanceName'])) {
                // Se o nome da instância for o número
                $phoneNumber = $state['instance']['instanceName'];
            }
            
            // Limpar formato do número (remover @s.whatsapp.net se tiver)
            if ($phoneNumber && str_contains($phoneNumber, '@')) {
                $phoneNumber = explode('@', $phoneNumber)[0];
            }
            
            if ($phoneNumber && $phoneNumber !== $branch->whatsapp_number) {
                $updateData['whatsapp_number'] = $phoneNumber;
            }

            $branch->update($updateData);
            
            \Log::info('WhatsApp status updated to connected', [
                'branch_id' => $branchId,
                'number' => $phoneNumber,
            ]);
        } elseif ($status !== $branch->whatsapp_status) {
            // Atualizar apenas status se mudou
            $updateData = ['whatsapp_status' => $status];
            
            // Se desconectou, limpar dados
            if ($status === 'disconnected') {
                $updateData['whatsapp_connected_at'] = null;
            }

            $branch->update($updateData);
        }

        return response()->json([
            'status' => $status,
            'number' => $branch->whatsapp_number,
            'connected_at' => $branch->whatsapp_connected_at,
            'instance_name' => $branch->whatsapp_instance_name,
        ]);
    }

    /**
     * Desconectar WhatsApp
     */
    public function disconnect(Request $request, $branchId)
    {
        $admin = Auth::guard('sanctum')->user();
        
        if (!$admin) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        // Verificar permissão
        if ($admin->role !== 'master' && $admin->branch_id != $branchId) {
            return response()->json(['message' => 'Sem permissão'], 403);
        }

        $branch = Branch::findOrFail($branchId);

        if (!$branch->whatsapp_instance_name) {
            return response()->json(['message' => 'Nenhuma instância configurada'], 400);
        }

        $result = $this->evolutionApi->logout($branch->whatsapp_instance_name);

        if (!$result['success']) {
            return response()->json([
                'message' => 'Erro ao desconectar',
                'error' => $result['error'],
            ], 500);
        }

        // Atualizar status
        $branch->update([
            'whatsapp_status' => 'disconnected',
            'whatsapp_number' => null,
            'whatsapp_connected_at' => null,
        ]);

        return response()->json([
            'message' => 'WhatsApp desconectado com sucesso',
            'status' => 'disconnected',
        ]);
    }

    /**
     * Obter novo QR Code
     */
    public function refreshQrCode(Request $request, $branchId)
    {
        $admin = Auth::guard('sanctum')->user();
        
        if (!$admin) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        // Verificar permissão
        if ($admin->role !== 'master' && $admin->branch_id != $branchId) {
            return response()->json(['message' => 'Sem permissão'], 403);
        }

        $branch = Branch::findOrFail($branchId);

        // Se não tem instância configurada, criar uma nova
        if (!$branch->whatsapp_instance_name) {
            $instanceName = "branch_{$branch->code}_" . time();
            $webhookUrl = 'https://brunocake.zapsrv.com/api/webhooks/evolution/' . $branch->id;
            
            $result = $this->evolutionApi->createInstance($instanceName, $webhookUrl);

            if (!$result['success']) {
                return response()->json([
                    'message' => 'Erro ao criar instância',
                    'error' => $result['error'],
                ], 500);
            }

            // Salvar nome da instância
            $branch->whatsapp_instance_name = $instanceName;
            $branch->whatsapp_status = 'connecting';
            $branch->save();
        }

        $qrCode = $this->evolutionApi->fetchQrCode($branch->whatsapp_instance_name);

        if (!$qrCode['success']) {
            return response()->json([
                'message' => 'Erro ao gerar QR Code',
                'error' => $qrCode['error'],
            ], 500);
        }

        return response()->json([
            'message' => 'QR Code atualizado',
            'qrcode' => $qrCode['qrcode'],
        ]);
    }
}
