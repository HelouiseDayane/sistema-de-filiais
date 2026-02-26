<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Listar usuários
     * Master: vê todos
     * Admin: vê apenas usuários da sua filial
     * Employee: sem acesso
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Apenas master e admin podem listar usuários
        if (!$user->isMaster() && !$user->isAdmin()) {
            return response()->json([
                'message' => 'Acesso negado'
            ], 403);
        }
        
        $query = User::with('branch:id,name,code');
        
        // Se não for master, filtrar apenas usuários da sua filial
        if (!$user->isMaster()) {
            $query->where('branch_id', $user->branch_id);
        }
        
        $users = $query->orderBy('name')->get();
        
        return response()->json($users);
    }

    /**
     * Criar novo usuário
     * Master: pode criar qualquer tipo de usuário
     * Admin: pode criar apenas employees na sua filial
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        // Apenas master e admin podem criar usuários
        if (!$user->isMaster() && !$user->isAdmin()) {
            return response()->json([
                'message' => 'Acesso negado'
            ], 403);
        }
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => ['required', Rule::in(['master', 'admin', 'employee'])],
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        
        // Admin só pode criar employees na sua filial
        if (!$user->isMaster()) {
            if ($data['role'] !== 'employee') {
                return response()->json([
                    'message' => 'Admin só pode criar funcionários (employee)'
                ], 403);
            }
            $data['branch_id'] = $user->branch_id;
        }
        
        // Master que não especificou filial e papel não é master
        if ($user->isMaster() && $data['role'] !== 'master' && !isset($data['branch_id'])) {
            return response()->json([
                'message' => 'branch_id é obrigatório para usuários admin e employee'
            ], 422);
        }
        
        // Hash da senha
        $data['password'] = Hash::make($data['password']);
        
        $newUser = User::create($data);
        $newUser->load('branch');

        return response()->json([
            'message' => 'Usuário criado com sucesso',
            'user' => $newUser
        ], 201);
    }

    /**
     * Exibir usuário específico
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $targetUser = User::with('branch')->findOrFail($id);
        
        // Admin só pode ver usuários da sua filial
        if (!$user->isMaster() && $targetUser->branch_id != $user->branch_id) {
            return response()->json([
                'message' => 'Acesso negado'
            ], 403);
        }
        
        return response()->json($targetUser);
    }

    /**
     * Atualizar usuário
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $targetUser = User::findOrFail($id);
        
        // Admin só pode editar usuários da sua filial
        if (!$user->isMaster() && $targetUser->branch_id != $user->branch_id) {
            return response()->json([
                'message' => 'Acesso negado'
            ], 403);
        }
        
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users')->ignore($id)],
            'password' => 'sometimes|string|min:8|confirmed',
            'role' => ['sometimes', Rule::in(['master', 'admin', 'employee'])],
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        
        // Admin não pode alterar papel
        if (!$user->isMaster() && isset($data['role'])) {
            unset($data['role']);
        }
        
        // Admin não pode alterar filial
        if (!$user->isMaster() && isset($data['branch_id'])) {
            unset($data['branch_id']);
        }
        
        // Se houver senha, fazer hash
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }
        
        $targetUser->update($data);
        $targetUser->load('branch');

        return response()->json([
            'message' => 'Usuário atualizado com sucesso',
            'user' => $targetUser
        ]);
    }

    /**
     * Deletar usuário
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $targetUser = User::findOrFail($id);
        
        // Não pode deletar a si mesmo
        if ($targetUser->id === $user->id) {
            return response()->json([
                'message' => 'Você não pode deletar seu próprio usuário'
            ], 422);
        }
        
        // Admin só pode deletar usuários da sua filial
        if (!$user->isMaster() && $targetUser->branch_id != $user->branch_id) {
            return response()->json([
                'message' => 'Acesso negado'
            ], 403);
        }
        
        // Admin não pode deletar outros admins ou masters
        if (!$user->isMaster() && $targetUser->role !== 'employee') {
            return response()->json([
                'message' => 'Admin só pode deletar funcionários (employee)'
            ], 403);
        }
        
        $targetUser->delete();
        
        return response()->json([
            'message' => 'Usuário deletado com sucesso'
        ]);
    }
}
