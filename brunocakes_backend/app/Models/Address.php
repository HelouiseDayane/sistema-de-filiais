<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    use HasFactory;

    protected $fillable = [
        'rua',
        'numero',
        'bairro',
        'cidade',
        'estado',
        'ponto_referencia',
        'horarios',
        'endereco_entrega',
        'latitude',
        'longitude',
        'ativo',
        'branch_id',
    ];

    // Relacionamento com Branch
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
