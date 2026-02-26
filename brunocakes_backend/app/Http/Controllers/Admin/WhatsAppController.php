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

    // Usar nome da filial como nome da instância (slug)
    // Usar nome da filial como nome da instância (slug)
    $instanceName = \Illuminate\Support\Str::slug($branch->name, '_');
    if (empty($instanceName)) {
        $instanceName = 'filial_' . $branch->id;
    }

        $webhookUrl = 'https://brunocake.zapsrv.com/api/webhooks/evolution/' . $branch->id;
        if ($branch->whatsapp_instance_name) {
            // Log removido
        } else {
            // Log removido
        }
        $result = $this->evolutionApi->createInstance($instanceName, $webhookUrl);
        // Se o erro for 'already in use', tratar como sucesso (instância já existe)
        if (!$result['success']) {
            $alreadyExists = false;
            $body = null;
            if (isset($result['body'])) {
                $body = $result['body'];
                if (is_string($body)) {
                    $body = json_decode($body, true);
                }
            }
            if (
                is_array($body) && isset($body['response']['message'][0]) &&
                (str_contains($body['response']['message'][0], 'already in use') || str_contains($body['response']['message'][0], 'is already in use'))
            ) {
                $alreadyExists = true;
            }
            if (!$alreadyExists) {
                // Log removido
                return response()->json([
                    'message' => 'Erro ao criar/editar instância',
                    'error' => $result['error'],
                ], 500);
            } else {
                // Log removido
            }
        }
        $branch->update([
            'whatsapp_instance_name' => $instanceName,
            'whatsapp_status' => 'connecting',
        ]);

        // Tentar obter QR Code (com retry pois pode demorar alguns segundos)
        // Log removido
        $qrCode = null;
        $maxRetries = 15;
        for ($i = 0; $i < $maxRetries; $i++) {
            if ($i > 0) {
                sleep(2);
            }
            $qrCode = $this->evolutionApi->fetchQrCode($instanceName);
            if ($qrCode['success'] && !empty($qrCode['qrcode'])) {
                // Log removido
                break;
            }
        }
        if (!$qrCode || !$qrCode['success'] || empty($qrCode['qrcode'])) {
            // Log removido
            return response()->json([
                'message' => 'Instância criada. O QR Code está sendo gerado, por favor aguarde alguns segundos e clique em "Atualizar Status"',
                'error' => 'QR Code ainda não disponível',
                'instance_name' => $instanceName,
                'status' => 'connecting',
                'retry' => true,
            ], 202);
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
        // Log removido

        // Se houve erro na comunicação com a API, retornar status atual do banco
        if (!$state['success']) {
            // Log removido
            // Prioriza status salvo no banco, não sobrescreve para 'disconnected' se já estava 'connected'
            $statusBanco = $branch->whatsapp_status ?? 'disconnected';
            return response()->json([
                'status' => $statusBanco,
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
            // Extrair número do owner, nunca sobrescrever whatsapp_instance_name
            $phoneNumber = null;
            if (isset($state['instance']['owner'])) {
                $phoneNumber = $state['instance']['owner'];
            }
            // Limpar formato do número (remover @s.whatsapp.net se tiver)
            if ($phoneNumber && str_contains($phoneNumber, '@')) {
                $phoneNumber = explode('@', $phoneNumber)[0];
            }
            if ($phoneNumber && $phoneNumber !== $branch->whatsapp_number) {
                $updateData['whatsapp_number'] = $phoneNumber;
            }
            // Nunca sobrescrever whatsapp_instance_name, sempre manter nome da filial
            $branch->update($updateData);
            // Log removido
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

        // Se já está conectado, retornar mensagem amigável
        if (!$qrCode['success']) {
            // Tenta checar status da instância
            $state = $this->evolutionApi->connectionState($branch->whatsapp_instance_name);
            $isConnected = false;
            if ($state['success'] && ($state['state'] === 'open' || $state['state'] === 'connected')) {
                $isConnected = true;
            }
            if ($isConnected) {
                return response()->json([
                    'message' => 'WhatsApp já está conectado, não é necessário novo QR Code.',
                    'status' => 'connected',
                ], 200);
            }
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
