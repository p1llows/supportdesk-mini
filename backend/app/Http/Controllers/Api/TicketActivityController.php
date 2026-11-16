<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ChecksTicketAccess;
use App\Http\Controllers\Controller;
use App\Models\RolePermission;
use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Services\TicketNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketActivityController extends Controller
{
    use ChecksTicketAccess;

    /**
     * List the unified activity timeline for a ticket.
     */
    public function index(Request $request, Ticket $ticket): JsonResponse
    {
        // 1. Authorization — role-scoped ticket access
        if ($response = $this->authorizeTicketAccess($request, $ticket)) {
            return $response;
        }

        // 2. Query & return (chronological; id tiebreaker keeps same-second entries stable)
        // Load top-level activities (no parent) with their replies recursively
        $isRequester = $request->user()->role === 'requester';
        $query = $ticket->activities()
            ->whereNull('parent_id')
            ->with('user:id,name,role')
            ->with(['replies' => function ($q) use ($isRequester) {
                if ($isRequester) {
                    $q->where('is_internal', false);
                }
                $q->with('user:id,name,role')
                  ->with(['replies' => function ($nested) use ($isRequester) {
                      if ($isRequester) {
                          $nested->where('is_internal', false);
                      }
                      $nested->with('user:id,name,role');
                  }]);
            }])
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc');

        if ($isRequester) {
            $query->where('is_internal', false);
        }

        $activities = $query->get();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'activities' => $activities->map(
                    fn (TicketActivity $activity) => $this->formatActivity($activity)
                ),
            ],
        ]);
    }

    /**
     * Add a comment to a ticket's timeline.
     *
     * Execution order:
     *   1. Ticket-access scoping
     *   2. Closed-ticket block (all roles)
     *   3. Validation
     *   4. Create activity
     */
    public function store(Request $request, Ticket $ticket): JsonResponse
    {
        // 1. Authorization — role-scoped ticket access
        if ($response = $this->authorizeTicketAccess($request, $ticket)) {
            return $response;
        }

        // 2. Closed tickets are frozen for all roles (Decision 7)
        if ($ticket->status === 'closed') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Cannot comment on a closed ticket',
            ], 403);
        }

        // 3. Validation
        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'is_internal' => ['nullable', 'boolean'],
            'parent_id' => ['nullable', 'exists:ticket_activities,id', function ($attribute, $value, $fail) use ($ticket) {
                $parent = TicketActivity::find($value);
                if ($parent && $parent->ticket_id !== $ticket->id) {
                    $fail('The selected parent comment is invalid.');
                }
            }],
        ]);

        $isInternal = (bool) ($validated['is_internal'] ?? false);
        if ($isInternal && ! RolePermission::allows($request->user()->role, 'internal_notes')) {
            return response()->json([
                'status'  => 'error',
                'message' => 'You are not authorized to create internal notes',
            ], 403);
        }

        // 4. Create the comment activity
        $activity = TicketActivity::create([
            'ticket_id'   => $ticket->id,
            'user_id'     => $request->user()->id,
            'parent_id'   => $validated['parent_id'] ?? null,
            'type'        => 'comment',
            'body'        => $validated['body'],
            'is_internal' => $isInternal,
        ]);

        // Notify related users about public comments/replies (internal notes do not notify requesters)
        if (! $isInternal) {
            $commentType = ($validated['parent_id'] ?? null) !== null ? 'reply' : 'comment';
            $excerpt = str($validated['body'])->limit(60);
            TicketNotificationService::notifyRelatedUsers(
                $ticket,
                $commentType,
                "{$request->user()->name} commented on \"{$ticket->title}\": {$excerpt}",
                $request->user()->id
            );
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Comment added successfully',
            'data'    => [
                'activity' => $this->formatActivity($activity),
            ],
        ], 201);
    }

    /**
     * Edit an existing comment (Author or Admin, not on closed tickets).
     */
    public function update(Request $request, Ticket $ticket, TicketActivity $activity): JsonResponse
    {
        if ($response = $this->authorizeTicketAccess($request, $ticket)) {
            return $response;
        }

        if ($activity->ticket_id !== $ticket->id || $activity->type !== 'comment') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Comment not found',
            ], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $activity->user_id !== $user->id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'You are not authorized to edit this comment',
            ], 403);
        }

        if ($ticket->status === 'closed') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Cannot edit comments on a closed ticket',
            ], 403);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $activity->body = $validated['body'];
        $activity->save();
        $activity->load('user:id,name,role');

        return response()->json([
            'status'  => 'success',
            'message' => 'Comment updated successfully',
            'data'    => [
                'activity' => $this->formatActivity($activity),
            ],
        ]);
    }

    /**
     * Delete a comment (Admin only).
     *
     * Authorization order:
     *   1. Role check — only admins may delete comments.
     *   2. Ticket-ownership + type check — the activity must belong to
     *      the ticket in the URL AND be of type 'comment'.
     *      Both mismatches return 404 (not 403) per Decisions 8 & 9.
     *   3. Delete.
     */
    public function destroy(Request $request, Ticket $ticket, TicketActivity $activity): JsonResponse
    {
        // 1. Authorization via RolePermission
        if (! RolePermission::allows($request->user()->role, 'delete_comments')) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Only administrators can delete comments',
            ], 403);
        }

        // 2. Verify the activity belongs to THIS ticket (IDOR prevention)
        //    AND is of type 'comment' (not a system event)
        if ((int) $activity->ticket_id !== (int) $ticket->id || $activity->type !== 'comment') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Comment not found',
            ], 404);
        }

        // 3. Delete
        $activity->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Comment deleted successfully',
        ]);
    }

    /**
     * Format an activity entry for API responses.
     */
    private function formatActivity(TicketActivity $activity): array
    {
        $formatted = [
            'id'          => $activity->id,
            'type'        => $activity->type,
            'body'        => $activity->body,
            'is_internal' => (bool) $activity->is_internal,
            'metadata'    => $activity->metadata,
            'parent_id' => $activity->parent_id,
            'is_edited' => $activity->updated_at->gt($activity->created_at),
            'user'      => $activity->user ? [
                'id'   => $activity->user->id,
                'name' => $activity->user->name,
                'role' => $activity->user->role,
            ] : null,
            'created_at' => $activity->created_at?->toISOString(),
            'updated_at' => $activity->updated_at?->toISOString(),
        ];

        // Include replies if loaded
        if ($activity->relationLoaded('replies')) {
            $formatted['replies'] = $activity->replies->map(
                fn (TicketActivity $reply) => $this->formatActivity($reply)
            )->values()->all();
        }

        return $formatted;
    }
}
