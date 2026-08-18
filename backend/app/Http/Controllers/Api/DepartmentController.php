<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
}
