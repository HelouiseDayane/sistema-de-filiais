<?php
// routes/web.php
use Illuminate\Support\Facades\Route;

Route::get('/login', function () {
    return response()->json(['error' => 'Não autenticado'], 401);
})->name('login');