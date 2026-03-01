<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class WebhookController extends Controller
{
    /**
     * Webhook para receber notificações da Evolution API
     */
    public function evolutionWebhook(Request $request, $branchId)
    {
        try {
            $data = $request->all();
            
            Log::info('Evolution API Webhook received', [
                'branch_id' => $branchId,
                'data' => $data,
            ]);

            // Verificar se é evento de CONNECTION_UPDATE
            if (isset($data['event']) && $data['event'] === 'connection.update') {
                $this->handleConnectionUpdate($branchId, $data);
            }

            // Verificar formato alternativo da Evolution API v2
            if (isset($data['instance']) && isset($data['data']['state'])) {
                $this->handleConnectionUpdateV2($branchId, $data);
            }

            return response()->json(['status' => 'ok'], 200);
        } catch (\Exception $e) {
            Log::error('Evolution webhook error', [
                'branch_id' => $branchId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Processar atualização de conexão (formato v1)
     */
    private function handleConnectionUpdate($branchId, $data)
    {
        $branch = Branch::find($branchId);
        
        if (!$branch) {
            Log::warning('Branch not found for webhook', ['branch_id' => $branchId]);
            return;
        }

        $state = $data['state'] ?? $data['data']['state'] ?? null;
        
        Log::info('Processing connection update', [
            'branch_id' => $branchId,
            'state' => $state,
            'full_data' => $data,
        ]);

        if ($state === 'open' || $state === 'connected') {
            // WhatsApp conectado com sucesso
            $branch->whatsapp_status = 'connected';
            $branch->whatsapp_number = $data['phoneNumber'] ?? $data['data']['phoneNumber'] ?? null;
            $branch->whatsapp_connected_at = now();
            $branch->save();

            // Emitir evento SSE
            Cache::put('last_whatsapp_status_event', [
                'id' => uniqid('whatsapp_', true),
                'data' => [
                    'branch_id' => $branchId,
                    'status' => 'connected',
                    'number' => $branch->whatsapp_number,
                    'connected_at' => $branch->whatsapp_connected_at,
                    'instance_name' => $branch->whatsapp_instance_name,
                ],
            ], 60);

            Log::info('Branch WhatsApp connected via webhook', [
                'branch_id' => $branchId,
                'number' => $branch->whatsapp_number,
            ]);
        } elseif ($state === 'close' || $state === 'disconnected') {
            // WhatsApp desconectado
            $branch->whatsapp_status = 'disconnected';
            $branch->save();

            // Emitir evento SSE
            Cache::put('last_whatsapp_status_event', [
                'id' => uniqid('whatsapp_', true),
                'data' => [
                    'branch_id' => $branchId,
                    'status' => 'disconnected',
                    'number' => $branch->whatsapp_number,
                    'connected_at' => $branch->whatsapp_connected_at,
                    'instance_name' => $branch->whatsapp_instance_name,
                ],
            ], 60);

            Log::info('Branch WhatsApp disconnected via webhook', [
                'branch_id' => $branchId,
            ]);
        }
    }

    /**
     * Processar atualização de conexão (formato v2 da Evolution API)
     */
    private function handleConnectionUpdateV2($branchId, $data)
    {
        $branch = Branch::find($branchId);
        
        if (!$branch) {
            Log::warning('Branch not found for webhook', ['branch_id' => $branchId]);
            return;
        }

        $state = $data['data']['state'] ?? null;
        
        Log::info('Processing connection update V2', [
            'branch_id' => $branchId,
            'state' => $state,
            'instance' => $data['instance'] ?? null,
        ]);

        if ($state === 'open' || $state === 'connected') {
            // WhatsApp conectado com sucesso
            $branch->whatsapp_status = 'connected';
            
            // Tentar extrair número de telefone de diferentes formatos
            // wuid vem no formato: 558499533663@s.whatsapp.net
            $wuid = $data['data']['wuid'] ?? null;
            $phoneNumber = $data['data']['phoneNumber'] 
                ?? $data['data']['phone'] 
                ?? $data['data']['jid'] 
                ?? null;
            
            // Extrair número do wuid (remover @s.whatsapp.net)
            if ($wuid && str_contains($wuid, '@')) {
                $phoneNumber = explode('@', $wuid)[0];
            }
            
            if ($phoneNumber) {
                // Nunca sobrescrever whatsapp_instance_name, apenas atualizar whatsapp_number
                $branch->whatsapp_number = $phoneNumber;
            }
            
            $branch->whatsapp_connected_at = now();
            $branch->save();

            // Emitir evento SSE
            Cache::put('last_whatsapp_status_event', [
                'id' => uniqid('whatsapp_', true),
                'data' => [
                    'branch_id' => $branchId,
                    'status' => 'connected',
                    'number' => $branch->whatsapp_number,
                    'connected_at' => $branch->whatsapp_connected_at,
                    'instance_name' => $branch->whatsapp_instance_name,
                ],
            ], 60);

            Log::info('Branch WhatsApp connected via webhook V2', [
                'branch_id' => $branchId,
                'number' => $branch->whatsapp_number,
                'instance_name' => $branch->whatsapp_instance_name,
            ]);
        } elseif ($state === 'close' || $state === 'disconnected') {
            // WhatsApp desconectado
            $branch->whatsapp_status = 'disconnected';
            $branch->save();

            // Emitir evento SSE
            Cache::put('last_whatsapp_status_event', [
                'id' => uniqid('whatsapp_', true),
                'data' => [
                    'branch_id' => $branchId,
                    'status' => 'disconnected',
                    'number' => $branch->whatsapp_number,
                    'connected_at' => $branch->whatsapp_connected_at,
                    'instance_name' => $branch->whatsapp_instance_name,
                ],
            ], 60);

            Log::info('Branch WhatsApp disconnected via webhook V2', [
                'branch_id' => $branchId,
            ]);
        }
    }
}
