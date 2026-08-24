<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

trait ChecksTicketAccess
{
    /**
     * Enforce ticket-access scoping for the authenticated user.
     *
     * Requesters may only access their own tickets; agents only tickets in
     * their own department; admins any ticket.
     *
     * Returns a 403 JsonResponse when unauthorized, or null when authorized.
     */
    private function authorizeTicketAccess(Request $request, Ticket $ticket): ?JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'requester' && $ticket->user_id !== $user->id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'You are not authorized to access this ticket',
            ], 403);
        }

        if ($user->role === 'agent' && $ticket->department_id !== $user->department_id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'You are not authorized to access this ticket',
            ], 403);
        }

        return null;
    }
}
