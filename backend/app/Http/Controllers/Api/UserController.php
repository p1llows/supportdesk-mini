<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of system users (Admins and Agents only).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Enforce backend authorization: Requesters are strictly forbidden from listing users
        if ($user->role === 'requester') {
            return response()->json([
                'status' => 'error',
                'message' => 'Only administrators and agents are authorized to view user directory',
            ], 403);
        }

        $validated = $request->validate([
            'role' => ['nullable', 'string', Rule::in(['admin', 'agent', 'requester'])],
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $query = User::with('department:id,name')
            ->select(['id', 'name', 'email', 'role', 'department_id', 'created_at', 'updated_at'])
            ->orderBy('created_at', 'desc');

        // Apply optional role filter
        if (! empty($validated['role'])) {
            $query->where('role', $validated['role']);
        }

        // Apply optional keyword search on name or email
        if (! empty($validated['search'])) {
            $escapedSearch = addcslashes($validated['search'], '%_\\');
            $query->where(function ($q) use ($escapedSearch) {
                $q->where('name', 'like', "%{$escapedSearch}%")
                  ->orWhere('email', 'like', "%{$escapedSearch}%");
            });
        }

        $users = $query->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'users' => $users->map(function ($u) {
                    return [
                        'id' => $u->id,
                        'name' => $u->name,
                        'email' => $u->email,
                        'role' => $u->role,
                        'department_id' => $u->department_id,
                        'department' => $u->department ? [
                            'id' => $u->department->id,
                            'name' => $u->department->name,
                        ] : null,
                        'created_at' => $u->created_at?->toISOString(),
                        'updated_at' => $u->updated_at?->toISOString(),
                    ];
                }),
            ],
        ]);
    }

    /**
     * Store a newly created user in storage (Administrators only).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // Enforce backend authorization: Only administrators can create users
        if ($user->role !== 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Only administrators are authorized to create new users',
            ], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(['admin', 'agent', 'requester'])],
            'department_id' => [
                'required_if:role,agent',
                'prohibited_unless:role,agent',
                'exists:departments,id'
            ],
        ]);

        $newUser = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'department_id' => $validated['department_id'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'User created successfully',
            'data' => [
                'user' => [
                    'id' => $newUser->id,
                    'name' => $newUser->name,
                    'email' => $newUser->email,
                    'role' => $newUser->role,
                    'department_id' => $newUser->department_id,
                    'created_at' => $newUser->created_at?->toISOString(),
                    'updated_at' => $newUser->updated_at?->toISOString(),
                ],
            ],
        ], 201);
    }

    /**
     * Update an existing user (Administrators only).
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $authUser = $request->user();

        if ($authUser->role !== 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Only administrators are authorized to update users',
            ], 403);
        }

        // Prevent admin from deleting/demoting themselves
        if ($authUser->id === $user->id && $request->has('role') && $request->input('role') !== 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'You cannot change your own role',
            ], 422);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'role' => ['sometimes', 'required', 'string', Rule::in(['admin', 'agent', 'requester'])],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ]);

        $user->update($validated);
        $user->load('department:id,name');

        return response()->json([
            'status' => 'success',
            'message' => 'User updated successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'department_id' => $user->department_id,
                    'department' => $user->department ? [
                        'id' => $user->department->id,
                        'name' => $user->department->name,
                    ] : null,
                    'created_at' => $user->created_at?->toISOString(),
                    'updated_at' => $user->updated_at?->toISOString(),
                ],
            ],
        ]);
    }

    /**
     * Remove the specified user (Administrators only).
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $authUser = $request->user();

        if ($authUser->role !== 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Only administrators are authorized to delete users',
            ], 403);
        }

        // Prevent admin from deleting themselves
        if ($authUser->id === $user->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'You cannot delete your own account',
            ], 422);
        }

        // Check if user has any tickets
        if (Ticket::where('user_id', $user->id)->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot delete user with existing tickets. Reassign or delete their tickets first.',
            ], 409);
        }

        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'User deleted successfully',
        ]);
    }
}
