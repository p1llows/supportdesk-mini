<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\TicketActivityController;
use App\Http\Controllers\Api\TicketAttachmentController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\TicketStatusController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — SupportDesk Mini
|--------------------------------------------------------------------------
*/

Route::get('/v1/health', [HealthController::class, 'check']);
Route::get('/v1/users/{user}/avatar', [ProfileController::class, 'showAvatar']);

// Authentication Routes
Route::post('/v1/auth/register', [AuthController::class, 'register']);
Route::post('/v1/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/v1/auth/logout', [AuthController::class, 'logout']);
    Route::get('/v1/auth/me', [AuthController::class, 'me']);
    Route::get('/v1/dashboard/stats', [DashboardController::class, 'stats']);

    // Profile Routes (Issue #14)
    Route::patch('/v1/profile', [ProfileController::class, 'update']);
    Route::patch('/v1/profile/password', [ProfileController::class, 'updatePassword']);
    Route::patch('/v1/profile/department', [ProfileController::class, 'updateDepartment']);
    Route::post('/v1/profile/avatar', [ProfileController::class, 'uploadAvatar']);
    Route::delete('/v1/profile/avatar', [ProfileController::class, 'removeAvatar']);

    // Notification Routes
    Route::get('/v1/notifications', [NotificationController::class, 'index']);
    Route::post('/v1/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/v1/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    // User Routes (Issue #9 & #11)
    Route::get('/v1/users', [UserController::class, 'index']);
    Route::post('/v1/users', [UserController::class, 'store']);
    Route::put('/v1/users/{user}', [UserController::class, 'update']);
    Route::delete('/v1/users/{user}', [UserController::class, 'destroy']);

    // Department Routes (Issue #7 & #14)
    Route::get('/v1/departments', [DepartmentController::class, 'index']);
    Route::post('/v1/departments', [DepartmentController::class, 'store']);
    Route::put('/v1/departments/{department}', [DepartmentController::class, 'update']);
    Route::delete('/v1/departments/{department}', [DepartmentController::class, 'destroy']);

    // Ticket Routes (Issue #6 / #7 / #12 / Day 5)
    Route::post('/v1/tickets', [TicketController::class, 'store']);
    Route::get('/v1/tickets', [TicketController::class, 'index']);
    Route::get('/v1/tickets/{ticket}', [TicketController::class, 'show']);
    Route::put('/v1/tickets/{ticket}', [TicketController::class, 'update']);
    Route::delete('/v1/tickets/{ticket}', [TicketController::class, 'destroy']);

    // Ticket Status Workflow (Issue #13) & Assignment
    Route::patch('/v1/tickets/{ticket}/status', [TicketStatusController::class, 'update']);
    Route::patch('/v1/tickets/{ticket}/assign', [TicketController::class, 'assign']);

    // Unified Activity Timeline & Comments (Day 5)
    Route::get('/v1/roles/permissions', [RolePermissionController::class, 'index']);
    Route::put('/v1/roles/permissions', [RolePermissionController::class, 'update']);
    Route::get('/v1/activity-logs', [ActivityLogController::class, 'index']);
    Route::get('/v1/tickets/{ticket}/activities', [TicketActivityController::class, 'index']);
    Route::post('/v1/tickets/{ticket}/comments', [TicketActivityController::class, 'store']);
    Route::patch('/v1/tickets/{ticket}/comments/{activity}', [TicketActivityController::class, 'update']);
    Route::delete('/v1/tickets/{ticket}/comments/{activity}', [TicketActivityController::class, 'destroy']);

    // Ticket Attachments
    Route::get('/v1/tickets/{ticket}/attachments/{attachment}/download', [TicketAttachmentController::class, 'download']);
});
