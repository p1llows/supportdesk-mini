<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
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

        $query = User::select(['id', 'name', 'email', 'role', 'created_at', 'updated_at'])
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
        ]);

        $newUser = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
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
                    'created_at' => $newUser->created_at?->toISOString(),
                    'updated_at' => $newUser->updated_at?->toISOString(),
                ],
            ],
        ], 201);
    }
}
