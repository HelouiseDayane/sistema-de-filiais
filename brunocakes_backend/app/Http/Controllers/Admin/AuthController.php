<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * @OA\Post(
     *      path="/api/admin/login",
     *      operationId="adminLogin",
     *      tags={"Admin Auth"},
     *      summary="Login de administrador",
     *      description="Faz login do administrador e retorna token de autenticação",
     *      @OA\RequestBody(
     *          required=true,
     *          @OA\JsonContent(
     *              required={"email","password"},
     *              @OA\Property(property="email", type="string", format="email", example="admin@brunocakes.com"),
     *              @OA\Property(property="password", type="string", example="123456")
     *          ),
     *      ),
     *      @OA\Response(
     *          response=200,
     *          description="Login realizado com sucesso",
     *          @OA\JsonContent(
     *              @OA\Property(property="token", type="string", example="1|abc123...")
     *          )
     *      ),
     *      @OA\Response(
     *          response=401,
     *          description="Credenciais inválidas",
     *          @OA\JsonContent(
     *              @OA\Property(property="error", type="string", example="Unauthorized")
     *          )
     *      ),
     *      @OA\Response(
     *          response=422,
     *          description="Dados de validação",
     *          @OA\JsonContent(
     *              @OA\Property(property="message", type="string", example="The given data was invalid."),
     *              @OA\Property(property="errors", type="object")
     *          )
     *      )
     * )
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password) || !$user->is_admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Verificar se a filial do usuário está ativa (se tiver filial)
        if ($user->branch_id) {
            $branch = $user->branch;
            if (!$branch || !$branch->is_active) {
                return response()->json([
                    'error' => 'A filial vinculada a este usuário está inativa. Entre em contato com o administrador.',
                    'code' => 'BRANCH_INACTIVE'
                ], 403);
            }
        }

        $token = $user->createToken('admin-token')->plainTextToken;

        // Carregar dados da filial se existir
        $branchData = null;
        if ($user->branch_id) {
            $branch = $user->branch;
            if ($branch) {
                $branchData = [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'code' => $branch->code,
                    'is_open' => $branch->is_open,
                    'is_active' => $branch->is_active,
                ];
            }
        }

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'branch_id' => $user->branch_id,
                'branch' => $branchData,
            ]
        ]);
    }

    /**
     * @OA\Post(
     *      path="/api/admin/logout",
     *      operationId="adminLogout",
     *      tags={"Admin Auth"},
     *      summary="Logout de administrador",
     *      description="Faz logout do administrador e revoga o token atual",
     *      security={{"sanctum":{}}},
     *      @OA\Response(
     *          response=200,
     *          description="Logout realizado com sucesso",
     *          @OA\JsonContent(
     *              @OA\Property(property="message", type="string", example="Logged out successfully")
     *          )
     *      )
     * )
     */
    public function logout(Request $request)
    {
        // Revoga o token atual
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }
}
