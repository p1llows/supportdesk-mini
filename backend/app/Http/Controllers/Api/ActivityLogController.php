<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TicketActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ActivityLogController extends Controller
{
    /**
     * List system-wide ticket activity logs (Administrators only).
     */
    public function index(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Only administrators can view system activity logs',
            ], 403);
        }

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'type'   => ['nullable', 'string', Rule::in([
                'created',
                'comment',
                'status_change',
                'priority_change',
                'department_change',
                'assigned',
            ])],
        ]);

        $query = TicketActivity::with([
            'ticket:id,title,status',
            'user:id,name,email,role',
        ])
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc');

        if (! empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        if (! empty($validated['search'])) {
            $escaped = addcslashes($validated['search'], '%_\\');
            $query->where(function ($q) use ($escaped) {
                $q->where('body', 'like', "%{$escaped}%")
                    ->orWhereHas('ticket', fn ($tq) => $tq->where('title', 'like', "%{$escaped}%"))
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$escaped}%")
                        ->orWhere('email', 'like', "%{$escaped}%"));
            });
        }

        $activities = $query->limit(250)->get()->map(fn (TicketActivity $activity) => [
            'id'          => $activity->id,
            'type'        => $activity->type,
            'body'        => $activity->body,
            'is_internal' => (bool) $activity->is_internal,
            'metadata'    => $activity->metadata,
            'ticket'      => $activity->ticket ? [
                'id'     => $activity->ticket->id,
                'title'  => $activity->ticket->title,
                'status' => $activity->ticket->status,
            ] : null,
            'user'        => $activity->user ? [
                'id'    => $activity->user->id,
                'name'  => $activity->user->name,
                'email' => $activity->user->email,
                'role'  => $activity->user->role,
            ] : null,
            'created_at'  => $activity->created_at?->toISOString(),
        ]);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'activities' => $activities,
            ],
        ]);
    }
}
