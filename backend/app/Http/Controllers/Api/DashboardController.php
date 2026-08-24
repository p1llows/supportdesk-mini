<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Retrieve role-scoped dashboard metrics.
     *
     * Scoping mirrors the ticket queue rules exactly — there is no
     * switchable "role view": requesters see their own tickets, agents see
     * their department's tickets, admins see everything. Any ?scope=
     * query parameter is intentionally ignored.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Ticket::query();

        if ($user->role === 'requester') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'agent') {
            // An agent without a department matches no tickets (zero counts).
            $query->where('department_id', $user->department_id);
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
                'stats' => [
                    'total_tickets'       => (clone $query)->count(),
                    'open_tickets'        => (clone $query)->where('status', 'open')->count(),
                    'in_progress_tickets' => (clone $query)->where('status', 'in_progress')->count(),
                    'resolved_tickets'    => (clone $query)->where('status', 'resolved')->count(),
                    'closed_tickets'      => (clone $query)->where('status', 'closed')->count(),
                ],
            ],
        ]);
    }
}
