<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ChecksTicketAccess;
use App\Http\Controllers\Controller;
use App\Models\RolePermission;
use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Models\TicketAttachment;
use App\Models\User;
use App\Services\TicketNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TicketController extends Controller
{
    use ChecksTicketAccess;

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
            'assignee:id,name,email',
        ])->orderBy('created_at', 'desc');

        // Requesters can only view their own submitted tickets
        if ($user->role === 'requester') {
            $query->where('user_id', $user->id);
        }

        // Agents can only view tickets in their department
        if ($user->role === 'agent') {
            $query->where('department_id', $user->department_id);
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
                        'assigned_to' => $ticket->assigned_to,
                        'assignee' => $ticket->assignee ? [
                            'id' => $ticket->assignee->id,
                            'name' => $ticket->assignee->name,
                            'email' => $ticket->assignee->email,
                        ] : null,
                        'created_at' => $ticket->created_at?->toISOString(),
                        'updated_at' => $ticket->updated_at?->toISOString(),
                    ];
                }),
            ],
        ]);
    }

    /**
     * Display the specified ticket (Day 5 — ticket detail view).
     */
    public function show(Request $request, Ticket $ticket): JsonResponse
    {
        // 1. Authorization — role-scoped ticket access
        if ($response = $this->authorizeTicketAccess($request, $ticket)) {
            return $response;
        }

        // 2. Load & return
        $ticket->load(['department:id,name', 'user:id,name,email', 'assignee:id,name,email', 'attachments']);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'ticket' => [
                    'id'          => $ticket->id,
                    'title'       => $ticket->title,
                    'description' => $ticket->description,
                    'priority'    => $ticket->priority,
                    'status'      => $ticket->status,
                    'assigned_to' => $ticket->assigned_to,
                    'department'  => $ticket->department ? [
                        'id'   => $ticket->department->id,
                        'name' => $ticket->department->name,
                    ] : null,
                    'requester' => $ticket->user ? [
                        'id'    => $ticket->user->id,
                        'name'  => $ticket->user->name,
                        'email' => $ticket->user->email,
                    ] : null,
                    'assignee' => $ticket->assignee ? [
                        'id'    => $ticket->assignee->id,
                        'name'  => $ticket->assignee->name,
                        'email' => $ticket->assignee->email,
                    ] : null,
                    'attachments' => $ticket->attachments->map(
                        fn (TicketAttachment $attachment) => $this->formatAttachment($attachment)
                    )->values()->all(),
                    'created_at' => $ticket->created_at?->toISOString(),
                    'updated_at' => $ticket->updated_at?->toISOString(),
                ],
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

        if (!$user->department_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'a department must be selected first',
            ], 403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'priority' => ['required', 'string', Rule::in(['low', 'medium', 'high'])],
            'department_id' => ['required', 'integer', Rule::exists('departments', 'id')],
            'attachments' => ['sometimes', 'array', 'max:3'],
            'attachments.*' => [
                'file',
                'max:5120', // kilobytes = 5 MB per file
                'mimes:jpg,jpeg,png,gif,webp,pdf,txt,csv,doc,docx,xls,xlsx,zip',
            ],
        ]);

        $ticket = Ticket::create([
            'user_id' => $user->id, // Force server-side user ownership from Sanctum token
            'department_id' => $validated['department_id'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'priority' => $validated['priority'],
            'status' => 'open', // Force default status to open
        ]);

        // Store any uploaded attachments on the private local disk.
        foreach ($request->file('attachments', []) as $file) {
            $ticket->attachments()->create([
                'user_id' => $user->id,
                'original_name' => $file->getClientOriginalName(),
                'stored_path' => $file->store("attachments/{$ticket->id}", 'local'),
                'mime_type' => $file->getClientMimeType(),
                'size_bytes' => $file->getSize(),
            ]);
        }

        $ticket->load(['department:id,name', 'attachments']);

        // Log the timeline's starting event (Day 5)
        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id'   => $user->id,
            'type'      => 'created',
        ]);

        // Notify department agents and administrators of the new ticket
        TicketNotificationService::notifyRelatedUsers(
            $ticket,
            'ticket_created',
            "New ticket \"{$ticket->title}\" submitted in {$ticket->department?->name}",
            $user->id
        );

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
                    'attachments' => $ticket->attachments->map(
                        fn (TicketAttachment $attachment) => $this->formatAttachment($attachment)
                    )->values()->all(),
                    'created_at' => $ticket->created_at?->toISOString(),
                    'updated_at' => $ticket->updated_at?->toISOString(),
                ],
            ],
        ], 201);
    }

    /**
     * Format an attachment for API responses (metadata only — never the path).
     */
    private function formatAttachment(TicketAttachment $attachment): array
    {
        return [
            'id' => $attachment->id,
            'original_name' => $attachment->original_name,
            'mime_type' => $attachment->mime_type,
            'size_bytes' => $attachment->size_bytes,
            'created_at' => $attachment->created_at?->toISOString(),
        ];
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

        // Capture old values BEFORE the update is applied (Day 5 activity logging)
        $oldPriority       = $ticket->priority;
        $oldDepartmentId   = $ticket->department_id;
        $oldDepartmentName = $ticket->department?->name;

        // Apply the update
        $ticket->update($validated);

        // Reload relationship in case department_id changed
        $ticket->load(['department:id,name', 'user:id,name,email']);

        // Log priority change ONLY if the value actually changed
        if (array_key_exists('priority', $validated) && $oldPriority !== $ticket->priority) {
            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'user_id'   => $user->id,
                'type'      => 'priority_change',
                'metadata'  => [
                    'old' => $oldPriority,
                    'new' => $ticket->priority,
                ],
            ]);

            TicketNotificationService::notifyRelatedUsers(
                $ticket,
                'priority_change',
                "Priority of \"{$ticket->title}\" changed from {$oldPriority} to {$ticket->priority}",
                $user->id
            );
        }

        // Log department change ONLY if the value actually changed
        if (array_key_exists('department_id', $validated) && $oldDepartmentId !== $ticket->department_id) {
            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'user_id'   => $user->id,
                'type'      => 'department_change',
                'metadata'  => [
                    'old' => $oldDepartmentName,
                    'new' => $ticket->department?->name,
                ],
            ]);

            TicketNotificationService::notifyRelatedUsers(
                $ticket,
                'department_change',
                "Ticket \"{$ticket->title}\" moved to {$ticket->department?->name}",
                $user->id
            );
        }

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

        // Enforce backend authorization via RolePermission
        if (! RolePermission::allows($user->role, 'delete_tickets')) {
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

    /**
     * Assign or unassign a ticket to a support agent (Admin or department Agent).
     */
    public function assign(Request $request, Ticket $ticket): JsonResponse
    {
        $user = $request->user();

        if (! RolePermission::allows($user->role, 'assign_tickets')) {
            return response()->json([
                'status' => 'error',
                'message' => 'You are not authorized to assign tickets',
            ], 403);
        }

        if ($user->role === 'agent' && $ticket->department_id !== $user->department_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'You can only assign tickets in your own department',
            ], 403);
        }

        if ($ticket->status === 'closed') {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot reassign a closed ticket',
            ], 422);
        }

        $validated = $request->validate([
            'assigned_to' => ['nullable', 'integer', Rule::exists('users', 'id')],
        ]);

        $targetId = $validated['assigned_to'] ?? null;
        $targetUser = $targetId ? User::find($targetId) : null;

        if ($targetUser) {
            if (! in_array($targetUser->role, ['agent', 'admin'], true)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Tickets can only be assigned to agents or administrators',
                ], 422);
            }

            if ($targetUser->role === 'agent' && $targetUser->department_id !== $ticket->department_id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Selected agent does not belong to this ticket\'s department',
                ], 422);
            }
        }

        $oldAssigneeName = $ticket->assignee?->name;
        if ($ticket->assigned_to !== $targetId) {
            $ticket->assigned_to = $targetId;
            $ticket->save();
            $ticket->load('assignee:id,name,email');

            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'user_id'   => $user->id,
                'type'      => 'assigned',
                'metadata'  => [
                    'old' => $oldAssigneeName,
                    'new' => $ticket->assignee?->name,
                ],
            ]);
        } else {
            $ticket->load('assignee:id,name,email');
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Ticket assignment updated',
            'data' => [
                'ticket' => [
                    'id' => $ticket->id,
                    'assigned_to' => $ticket->assigned_to,
                    'assignee' => $ticket->assignee ? [
                        'id' => $ticket->assignee->id,
                        'name' => $ticket->assignee->name,
                        'email' => $ticket->assignee->email,
                    ] : null,
                ],
            ],
        ]);
    }
}
