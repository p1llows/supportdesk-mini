<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
                    'avatar_url' => $user->avatar_url,
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

    /**
     * Upload or replace the authenticated user's avatar image.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
        ]);

        $user = $request->user();

        if ($user->avatar_path && Storage::disk('local')->exists($user->avatar_path)) {
            Storage::disk('local')->delete($user->avatar_path);
        }

        $path = $request->file('avatar')->store("avatars/{$user->id}", 'local');
        $user->avatar_path = $path;
        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Avatar updated successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'department_id' => $user->department_id,
                    'avatar_url' => $user->avatar_url,
                    'created_at' => $user->created_at?->toISOString(),
                ],
            ],
        ]);
    }

    /**
     * Remove the authenticated user's avatar image.
     */
    public function removeAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->avatar_path && Storage::disk('local')->exists($user->avatar_path)) {
            Storage::disk('local')->delete($user->avatar_path);
        }

        $user->avatar_path = null;
        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Avatar removed successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'department_id' => $user->department_id,
                    'avatar_url' => null,
                    'created_at' => $user->created_at?->toISOString(),
                ],
            ],
        ]);
    }

    /**
     * Serve a user's avatar image.
     */
    public function showAvatar(User $user): StreamedResponse|JsonResponse
    {
        if (! $user->avatar_path || ! Storage::disk('local')->exists($user->avatar_path)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Avatar not found',
            ], 404);
        }

        return Storage::disk('local')->response($user->avatar_path);
    }
}
