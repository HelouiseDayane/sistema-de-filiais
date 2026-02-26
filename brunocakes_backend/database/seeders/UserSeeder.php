<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UserSeeder extends Seeder
{
    public function run(): void
    {


        DB::table('users')->updateOrInsert(
            ['email' => 'admin@admin.com'],
            [
                'name' => 'Admin Teste',
                'password' => Hash::make('Gatopreto11.'),
                'is_admin' => true,
                'role' => 'master',
                'branch_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('users')->updateOrInsert(
            ['email' => 'brunocakes@zapsrv.com'],
            [
                'name' => 'Bruno Miranda Cake',
                'password' => Hash::make('BrunoC2k3.s#@.'),
                'is_admin' => true,
                'role' => 'master',
                'branch_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
