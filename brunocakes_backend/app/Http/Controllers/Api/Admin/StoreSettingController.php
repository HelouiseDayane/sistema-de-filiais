<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class StoreSettingController extends Controller
{
    /**
     * @OA\Get(
     *      path="/api/admin/settings",
     *      operationId="getStoreSettings",
     *      tags={"Admin Store Settings"},
     *      summary="Obter configurações da loja",
     *      description="Retorna as configurações atuais da loja",
     *      security={{"sanctum": {}}},
     *      @OA\Response(
     *          response=200,
     *          description="Configurações da loja",
     *          @OA\JsonContent(ref="#/components/schemas/StoreSetting")
     *      ),
     *      @OA\Response(
     *          response=401,
     *          description="Não autorizado"
     *      )
     * )
     */
    public function index(): JsonResponse
    {
        $settings = StoreSetting::getSettings();
        
        // Adicionar URLs completas para as imagens
        $settingsArray = $settings->toArray();
        $settingsArray['logo_horizontal_url'] = $settings->logo_horizontal ? asset('storage/' . $settings->logo_horizontal) : null;
        $settingsArray['logo_icon_url'] = $settings->logo_icon ? asset('storage/' . $settings->logo_icon) : null;
        
        return response()->json($settingsArray);
    }

    /**
     * @OA\Post(
     *      path="/api/admin/settings",
     *      operationId="updateStoreSettings",
     *      tags={"Admin Store Settings"},
     *      summary="Atualizar configurações da loja",
     *      description="Atualiza as configurações da loja incluindo logos",
     *      security={{"sanctum": {}}},
     *      @OA\RequestBody(
     *          required=true,
     *          @OA\MediaType(
     *              mediaType="multipart/form-data",
     *              @OA\Schema(
     *                  @OA\Property(property="store_name", type="string", example="Bruno Cakes", description="Nome da loja"),
     *                  @OA\Property(property="store_slogan", type="string", example="Aqui não é fatia nem pedaço, aqui é tora!", description="Slogan da loja"),
     *                  @OA\Property(property="instagram", type="string", example="brunocakee", description="Instagram da loja"),
     *                  @OA\Property(property="primary_color", type="string", example="#8B4513", description="Cor primária em hexadecimal"),
     *                  @OA\Property(property="mercado_pago_key", type="string", example="MP_KEY_123", description="Chave do Mercado Pago"),
     *                  @OA\Property(property="logo_horizontal", type="string", format="binary", description="Logo horizontal da loja"),
     *                  @OA\Property(property="logo_icon", type="string", format="binary", description="Ícone da loja")
     *              )
     *          )
     *      ),
     *      @OA\Response(
     *          response=200,
     *          description="Configurações atualizadas com sucesso",
     *          @OA\JsonContent(
     *              @OA\Property(property="message", type="string", example="Configurações atualizadas com sucesso"),
     *              @OA\Property(property="settings", ref="#/components/schemas/StoreSetting")
     *          )
     *      ),
     *      @OA\Response(
     *          response=422,
     *          description="Dados de validação inválidos",
     *          @OA\JsonContent(
     *              @OA\Property(property="message", type="string", example="Dados inválidos"),
     *              @OA\Property(property="errors", type="object")
     *          )
     *      ),
     *      @OA\Response(
     *          response=401,
     *          description="Não autorizado"
     *      )
     * )
     */
  public function update(Request $request): JsonResponse
{
    
        $settings = StoreSetting::getSettings();

        // ✅ Validação simplificada
        $validated = $request->validate([
            'store_name'        => 'sometimes|string|max:255',
            'store_slogan'      => 'sometimes|string|max:500|nullable', // Corrigido para store_slogan
            'phone'             => 'sometimes|string|max:500|nullable',
            'whatsapp'          => 'sometimes|string|max:500|nullable',
            'instagram'         => 'sometimes|string|max:100|nullable',
            'primary_color'     => 'sometimes|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'mercado_pago_key'  => 'sometimes|string|nullable',
            'logo_horizontal'   => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'logo_icon'         => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,ico|max:1024',
        ]);

        $data = [];
        foreach ($validated as $key => $value) {
            $data[$key] = $value;
        }

        // ✅ Upload imagem horizontal
        if ($request->hasFile('logo_horizontal')) {
            if ($settings->logo_horizontal && \Storage::disk('public')->exists($settings->logo_horizontal)) {
                \Storage::disk('public')->delete($settings->logo_horizontal);
            }
            $path = $request->file('logo_horizontal')->store('store', 'public');
            $data['logo_horizontal'] = $path;
        }

        // ✅ Upload imagem ícone
        if ($request->hasFile('logo_icon')) {
            if ($settings->logo_icon && \Storage::disk('public')->exists($settings->logo_icon)) {
                \Storage::disk('public')->delete($settings->logo_icon);
            }
            $path = $request->file('logo_icon')->store('store', 'public');
            $data['logo_icon'] = $path;
        }

        \DB::beginTransaction();
        try {
            $settings->update($data);
            $freshSettings = $settings->fresh();

            // ✅ Montar URLs completas das imagens
            $appUrl = config('app.url');
            if ($freshSettings->logo_horizontal) {
                if (preg_match('/^https?:\/\//', $freshSettings->logo_horizontal)) {
                    $freshSettings->logo_horizontal_url = $freshSettings->logo_horizontal;
                } else {
                    $freshSettings->logo_horizontal_url = rtrim($appUrl, '/') . \Storage::url($freshSettings->logo_horizontal);
                }
            } else {
                $freshSettings->logo_horizontal_url = null;
            }

            if ($freshSettings->logo_icon) {
                if (preg_match('/^https?:\/\//', $freshSettings->logo_icon)) {
                    $freshSettings->logo_icon_url = $freshSettings->logo_icon;
                } else {
                    $freshSettings->logo_icon_url = rtrim($appUrl, '/') . \Storage::url($freshSettings->logo_icon);
                }
            } else {
                $freshSettings->logo_icon_url = null;
            }

            \DB::commit();
            \Log::info('StoreSettings Update - Transaction committed successfully');
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('StoreSettings Update - Transaction failed:', ['error' => $e->getMessage()]);
            throw $e;
        }

        return response()->json([
            'message' => 'Configurações atualizadas com sucesso',
            'data' => $freshSettings
        ]);
    }

    /**
     * @OA\Delete(
     *      path="/api/admin/settings",
     *      operationId="resetStoreSettings",
     *      tags={"Admin Store Settings"},
     *      summary="Resetar configurações da loja",
     *      description="Reseta as configurações da loja para os valores padrão",
     *      security={{"sanctum": {}}},
     *      @OA\Response(
     *          response=200,
     *          description="Configurações resetadas com sucesso",
     *          @OA\JsonContent(
     *              @OA\Property(property="message", type="string", example="Configurações resetadas para os valores padrão"),
     *              @OA\Property(property="settings", ref="#/components/schemas/StoreSetting")
     *          )
     *      ),
     *      @OA\Response(
     *          response=401,
     *          description="Não autorizado"
     *      )
     * )
     */
    public function destroy(): JsonResponse
    {
        $settings = StoreSetting::getSettings();
        
        // Remove uploaded logos
        if ($settings->logo_horizontal && Storage::disk('public')->exists($settings->logo_horizontal)) {
            Storage::disk('public')->delete($settings->logo_horizontal);
        }
        
        if ($settings->logo_icon && Storage::disk('public')->exists($settings->logo_icon)) {
            Storage::disk('public')->delete($settings->logo_icon);
        }
        
        // Reset to default values
        $settings->update([
            'store_name' => 'Meu Delivery',
            'store_slogan' => 'Digite aqui seu Slogan',
            'instagram' => 'meudelivey',
            'primary_color' => '#8B4513',
            'mercado_pago_key' => null,
            'logo_horizontal' => null,
            'logo_icon' => null,
        ]);

        return response()->json([
            'message' => 'Configurações resetadas para os valores padrão',
            'data' => $settings->fresh()
        ]);
    }

    /**
     * @OA\Get(
     *      path="/api/store/settings",
     *      operationId="getPublicStoreSettings",
     *      tags={"Public Store Settings"},
     *      summary="Obter configurações públicas da loja",
     *      description="Retorna configurações públicas da loja (sem dados sensíveis)",
     *      @OA\Response(
     *          response=200,
     *          description="Configurações públicas da loja",
     *          @OA\JsonContent(
     *              @OA\Property(property="store_name", type="string", example="Bruno Cakes"),
     *              @OA\Property(property="store_slogan", type="string", example="Aqui não é fatia nem pedaço, aqui é tora!"),
     *              @OA\Property(property="instagram", type="string", example="brunocakee"),
     *              @OA\Property(property="primary_color", type="string", example="#8B4513"),
     *              @OA\Property(property="logo_horizontal", type="string", example="http://localhost:8191/storage/store/logo_horizontal.png", nullable=true),
     *              @OA\Property(property="logo_icon", type="string", example="http://localhost:8191/storage/store/logo_icon.png", nullable=true)
     *          )
     *      )
     * )
     */
    public function public(): JsonResponse
    {
        $settings = StoreSetting::getSettings();
        
        return response()->json([
            'store_name' => $settings->store_name,
            'store_slogan' => $settings->store_slogan, // Corrigido para store_slogan
            'instagram' => $settings->instagram,
            'primary_color' => $settings->primary_color,
            'logo_horizontal' => $settings->logo_horizontal ? asset('storage/' . $settings->logo_horizontal) : null,
            'logo_icon' => $settings->logo_icon ? asset('storage/' . $settings->logo_icon) : null,
        ]);
    }
}