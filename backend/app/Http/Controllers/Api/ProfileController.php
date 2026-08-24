<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /**
     * Update the authenticated user's own profile details (name and email).
     */
    public function update(Request $request): JsonResponse
    {
        // 1. Validation (all roles may edit their own name/email)
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($request->user()->id)],
        ]);

        // 2. Business logic
        $user = $request->user();
        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'department_id' => $user->department_id,
                    'created_at' => $user->created_at?->toISOString(),
                ],
            ],
        ]);
    }

    /**
     * Update the authenticated user's own password.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        // 1. Validation
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        // 2. Authorization — current password must be correct
        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'The current password is incorrect.',
            ], 422);
        }

        // 3. Business logic
        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Password updated successfully',
        ]);
    }

    /**
     * Update the requester's department.
     */
    public function updateDepartment(Request $request)
    {
        // 1. Authorization
        if ($request->user()->role !== 'requester') {
            return response()->json([
                'status' => 'error',
                'message' => 'Only requesters can update their own department.',
            ], 403);
        }

        // 2. Validation
        $validated = $request->validate([
            'department_id' => ['required', 'exists:departments,id'],
        ]);

        // 3. Business logic
        $user = $request->user();
        $user->update([
            'department_id' => $validated['department_id'],
        ]);

        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'department_id' => $user->department_id,
                ],
            ],
        ]);
    }
}
