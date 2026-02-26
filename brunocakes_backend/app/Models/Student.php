<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Student extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'email',
        'birth_date',
        'profession',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the courses this student is enrolled in
     */
    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_enrollments')
            ->withPivot(['payment_status'])
            ->withTimestamps();
    }

    /**
     * Get student's age
     */
    public function getAgeAttribute(): int
    {
        return $this->birth_date->age;
    }
}
