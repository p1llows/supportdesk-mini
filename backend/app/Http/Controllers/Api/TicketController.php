<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TicketController extends Controller
{
    /**
     * Display a listing of tickets scoped to the user's role and search/filter criteria.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
            'priority' => ['nullable', 'string', Rule::in(['low', 'medium', 'high'])],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')],
        ]);

        $user = $request->user();

        $query = Ticket::with([
            'user:id,name,email',
            'department:id,name',
        ])->orderBy('created_at', 'desc');

        // Requesters can only view their own submitted tickets
        if ($user->role === 'requester') {
            $query->where('user_id', $user->id);
        }

        // Apply search keyword filter wrapped in closure grouping to preserve requester isolation
        if (! empty($validated['search'])) {
            $escapedSearch = addcslashes($validated['search'], '%_\\');
            $query->where(function ($q) use ($escapedSearch) {
                $q->where('title', 'like', "%{$escapedSearch}%")
                  ->orWhere('description', 'like', "%{$escapedSearch}%");
            });
        }

        // Apply status filter
        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        // Apply priority filter
        if (! empty($validated['priority'])) {
            $query->where('priority', $validated['priority']);
        }

        // Apply department_id filter
        if (! empty($validated['department_id'])) {
            $query->where('department_id', $validated['department_id']);
        }

        $tickets = $query->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'tickets' => $tickets->map(function ($ticket) {
                    return [
                        'id' => $ticket->id,
                        'title' => $ticket->title,
                        'description' => $ticket->description,
                        'priority' => $ticket->priority,
                        'status' => $ticket->status,
                        'department' => $ticket->department ? [
                            'id' => $ticket->department->id,
                            'name' => $ticket->department->name,
                        ] : null,
                        'requester' => $ticket->user ? [
                            'id' => $ticket->user->id,
                            'name' => $ticket->user->name,
                            'email' => $ticket->user->email,
                        ] : null,
                        'created_at' => $ticket->created_at?->toISOString(),
                        'updated_at' => $ticket->updated_at?->toISOString(),
                    ];
                }),
            ],
        ]);
    }

    /**
     * Store a newly created ticket in storage (Requesters only).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // Enforce backend authorization: Only requesters can submit tickets
        if ($user->role !== 'requester') {
            return response()->json([
                'status' => 'error',
                'message' => 'Only requesters are authorized to submit new tickets',
            ], 403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'priority' => ['required', 'string', Rule::in(['low', 'medium', 'high'])],
            'department_id' => ['required', 'integer', Rule::exists('departments', 'id')],
        ]);

        $ticket = Ticket::create([
            'user_id' => $user->id, // Force server-side user ownership from Sanctum token
            'department_id' => $validated['department_id'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'priority' => $validated['priority'],
            'status' => 'open', // Force default status to open
        ]);

        $ticket->load('department:id,name');

        return response()->json([
            'status' => 'success',
            'message' => 'Ticket created successfully',
            'data' => [
                'ticket' => [
                    'id' => $ticket->id,
                    'user_id' => $ticket->user_id,
                    'department_id' => $ticket->department_id,
                    'title' => $ticket->title,
                    'description' => $ticket->description,
                    'priority' => $ticket->priority,
                    'status' => $ticket->status,
                    'department' => $ticket->department ? [
                        'id' => $ticket->department->id,
                        'name' => $ticket->department->name,
                    ] : null,
                    'created_at' => $ticket->created_at?->toISOString(),
                    'updated_at' => $ticket->updated_at?->toISOString(),
                ],
            ],
        ], 201);
    }

    /**
     * Update an existing ticket (Issue #12).
     */
    public function update(Request $request, Ticket $ticket): JsonResponse
    {
        $user = $request->user();

        // 1. Universal Closed Ticket Lock: No role may modify a closed ticket
        if ($ticket->status === 'closed') {
            return response()->json([
                'status' => 'error',
                'message' => 'Closed tickets cannot be modified',
            ], 403);
        }

        // 2. Role & Ownership Authorization
        if ($user->role === 'requester') {
            // Requesters can only edit their own tickets and only when status is 'open'
            if ($ticket->user_id !== $user->id || $ticket->status !== 'open') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Requesters can only edit their own open tickets',
                ], 403);
            }
        }

        // 3. Validation (status is explicitly excluded to ensure status immutability)
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'priority' => ['sometimes', 'required', 'string', Rule::in(['low', 'medium', 'high'])],
            'department_id' => ['sometimes', 'required', 'integer', Rule::exists('departments', 'id')],
        ]);

        $ticket->update($validated);
        $ticket->load(['department:id,name', 'user:id,name,email']);

        return response()->json([
            'status' => 'success',
            'message' => 'Ticket updated successfully',
            'data' => [
                'ticket' => [
                    'id' => $ticket->id,
                    'user_id' => $ticket->user_id,
                    'department_id' => $ticket->department_id,
                    'title' => $ticket->title,
                    'description' => $ticket->description,
                    'priority' => $ticket->priority,
                    'status' => $ticket->status,
                    'department' => $ticket->department ? [
                        'id' => $ticket->department->id,
                        'name' => $ticket->department->name,
                    ] : null,
                    'requester' => $ticket->user ? [
                        'id' => $ticket->user->id,
                        'name' => $ticket->user->name,
                        'email' => $ticket->user->email,
                    ] : null,
                    'created_at' => $ticket->created_at?->toISOString(),
                    'updated_at' => $ticket->updated_at?->toISOString(),
                ],
            ],
        ]);
    }

    /**
     * Delete an existing ticket (Administrators only - Issue #12).
     */
    public function destroy(Request $request, Ticket $ticket): JsonResponse
    {
        $user = $request->user();

        // Enforce backend authorization: Only administrators can delete tickets
        if ($user->role !== 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Only administrators are authorized to delete tickets',
            ], 403);
        }

        $ticket->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Ticket deleted successfully',
        ]);
    }
}
