<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AddressController extends Controller
{
    /**
     * @OA\Get(
     *      path="/api/addresses",
     *      operationId="getAddressesList",
     *      tags={"Addresses"},
     *      summary="Listar endereços",
     *      description="Retorna lista de todos os endereços cadastrados",
     *      @OA\Response(
     *          response=200,
     *          description="Lista de endereços",
     *          @OA\JsonContent(
     *              type="array",
     *              @OA\Items(ref="#/components/schemas/Address")
     *          )
     *      )
     * )
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Se for usuário autenticado, filtrar por filial
        if ($user) {
            if ($user->isMaster()) {
                // Master vê todos os endereços
                return Address::with('branch')->get();
            } else {
                // Admin/Employee vê apenas endereços da sua filial
                return Address::where('branch_id', $user->branch_id)->with('branch')->get();
            }
        }
        
        // Público vê apenas endereços ativos
        return Address::where('ativo', true)->get();
    }

    /**
     * @OA\Post(
     *      path="/api/addresses",
     *      operationId="createAddress",
     *      tags={"Addresses"},
     *      summary="Criar novo endereço",
     *      description="Cadastra um novo endereço de entrega",
     *      @OA\RequestBody(
     *          required=true,
     *          @OA\JsonContent(
     *              required={"rua","numero","bairro","cidade","estado"},
     *              @OA\Property(property="rua", type="string", example="Rua das Flores"),
     *              @OA\Property(property="numero", type="string", example="123"),
     *              @OA\Property(property="bairro", type="string", example="Centro"),
     *              @OA\Property(property="cidade", type="string", example="São Paulo"),
     *              @OA\Property(property="estado", type="string", example="SP"),
     *              @OA\Property(property="ponto_referencia", type="string", example="Próximo ao mercado"),
     *              @OA\Property(property="horarios", type="string", example="8h às 18h"),
     *              @OA\Property(property="endereco_entrega", type="boolean", example=true),
     *              @OA\Property(property="latitude", type="string", example="-23.550520"),
     *              @OA\Property(property="longitude", type="string", example="-46.633309")
     *          )
     *      ),
     *      @OA\Response(
     *          response=201,
     *          description="Endereço criado com sucesso",
     *          @OA\JsonContent(ref="#/components/schemas/Address")
     *      ),
     *      @OA\Response(
     *          response=422,
     *          description="Dados de validação inválidos"
     *      )
     * )
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        $data = $request->validate([
            'rua' => 'required|string',
            'numero' => 'required|string',
            'bairro' => 'required|string',
            'cidade' => 'required|string',
            'estado' => 'required|string',
            'ponto_referencia' => 'nullable|string',
            'horarios' => 'nullable|string',
            'endereco_entrega' => 'boolean',
            'latitude' => 'nullable|string',
            'longitude' => 'nullable|string',
            'branch_id' => 'nullable|exists:branches,id',
        ]);
        
        // Determinar branch_id
        if ($user && $user->isMaster()) {
            // Master pode especificar a filial
            if (!isset($data['branch_id'])) {
                return response()->json([
                    'message' => 'Master deve especificar a filial (branch_id)'
                ], 422);
            }
        } elseif ($user) {
            // Admin/Employee usam sua filial
            $data['branch_id'] = $user->branch_id;
        }
        
        $address = Address::create($data);
        return response()->json($address, 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $address = Address::findOrFail($id);
        
        // Verificar permissão: usuários não-master só podem ver endereços da sua filial
        if ($user && !$user->isMaster() && $address->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }
        
        return response()->json($address);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $address = Address::findOrFail($id);
        
        // Verificar permissão: usuários não-master só podem editar endereços da sua filial
        if ($user && !$user->isMaster() && $address->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }
        
        $data = $request->validate([
            'rua' => 'sometimes|required|string',
            'numero' => 'sometimes|required|string',
            'bairro' => 'sometimes|required|string',
            'cidade' => 'sometimes|required|string',
            'estado' => 'sometimes|required|string',
            'ponto_referencia' => 'nullable|string',
            'horarios' => 'nullable|string',
            'endereco_entrega' => 'boolean',
            'latitude' => 'nullable|string',
            'longitude' => 'nullable|string',
        ]);
        $address->update($data);
        return response()->json($address);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $address = Address::findOrFail($id);
        
        // Verificar permissão: usuários não-master só podem excluir endereços da sua filial
        if ($user && !$user->isMaster() && $address->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }
        
        $address->delete();
        return response()->json(['message' => 'Endereço removido com sucesso']);
    }
    /**
     * Ativa o endereço informado e desativa os demais DA MESMA FILIAL.
     */
   public function activate(Request $request, $id)
    {
        $user = $request->user();
        $address = Address::findOrFail($id);
        
        // Verificar permissão: usuários não-master só podem ativar endereços da sua filial
        if ($user && !$user->isMaster() && $address->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }
        
        if ($address->ativo) {
            // Se já está ativo, inativa apenas ele
            $address->ativo = false;
            $address->save();
            $message = 'Endereço inativado com sucesso';
        } else {
            // Se está inativo, desativa todos DA MESMA FILIAL e ativa este
            Address::where('branch_id', $address->branch_id)->update(['ativo' => false]);
            $address->ativo = true;
            $address->save();
            $message = 'Endereço ativado com sucesso';
        }
        
        return response()->json([
            'message' => $message,
            'id' => $id,
            'address' => $address,
        ], 200, ['Content-Type' => 'application/json; charset=UTF-8'], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }
    
    /**
     * Retorna os endereços ativos (um por filial ativa) - público
     */
    public function getActive()
    {
        // Retorna todos os endereços ativos de filiais abertas
        $activeAddresses = Address::where('ativo', true)
            ->whereHas('branch', function($q) {
                $q->where('is_open', true)
                  ->where('is_active', true);
            })
            ->with('branch:id,name,code,is_open')
            ->get()
            ->map(function($address) {
                // Adicionar store_status calculado
                $storeStatus = $this->calculateStoreStatus($address->horarios);
                $address->store_status = $storeStatus;
                
                // Garantir que checkout_active existe
                if (!isset($address->checkout_active)) {
                    $address->checkout_active = true;
                }
                
                return $address;
            });
        
        if ($activeAddresses->isEmpty()) {
            return response()->json([], 200);
        }

        return response()->json($activeAddresses, 200, ['Content-Type' => 'application/json; charset=UTF-8'], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }
    
    /**
     * Calcula o status da loja baseado no horário de funcionamento
     */
    private function calculateStoreStatus($horarios)
    {
        if (empty($horarios)) {
            return [
                'is_open' => false,
                'message' => 'Horário não configurado'
            ];
        }
        
        // Obter horário atual no fuso de Brasília
        $now = new \DateTime('now', new \DateTimeZone('America/Sao_Paulo'));
        $currentTime = $now->format('H:i');
        
        // Parse do formato "08:00 até 12:00" ou "08:00-12:00"
        $pattern = '/(\d{2}:\d{2})\s*(?:até|ate|-)\s*(\d{2}:\d{2})/i';
        
        if (preg_match($pattern, $horarios, $matches)) {
            $openTime = $matches[1];
            $closeTime = $matches[2];
            
            $isOpen = ($currentTime >= $openTime && $currentTime <= $closeTime);
            
            if ($isOpen) {
                return [
                    'is_open' => true,
                    'message' => 'Aberto agora'
                ];
            } else {
                $message = $currentTime < $openTime 
                    ? "Abre às $openTime" 
                    : "Fechado - Abre amanhã às $openTime";
                
                return [
                    'is_open' => false,
                    'message' => $message,
                    'next_opening' => $openTime
                ];
            }
        }
        
        // Se não conseguiu fazer parse, assume fechado
        return [
            'is_open' => false,
            'message' => 'Horário não reconhecido'
        ];
    }
}
