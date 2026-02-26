<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BranchPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'period_start',
        'period_end',
        'total_sales',
        'profit_percentage',
        'commission_amount',
        'paid_amount',
        'status',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'paid_at' => 'datetime',
        'total_sales' => 'decimal:2',
        'profit_percentage' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
