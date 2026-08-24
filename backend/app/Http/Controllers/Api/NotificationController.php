<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * List the authenticated user's notifications (latest first) with an unread count.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = Notification::with('actor:id,name')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->limit(20)
            ->get();

        $unreadCount = Notification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'notifications' => $notifications->map(
                    fn (Notification $notification) => $this->formatNotification($notification)
                ),
                'unread_count' => $unreadCount,
            ],
        ]);
    }

    /**
     * Mark a single notification as read (owner only).
     */
    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        // IDOR prevention — notifications are private to their recipient
        if ((int) $notification->user_id !== (int) $request->user()->id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Notification not found',
            ], 404);
        }

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Notification marked as read',
        ]);
    }

    /**
     * Mark all of the authenticated user's notifications as read.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'status'  => 'success',
            'message' => 'All notifications marked as read',
        ]);
    }

    /**
     * Format a notification for API responses.
     */
    private function formatNotification(Notification $notification): array
    {
        return [
            'id'         => $notification->id,
            'ticket_id'  => $notification->ticket_id,
            'type'       => $notification->type,
            'message'    => $notification->message,
            'read_at'    => $notification->read_at?->toISOString(),
            'is_read'    => $notification->read_at !== null,
            'actor'      => $notification->actor ? [
                'id'   => $notification->actor->id,
                'name' => $notification->actor->name,
            ] : null,
            'created_at' => $notification->created_at?->toISOString(),
        ];
    }
}
