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
     * Display a listing of tickets scoped to the user's role.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Ticket::with('user:id,name,email')->orderBy('created_at', 'desc');

        // Requesters can only view their own submitted tickets
        if ($user->role === 'requester') {
            $query->where('user_id', $user->id);
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
                        'department' => $ticket->department,
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
            'department' => ['nullable', 'string', 'max:255'],
        ]);

        $ticket = Ticket::create([
            'user_id' => $user->id, // Force server-side user ownership from Sanctum token
            'title' => $validated['title'],
            'description' => $validated['description'],
            'priority' => $validated['priority'],
            'department' => $validated['department'] ?? null,
            'status' => 'open', // Force default status to open
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Ticket created successfully',
            'data' => [
                'ticket' => [
                    'id' => $ticket->id,
                    'user_id' => $ticket->user_id,
                    'title' => $ticket->title,
                    'description' => $ticket->description,
                    'priority' => $ticket->priority,
                    'status' => $ticket->status,
                    'department' => $ticket->department,
                    'created_at' => $ticket->created_at?->toISOString(),
                    'updated_at' => $ticket->updated_at?->toISOString(),
                ],
            ],
        ], 201);
    }
}
