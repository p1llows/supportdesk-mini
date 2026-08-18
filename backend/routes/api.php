<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\TicketController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — SupportDesk Mini
|--------------------------------------------------------------------------
*/

Route::get('/v1/health', [HealthController::class, 'check']);

// Authentication Routes
Route::post('/v1/auth/register', [AuthController::class, 'register']);
Route::post('/v1/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/v1/auth/logout', [AuthController::class, 'logout']);
    Route::get('/v1/auth/me', [AuthController::class, 'me']);
    Route::get('/v1/dashboard/stats', [DashboardController::class, 'stats']);

    // Department Routes (Issue #7)
    Route::get('/v1/departments', [DepartmentController::class, 'index']);

    // Ticket Routes (Issue #6 / #7)
    Route::post('/v1/tickets', [TicketController::class, 'store']);
    Route::get('/v1/tickets', [TicketController::class, 'index']);
});
