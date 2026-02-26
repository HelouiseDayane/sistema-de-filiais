<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreSetting extends Model
{
    protected $fillable = [
        'store_name',
        'store_slogan', // Corrigido para 'store_slogan'
        'instagram',
        'phone',
        'whatsapp',
        'logo_horizontal',
        'logo_icon',
        'primary_color',
        'mercado_pago_key',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the store settings (singleton pattern)
     */
    public static function getSettings(): self
    {
        $settings = self::first();
        
        if (!$settings) {
            // Criar configurações padrão se não existirem
            $settings = self::create([
                'store_name' => 'Meu Delivey',
                'store_slogan' => 'Digite aqui seu slogan',
                'instagram' => 'meudelivey',
                'primary_color' => '#8B4513',
                'mercado_pago_key' => null,
                'logo_horizontal' => null,
                'logo_icon' => null,
            ]);
        }
        
        return $settings;
    }
}
