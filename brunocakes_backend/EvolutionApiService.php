<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EvolutionApiService
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.evolution_api.url', 'http://192.168.1.77:8080'), '/');
        $this->apiKey = config('services.evolution_api.api_key', 'H6M8BHOSP1KH33D5NXJE2XYKEJHYCMGKDYFU7OF13HTP6ZQDQGVWDFX90B3LLQKOFRV7G3DGHMP9V3OPFZFJAOXV4YO5');
        
        if (empty($this->apiKey)) {
            Log::warning('EVOLUTION_API_KEY não configurada no .env');
        }
    }

    /**
     * Criar uma nova instância do WhatsApp
     */
    public function createInstance(string $instanceName, ?string $webhook = null): array
    {
        try {
            Log::info('Creating Evolution API instance', [
                'instanceName' => $instanceName,
                'baseUrl' => $this->baseUrl,
                'hasApiKey' => !empty($this->apiKey),
                'webhook' => $webhook,
            ]);

            $payload = [
                'instanceName' => $instanceName,
                'qrcode' => true,
                'integration' => 'WHATSAPP-BAILEYS',
            ];

            // Webhook configuração - REABILITADO para notificações em tempo real
            if ($webhook) {
                $payload['webhook'] = [
                    'url' => $webhook,
                    'enabled' => true,
                    'webhookByEvents' => true,
                    'webhookBase64' => false,
                    'events' => [
                        'CONNECTION_UPDATE',
                        'QRCODE_UPDATED',
                    ],
                ];
            }

            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post("{$this->baseUrl}/instance/create", $payload);

            Log::info('Evolution API response', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json(),
                ];
            }

            $errorMessage = $response->json()['message'] ?? 'Erro ao criar instância';
            Log::error('Evolution API error response', [
                'status' => $response->status(),
                'error' => $errorMessage,
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'error' => $errorMessage,
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao criar instância Evolution API: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Obter QR Code para conexão
     */
    public function fetchQrCode(string $instanceName): array
    {
        try {
            Log::info('Fetching QR Code', [
                'instanceName' => $instanceName,
                'url' => "{$this->baseUrl}/instance/connect/{$instanceName}",
            ]);

            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
            ])->get("{$this->baseUrl}/instance/connect/{$instanceName}");

            Log::info('QR Code response', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'qrcode' => $data['qrcode']['base64'] ?? $data['base64'] ?? null,
                    'code' => $data['qrcode']['code'] ?? $data['code'] ?? null,
                ];
            }

            Log::error('Failed to fetch QR Code', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'error' => $response->json()['message'] ?? 'Erro ao buscar QR Code',
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao buscar QR Code: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verificar status da conexão
     */
    public function connectionState(string $instanceName): array
    {
        try {
            Log::info('Checking connection state', [
                'instanceName' => $instanceName,
                'url' => "{$this->baseUrl}/instance/connectionState/{$instanceName}",
            ]);

            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
            ])->get("{$this->baseUrl}/instance/connectionState/{$instanceName}");

            Log::info('Connection state response', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'state' => $data['state'] ?? 'close',
                    'instance' => $data['instance'] ?? [],
                ];
            }

            Log::warning('Failed to get connection state', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'error' => 'Erro ao verificar conexão',
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao verificar conexão: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Deletar uma instância
     */
    public function deleteInstance(string $instanceName): array
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
            ])->delete("{$this->baseUrl}/instance/delete/{$instanceName}");

            // 404 significa que a instância não existe, o que é ok
            if ($response->successful() || $response->status() === 404) {
                return [
                    'success' => true,
                    'message' => 'Instância deletada com sucesso',
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['message'] ?? 'Erro ao deletar instância',
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao deletar instância: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Desconectar instância
     */
    public function logout(string $instanceName): array
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
            ])->delete("{$this->baseUrl}/instance/logout/{$instanceName}");

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Instância desconectada com sucesso',
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['message'] ?? 'Erro ao desconectar',
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao desconectar instância: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Enviar mensagem de texto
     */
    public function sendTextMessage(string $instanceName, string $number, string $text): array
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post("{$this->baseUrl}/message/sendText/{$instanceName}", [
                'number' => $number,
                'text' => $text,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json(),
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['message'] ?? 'Erro ao enviar mensagem',
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao enviar mensagem: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
