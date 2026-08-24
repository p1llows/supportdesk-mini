<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Ticket;
use App\Models\User;

class TicketNotificationService
{
    /**
     * Notify every user related to a ticket (the requester who owns it,
     * agents assigned to the ticket's department, and all administrators),
     * excluding the user whose action triggered the event.
     */
    public static function notifyRelatedUsers(Ticket $ticket, string $type, string $message, int $actorId): void
    {
        $recipients = User::query()
            ->where(function ($query) use ($ticket) {
                $query->where('id', $ticket->user_id)                                  // ticket owner
                    ->orWhere(function ($q) use ($ticket) {
                        $q->where('role', 'agent')->where('department_id', $ticket->department_id); // department agents
                    })
                    ->orWhere('role', 'admin');                                        // administrators
            })
            ->where('id', '!=', $actorId)
            ->pluck('id');

        $rows = $recipients->map(fn (int $userId) => [
            'user_id'    => $userId,
            'ticket_id'  => $ticket->id,
            'actor_id'   => $actorId,
            'type'       => $type,
            'message'    => $message,
            'read_at'    => null,
            'created_at' => now(),
            'updated_at' => now(),
        ])->all();

        if ($rows !== []) {
            Notification::insert($rows);
        }
    }
}
