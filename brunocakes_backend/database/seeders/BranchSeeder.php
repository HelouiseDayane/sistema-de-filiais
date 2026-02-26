<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('branches')->insert([
            [
                'name' => 'Filial Central',
                'code' => 'FIL001',
                'address' => 'Rua Principal, 123',
                'phone' => '(11) 1234-5678',
                'email' => 'central@brunocakes.com',
                'opening_hours' => 'Seg-Sex: 08:00-18:00',
                'is_open' => true,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
