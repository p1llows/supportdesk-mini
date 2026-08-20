<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
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
