<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private function seedTicket(): array
    {
        $department = Department::firstOrCreate(['name' => 'Information Technology']);

        $requester = User::create([
            'name'          => 'Requester One',
            'email'         => 'requester@example.com',
            'password'      => 'password123',
            'role'          => 'requester',
            'department_id' => $department->id,
        ]);

        $agent = User::create([
            'name'          => 'Agent One',
            'email'         => 'agent@example.com',
            'password'      => 'password123',
            'role'          => 'agent',
            'department_id' => $department->id,
        ]);

        $admin = User::create([
            'name'     => 'Admin One',
            'email'    => 'admin@example.com',
            'password' => 'password123',
            'role'     => 'admin',
        ]);

        $ticket = Ticket::create([
            'user_id'       => $requester->id,
            'department_id' => $department->id,
            'title'         => 'Broken printer',
            'description'   => 'The office printer is broken.',
            'priority'      => 'medium',
            'status'        => 'open',
        ]);

        return [$requester, $agent, $admin, $ticket, $department];
    }

    public function test_new_ticket_notifies_department_agents_and_admins(): void
    {
        [$requester, $agent, $admin, $ticket, $department] = $this->seedTicket();

        // Simulate the store hook (ticket creation path)
        \App\Services\TicketNotificationService::notifyRelatedUsers(
            $ticket,
            'ticket_created',
            "New ticket \"{$ticket->title}\" submitted in {$department->name}",
            $requester->id
        );

        // Agent and admin are notified; the acting requester is not
        $this->assertDatabaseHas('notifications', ['user_id' => $agent->id, 'type' => 'ticket_created']);
        $this->assertDatabaseHas('notifications', ['user_id' => $admin->id, 'type' => 'ticket_created']);
        $this->assertDatabaseMissing('notifications', ['user_id' => $requester->id]);
    }

    public function test_status_change_notifies_requester_but_not_actor(): void
    {
        [$requester, $agent, , $ticket] = $this->seedTicket();

        $response = $this->actingAs($agent)->patchJson("/api/v1/tickets/{$ticket->id}/status", [
            'status' => 'in_progress',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('notifications', [
            'user_id'  => $requester->id,
            'type'     => 'status_change',
            'ticket_id' => $ticket->id,
        ]);
        // The agent who performed the transition must not self-notify
        $this->assertDatabaseMissing('notifications', ['user_id' => $agent->id]);
    }

    public function test_comment_notifies_ticket_owner(): void
    {
        [$requester, $agent, , $ticket] = $this->seedTicket();

        $response = $this->actingAs($agent)->postJson("/api/v1/tickets/{$ticket->id}/comments", [
            'body' => 'Looking into this now.',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('notifications', [
            'user_id'  => $requester->id,
            'type'     => 'comment',
            'ticket_id' => $ticket->id,
        ]);
    }

    public function test_user_can_list_notifications_with_unread_count(): void
    {
        [$requester, $agent, , $ticket] = $this->seedTicket();

        \App\Models\Notification::create([
            'user_id'   => $requester->id,
            'ticket_id' => $ticket->id,
            'actor_id'  => $agent->id,
            'type'      => 'status_change',
            'message'   => 'Status changed',
        ]);

        $response = $this->actingAs($requester)->getJson('/api/v1/notifications');

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data.notifications')
            ->assertJsonPath('data.unread_count', 1)
            ->assertJsonPath('data.notifications.0.ticket_id', $ticket->id);
    }

    public function test_user_can_mark_notification_read(): void
    {
        [$requester, $agent, , $ticket] = $this->seedTicket();

        $notification = \App\Models\Notification::create([
            'user_id'   => $requester->id,
            'ticket_id' => $ticket->id,
            'actor_id'  => $agent->id,
            'type'      => 'comment',
            'message'   => 'New comment',
        ]);

        // Another user cannot mark someone else's notification (IDOR)
        $this->actingAs($agent)->postJson("/api/v1/notifications/{$notification->id}/read")
            ->assertNotFound();

        $this->actingAs($requester)->postJson("/api/v1/notifications/{$notification->id}/read")
            ->assertOk();

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_user_can_mark_all_notifications_read(): void
    {
        [$requester, $agent, , $ticket] = $this->seedTicket();

        foreach (['comment', 'status_change'] as $type) {
            \App\Models\Notification::create([
                'user_id'   => $requester->id,
                'ticket_id' => $ticket->id,
                'actor_id'  => $agent->id,
                'type'      => $type,
                'message'   => 'Test notification',
            ]);
        }

        $this->actingAs($requester)->postJson('/api/v1/notifications/read-all')
            ->assertOk();

        $this->assertSame(0, \App\Models\Notification::where('user_id', $requester->id)->whereNull('read_at')->count());
    }

    public function test_notifications_require_authentication(): void
    {
        $this->getJson('/api/v1/notifications')->assertUnauthorized();
    }
}
