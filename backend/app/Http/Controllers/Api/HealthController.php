<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    /**
     * Perform infrastructure health check.
     */
    public function check(): JsonResponse
    {
        $dbConnected = false;

        try {
            DB::connection()->getPdo();
            $dbConnected = true;
        } catch (Throwable $e) {
            $dbConnected = false;
        }

        $isHealthy = $dbConnected;

        $response = [
            'status' => $isHealthy ? 'ok' : 'degraded',
            'timestamp' => now()->toISOString(),
            'services' => [
                'database' => $dbConnected ? 'connected' : 'disconnected',
                'php_version' => PHP_VERSION,
            ],
        ];

        return response()->json($response, $isHealthy ? 200 : 503);
    }
}
