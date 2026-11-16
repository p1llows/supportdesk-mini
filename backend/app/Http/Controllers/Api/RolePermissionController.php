<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RolePermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
    /**
     * Return the full permission matrix for the 3 system roles (Admin only).
     */
    public function index(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Only administrators can view role permissions',
            ], 403);
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'permissions' => RolePermission::matrix(),
            ],
        ]);
    }

    /**
     * Update role permissions in bulk (Admin only).
     */
    public function update(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Only administrators can update role permissions',
            ], 403);
        }

        $validated = $request->validate([
            'permissions'             => ['required', 'array'],
            'permissions.*.key'       => ['required', 'string'],
            'permissions.*.admin'     => ['required', 'boolean'],
            'permissions.*.agent'     => ['required', 'boolean'],
            'permissions.*.requester' => ['required', 'boolean'],
        ]);

        $defsByKey = collect(RolePermission::DEFINITIONS)->keyBy('key');

        foreach ($validated['permissions'] as $item) {
            $def = $defsByKey->get($item['key']);
            if (! $def) {
                continue;
            }

            foreach (['admin', 'agent', 'requester'] as $role) {
                $isLocked = (bool) ($def['locked'][$role] ?? false);
                $allowed = $isLocked ? (bool) $def[$role] : (bool) $item[$role];

                RolePermission::updateOrCreate(
                    ['role' => $role, 'permission' => $item['key']],
                    ['allowed' => $allowed]
                );
            }
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Role permissions updated successfully',
            'data'    => [
                'permissions' => RolePermission::matrix(),
            ],
        ]);
    }
}
