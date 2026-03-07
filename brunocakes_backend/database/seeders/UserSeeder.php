<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\Branch;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Obter a Filial Central (FIL001) se existir
        $filialCentral = Branch::where('code', 'FIL001')->first();

        // Usuário Master Admin - sem branch (acessa tudo)
        DB::table('users')->updateOrInsert(
            ['email' => 'admin@admin.com'],
            [
                'name' => 'Admin Teste',
                'password' => Hash::make('Gatopreto11.'),
                'is_admin' => true,
                'role' => 'master',
                'branch_id' => $filialCentral?->id, // Se houver Filial Central, vincular
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Usuário Master Admin - Bruno Miranda
        DB::table('users')->updateOrInsert(
            ['email' => 'brunocakes@zapsrv.com'],
            [
                'name' => 'Bruno Miranda Cake',
                'password' => Hash::make('BrunoC2k3.s#@.'),
                'is_admin' => true,
                'role' => 'master',
                'branch_id' => $filialCentral?->id, // Se houver Filial Central, vincular
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Usuário Master Admin - Helouise
        DB::table('users')->updateOrInsert(
            ['email' => 'helouise@zapsrv.com'],
            [
                'name' => 'Helouise Dayane',
                'password' => Hash::make('Helouise@123'),
                'is_admin' => true,
                'role' => 'master',
                'branch_id' => $filialCentral?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
