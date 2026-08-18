<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
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

        // Build live ticket metrics query based on active scope and role
        $query = Ticket::query();

        if ($userRole === 'requester' || $activeScope === 'requester') {
            $query->where('user_id', $user->id);
        }

        $totalTickets = (clone $query)->count();
        $openTickets = (clone $query)->where('status', 'open')->count();
        $inProgressTickets = (clone $query)->where('status', 'in_progress')->count();
        $resolvedTickets = (clone $query)->where('status', 'resolved')->count();
        $closedTickets = (clone $query)->where('status', 'closed')->count();

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
                    'total_tickets' => $totalTickets,
                    'open_tickets' => $openTickets,
                    'in_progress_tickets' => $inProgressTickets,
                    'resolved_tickets' => $resolvedTickets,
                    'closed_tickets' => $closedTickets,
                ],
            ],
        ]);
    }
}
