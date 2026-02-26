<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Course extends Model
{
    protected $fillable = [
        'name',
        'description',
        'image',
        'location',
        'latitude',
        'longitude',
        'street',
        'number',
        'neighborhood',
        'city',
        'state',
        'duration_hours',
        'schedule',
        'price',
        'is_active',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'price' => 'decimal:2',
        'duration_hours' => 'integer',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the students enrolled in this course
     */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'course_enrollments')
            ->withPivot(['payment_status'])
            ->withTimestamps();
    }

    /**
     * Get full address
     */
    public function getFullAddressAttribute(): string
    {
        return "{$this->street}, {$this->number} - {$this->neighborhood}, {$this->city} - {$this->state}";
    }
}
