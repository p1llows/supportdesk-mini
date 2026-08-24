<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Services\TicketNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TicketStatusController extends Controller
{
    /**
     * Update the status of a ticket (Issue #13).
     *
     * Execution order:
     *   1. Role authorization  — Requesters are blocked unconditionally (even on idempotent calls).
     *   2. Validation          — Status value must be a recognised enum member.
     *   3. Transition check    — Enforce forward-only state machine per role.
     *   4. Idempotency no-op   — Return 200 without touching updated_at when already in target state.
     *   5. Persist             — Apply the state change.
     */
    public function update(Request $request, Ticket $ticket): JsonResponse
    {
        $role = $request->user()->role;

        // 1. Authorization (Role Check) — runs before validation to prevent 422 leaking endpoint rules.
        if ($role === 'requester') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Requesters are not authorized to update ticket status',
            ], 403);
        }

        // 2. Validation
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
        ]);

        $target  = $validated['status'];
        $current = $ticket->status;

        // 3. Transition Check — build the allowed-transitions matrix.
        $allowed = false;

        // Idempotent call: same status → always allowed for authorised roles.
        if ($target === $current) {
            $allowed = true;
        }

        // Forward workflow transitions (Agent or Admin).
        if (in_array($role, ['agent', 'admin'], true)) {
            if ($current === 'open'        && $target === 'in_progress') {
                $allowed = true;
            }
            if ($current === 'in_progress' && $target === 'resolved') {
                $allowed = true;
            }
        }

        // Admin-only transitions.
        if ($role === 'admin') {
            if ($current === 'resolved' && $target === 'closed') {
                $allowed = true;
            }
            if ($current === 'closed' && $target === 'open') {
                $allowed = true;
            }
        }

        if (! $allowed) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Invalid status transition for your role',
            ], 403);
        }

        // 4. Idempotency no-op — return success without touching the database or updated_at.
        if ($target === $current) {
            return response()->json([
                'status' => 'success',
                'data'   => ['ticket' => $this->formatTicket($ticket)],
            ], 200);
        }

        // 5. Persist the new status.
        $ticket->update(['status' => $target]);

        // Log status change activity (Day 5)
        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id'   => $request->user()->id,
            'type'      => 'status_change',
            'metadata'  => [
                'old' => $current,
                'new' => $target,
            ],
        ]);

        // Notify related users (e.g. the requester) about the status change
        TicketNotificationService::notifyRelatedUsers(
            $ticket,
            'status_change',
            "Status of \"{$ticket->title}\" changed from {$current} to {$target}",
            $request->user()->id
        );

        return response()->json([
            'status' => 'success',
            'data'   => ['ticket' => $this->formatTicket($ticket)],
        ], 200);
    }

    /**
     * Format a ticket for API responses.
     */
    private function formatTicket(Ticket $ticket): array
    {
        $ticket->load(['department:id,name', 'user:id,name,email']);

        return [
            'id'            => $ticket->id,
            'user_id'       => $ticket->user_id,
            'department_id' => $ticket->department_id,
            'title'         => $ticket->title,
            'description'   => $ticket->description,
            'priority'      => $ticket->priority,
            'status'        => $ticket->status,
            'department'    => $ticket->department ? [
                'id'   => $ticket->department->id,
                'name' => $ticket->department->name,
            ] : null,
            'requester' => $ticket->user ? [
                'id'    => $ticket->user->id,
                'name'  => $ticket->user->name,
                'email' => $ticket->user->email,
            ] : null,
            'created_at' => $ticket->created_at?->toISOString(),
            'updated_at' => $ticket->updated_at?->toISOString(),
        ];
    }
}
