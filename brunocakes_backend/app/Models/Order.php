<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model
{
    protected $fillable = [
        'id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'address_street',
        'address_number',
        'address_neighborhood',
        'address_city',
        'address_state',
        'address_zip',
        'latitude',
        'longitude',
        'total_amount',
        'payment_method',
        'payment_reference',
        'status',
        'pickup_info_visible',
        // ✅ NOVAS COLUNAS ADICIONADAS
        'cart_expires_at',
        'checkout_expires_at',
        'stock_reserved',
        'branch_id',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'pickup_info_visible' => 'boolean',
        'latitude' => 'decimal:10,7',
        'longitude' => 'decimal:10,7',
        // ✅ NOVOS CASTS ADICIONADOS
        'cart_expires_at' => 'datetime',
        'checkout_expires_at' => 'datetime',
        'stock_reserved' => 'boolean',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payment()
    {
        return $this->hasOne(Payment::class);
    }

    // Relacionamento com Branch
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    // ✅ MÉTODOS ÚTEIS ADICIONADOS
    public function isCheckoutExpired()
    {
        return $this->checkout_expires_at && now()->greaterThan($this->checkout_expires_at);
    }

    public function hasStockReserved()
    {
        return $this->stock_reserved === true;
    }

    public function getTimeUntilExpiration()
    {
        if (!$this->checkout_expires_at) {
            return null;
        }
        
        $diff = now()->diffInMinutes($this->checkout_expires_at, false);
        return $diff > 0 ? $diff : 0;
    }
}