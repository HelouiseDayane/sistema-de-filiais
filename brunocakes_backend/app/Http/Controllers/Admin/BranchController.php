<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BranchController extends Controller
{
    /**
     * Listar todas as filiais
     * Master: vê todas
     * Admin/Employee: vê apenas a sua
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = Branch::query();
        
        // Se não for master, filtrar apenas sua filial
        if (!$user->isMaster()) {
            $query->where('id', $user->branch_id);
        }
        
        $branches = $query->orderBy('name')->get();
        
        return response()->json($branches);
    }

    /**
     * Criar nova filial (apenas master)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:branches,code',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'opening_hours' => 'nullable|string',
            'is_open' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        $branch = Branch::create($validator->validated());

        return response()->json([
            'message' => 'Filial criada com sucesso',
            'branch' => $branch
        ], 201);
    }

    /**
     * Exibir uma filial específica
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        
        $branch = Branch::findOrFail($id);
        
        // Se não for master, só pode ver sua própria filial
        if (!$user->isMaster() && $branch->id != $user->branch_id) {
            return response()->json([
                'message' => 'Acesso negado'
            ], 403);
        }
        
        return response()->json($branch);
    }

    /**
     * Atualizar filial (apenas master e admin da filial)
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $branch = Branch::findOrFail($id);
        
        // Se não for master, só pode editar sua própria filial
        if (!$user->isMaster() && $branch->id != $user->branch_id) {
            return response()->json([
                'message' => 'Acesso negado'
            ], 403);
        }
        
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:branches,code,' . $id,
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'opening_hours' => 'nullable|string',
            'is_open' => 'boolean',
            'is_active' => 'boolean',
            'pix_key' => 'nullable|string|max:255',
            'payment_frequency' => 'nullable|in:quinzenal,mensal,trimestral',
            'profit_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        $branch->update($validator->validated());

        return response()->json([
            'message' => 'Filial atualizada com sucesso',
            'branch' => $branch
        ]);
    }

    /**
     * Deletar filial (apenas master)
     */
    public function destroy($id)
    {
        $branch = Branch::findOrFail($id);
        
        // Verificar se há usuários vinculados
        if ($branch->users()->count() > 0) {
            return response()->json([
                'message' => 'Não é possível deletar. Existem usuários vinculados a esta filial.'
            ], 422);
        }
        
        // Verificar se há produtos vinculados
        if ($branch->products()->count() > 0) {
            return response()->json([
                'message' => 'Não é possível deletar. Existem produtos vinculados a esta filial.'
            ], 422);
        }
        
        $branch->delete();
        
        return response()->json([
            'message' => 'Filial deletada com sucesso'
        ]);
    }

    /**
     * Alternar status aberto/fechado da filial
     */
    public function toggleOpen(Request $request, $id)
    {
        $user = $request->user();
        $branch = Branch::findOrFail($id);
        
        // Admin e master podem alterar status
        if (!$user->isMaster() && !$user->isAdmin()) {
            return response()->json([
                'message' => 'Acesso negado'
            ], 403);
        }
        
        // Se não for master, só pode alterar sua própria filial
        if (!$user->isMaster() && $branch->id != $user->branch_id) {
            return response()->json([
                'message' => 'Acesso negado'
            ], 403);
        }
        
        $branch->is_open = !$branch->is_open;
        $branch->save();
        
        return response()->json([
            'message' => 'Status atualizado com sucesso',
            'branch' => $branch
        ]);
    }

    /**
     * Listar filiais ativas (público)
     */
    public function publicList()
    {
        // Apenas filiais ATIVAS devem aparecer no cardápio público
        $branches = Branch::where('is_active', true)
            ->where('is_open', true) // Apenas abertas
            ->select('id', 'name', 'code', 'address', 'phone', 'email', 'opening_hours', 'is_open', 'is_active')
            ->orderBy('name')
            ->get();
        
        return response()->json($branches);
    }
}

