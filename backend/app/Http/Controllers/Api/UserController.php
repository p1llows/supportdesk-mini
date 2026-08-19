<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
}
