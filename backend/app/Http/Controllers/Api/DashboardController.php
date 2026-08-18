<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    /**
     * Role permitted scopes map.
     *
     * @var array<string, list<string>>
     */
    private array $permittedScopesMap = [
        'admin' => ['all', 'admin', 'agent', 'requester'],
        'agent' => ['agent', 'requester'],
        'requester' => ['requester'],
    ];

    /**
     * Retrieve role-scoped dashboard metrics and permitted view scopes.
     */
    public function stats(Request $request): JsonResponse
    {
        $request->validate([
            'scope' => ['nullable', 'string', Rule::in(['all', 'admin', 'agent', 'requester'])],
        ]);

        $user = $request->user();
        $userRole = $user->role ?? 'requester';

        $permittedScopes = $this->permittedScopesMap[$userRole] ?? ['requester'];
        $activeScope = $request->query('scope', $userRole === 'admin' ? 'admin' : $userRole);

        // Enforce backend role authorization boundary
        if (! in_array($activeScope, $permittedScopes, true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized scope access for your user role',
            ], 403);
        }

        // Ticket metrics safely return 0 since Ticket model/table will be added in Issue #6/#8
        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
                'active_scope' => $activeScope,
                'permitted_scopes' => $permittedScopes,
                'stats' => [
                    'total_tickets' => 0,
                    'open_tickets' => 0,
                    'in_progress_tickets' => 0,
                    'resolved_tickets' => 0,
                    'closed_tickets' => 0,
                ],
            ],
        ]);
    }
}
