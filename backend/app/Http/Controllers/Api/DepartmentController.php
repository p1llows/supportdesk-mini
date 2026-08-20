<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\User;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DepartmentController extends Controller
{
    /**
     * Display a listing of active departments for dropdown selection.
     */
    public function index(Request $request): JsonResponse
    {
        $departments = Department::orderBy('name', 'asc')->get(['id', 'name', 'description']);

        return response()->json([
            'status' => 'success',
            'data' => [
                'departments' => $departments,
            ],
        ]);
    }

    /**
     * Store a new department and its support agent.
     */
    public function store(Request $request): JsonResponse
    {
        // 1. Authorization
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Only administrators can create departments',
            ], 403);
        }

        // 2. Validation
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'agent_name' => 'required|string|max:255',
            'agent_email' => 'required|string|email|max:255|unique:users,email',
            'agent_password' => 'required|string|min:8',
        ]);

        // 3. Business logic (Atomic Transaction)
        DB::transaction(function () use ($validated) {
            $dept = Department::create([
                'name' => $validated['name'],
            ]);

            User::create([
                'name' => $validated['agent_name'],
                'email' => $validated['agent_email'],
                'password' => Hash::make($validated['agent_password']),
                'role' => 'agent',
                'department_id' => $dept->id,
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Department and Agent created',
        ], 201);
    }

    /**
     * Update the specified department.
     */
    public function update(Request $request, Department $department): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $department->update($validated);

        return response()->json(['status' => 'success', 'data' => ['department' => $department]]);
    }

    /**
     * Remove the specified department.
     */
    public function destroy(Request $request, Department $department): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        if (User::where('department_id', $department->id)->exists() || Ticket::where('department_id', $department->id)->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot delete department that has users or tickets assigned.',
            ], 409);
        }

        $department->delete();

        return response()->json(['status' => 'success']);
    }
}
