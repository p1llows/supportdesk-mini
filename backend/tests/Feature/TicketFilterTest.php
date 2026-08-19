<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketFilterTest extends TestCase
{
    use RefreshDatabase;

    private function getDepartmentId(string $name = 'Information Technology'): int
    {
        $dept = Department::where('name', $name)->first();
        if (! $dept) {
            $this->seed(\Database\Seeders\DepartmentSeeder::class);
            $dept = Department::where('name', $name)->first();
        }

        return $dept->id;
    }

    public function test_unauthenticated_user_cannot_access_tickets_list(): void
    {
        $response = $this->getJson('/api/v1/tickets');

        $response->assertStatus(401);
    }

    public function test_authenticated_requester_only_sees_their_own_tickets(): void
    {
        $requester1 = User::factory()->create(['role' => 'requester']);
        $requester2 = User::factory()->create(['role' => 'requester']);
        $deptId = $this->getDepartmentId();

        Ticket::create([
            'user_id' => $requester1->id,
            'department_id' => $deptId,
            'title' => 'Requester 1 Ticket',
            'description' => 'Description 1',
            'priority' => 'low',
            'status' => 'open',
        ]);

        Ticket::create([
            'user_id' => $requester2->id,
            'department_id' => $deptId,
            'title' => 'Requester 2 Ticket',
            'description' => 'Description 2',
            'priority' => 'high',
            'status' => 'open',
        ]);

        $response = $this->actingAs($requester1, 'sanctum')
            ->getJson('/api/v1/tickets');

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertCount(1, $tickets);
        $this->assertEquals('Requester 1 Ticket', $tickets[0]['title']);
    }

    public function test_search_filters_tickets_by_title_keyword(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $deptId = $this->getDepartmentId();

        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $deptId,
            'title' => 'Printer jams on 3rd floor',
            'description' => 'Hardware issue with paper tray',
            'priority' => 'medium',
            'status' => 'open',
        ]);

        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $deptId,
            'title' => 'Email login failure',
            'description' => 'Cannot sign in to corporate inbox',
            'priority' => 'high',
            'status' => 'open',
        ]);

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson('/api/v1/tickets?search=Printer');

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertCount(1, $tickets);
        $this->assertEquals('Printer jams on 3rd floor', $tickets[0]['title']);
    }

    public function test_search_filters_tickets_by_description_keyword(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $deptId = $this->getDepartmentId();

        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $deptId,
            'title' => 'Software Update Problem',
            'description' => 'Workstation blue screen during update',
            'priority' => 'high',
            'status' => 'open',
        ]);

        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $deptId,
            'title' => 'New Monitor Request',
            'description' => 'Need second monitor for dual screen setup',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson('/api/v1/tickets?search=blue screen');

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertCount(1, $tickets);
        $this->assertEquals('Software Update Problem', $tickets[0]['title']);
    }

    public function test_search_does_not_leak_another_requesters_ticket_even_when_description_matches(): void
    {
        $requesterA = User::factory()->create(['role' => 'requester']);
        $requesterB = User::factory()->create(['role' => 'requester']);
        $deptId = $this->getDepartmentId();

        // Requester A's ticket (does not match search keyword)
        Ticket::create([
            'user_id' => $requesterA->id,
            'department_id' => $deptId,
            'title' => 'Monitors Flickering',
            'description' => 'Display cable loose',
            'priority' => 'low',
            'status' => 'open',
        ]);

        // Requester B's ticket (description DOES match search keyword 'confidential')
        Ticket::create([
            'user_id' => $requesterB->id,
            'department_id' => $deptId,
            'title' => 'HR Records Access',
            'description' => 'Request access to confidential personnel files',
            'priority' => 'high',
            'status' => 'open',
        ]);

        // Requester A searches for 'confidential'
        $response = $this->actingAs($requesterA, 'sanctum')
            ->getJson('/api/v1/tickets?search=confidential');

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        // MUST return 0 tickets; Requester B's ticket MUST NOT leak
        $this->assertCount(0, $tickets);
    }

    public function test_can_filter_tickets_by_status(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $deptId = $this->getDepartmentId();

        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $deptId,
            'title' => 'Open Ticket',
            'description' => 'Descr 1',
            'priority' => 'low',
            'status' => 'open',
        ]);

        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $deptId,
            'title' => 'In Progress Ticket',
            'description' => 'Descr 2',
            'priority' => 'medium',
            'status' => 'in_progress',
        ]);

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson('/api/v1/tickets?status=in_progress');

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertCount(1, $tickets);
        $this->assertEquals('In Progress Ticket', $tickets[0]['title']);
    }

    public function test_can_filter_tickets_by_priority(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $deptId = $this->getDepartmentId();

        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $deptId,
            'title' => 'Low Priority Ticket',
            'description' => 'Descr 1',
            'priority' => 'low',
            'status' => 'open',
        ]);

        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $deptId,
            'title' => 'High Priority Ticket',
            'description' => 'Descr 2',
            'priority' => 'high',
            'status' => 'open',
        ]);

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson('/api/v1/tickets?priority=high');

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertCount(1, $tickets);
        $this->assertEquals('High Priority Ticket', $tickets[0]['title']);
    }

    public function test_can_filter_tickets_by_department_id(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $itDeptId = $this->getDepartmentId('Information Technology');
        $hrDeptId = $this->getDepartmentId('Human Resources');

        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $itDeptId,
            'title' => 'IT Ticket',
            'description' => 'Descr IT',
            'priority' => 'low',
            'status' => 'open',
        ]);

        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $hrDeptId,
            'title' => 'HR Ticket',
            'description' => 'Descr HR',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson('/api/v1/tickets?department_id='.$hrDeptId);

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertCount(1, $tickets);
        $this->assertEquals('HR Ticket', $tickets[0]['title']);
    }

    public function test_combined_filters_use_and_semantics(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $itDeptId = $this->getDepartmentId('Information Technology');
        $hrDeptId = $this->getDepartmentId('Human Resources');

        // Ticket 1: Matches search, status, priority, and department_id
        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $itDeptId,
            'title' => 'Network Switch Failure',
            'description' => 'Main rack switch down',
            'priority' => 'high',
            'status' => 'open',
        ]);

        // Ticket 2: Matches search, priority, department_id, but status is in_progress
        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $itDeptId,
            'title' => 'Network Cable Snapped',
            'description' => 'Patch cable broken',
            'priority' => 'high',
            'status' => 'in_progress',
        ]);

        // Ticket 3: Matches search, status, priority, but department is HR
        Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $hrDeptId,
            'title' => 'Network Access for HR New Hire',
            'description' => 'Grant network folder access',
            'priority' => 'high',
            'status' => 'open',
        ]);

        $url = '/api/v1/tickets?search=Network&status=open&priority=high&department_id='.$itDeptId;
        $response = $this->actingAs($requester, 'sanctum')->getJson($url);

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertCount(1, $tickets);
        $this->assertEquals('Network Switch Failure', $tickets[0]['title']);
    }

    public function test_invalid_status_returns_422(): void
    {
        $user = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/tickets?status=invalid_status_value');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_invalid_priority_returns_422(): void
    {
        $user = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/tickets?priority=super_urgent');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['priority']);
    }

    public function test_invalid_department_id_returns_422(): void
    {
        $user = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/tickets?department_id=999999');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['department_id']);
    }

    public function test_non_integer_department_id_returns_422(): void
    {
        $user = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/tickets?department_id=abc');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['department_id']);
    }

    public function test_default_ticket_ordering_is_created_at_descending(): void
    {
        $requester = User::factory()->create(['role' => 'requester']);
        $deptId = $this->getDepartmentId();

        $ticket1 = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $deptId,
            'title' => 'First Ticket Older',
            'description' => 'Descr',
            'priority' => 'low',
            'status' => 'open',
        ]);
        $ticket1->created_at = now()->subHours(2);
        $ticket1->save();

        $ticket2 = Ticket::create([
            'user_id' => $requester->id,
            'department_id' => $deptId,
            'title' => 'Second Ticket Newer',
            'description' => 'Descr',
            'priority' => 'low',
            'status' => 'open',
        ]);
        $ticket2->created_at = now();
        $ticket2->save();

        $response = $this->actingAs($requester, 'sanctum')
            ->getJson('/api/v1/tickets');

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertEquals($ticket2->id, $tickets[0]['id']);
        $this->assertEquals($ticket1->id, $tickets[1]['id']);
    }

    public function test_filters_preserve_requester_isolation(): void
    {
        $requesterA = User::factory()->create(['role' => 'requester']);
        $requesterB = User::factory()->create(['role' => 'requester']);
        $deptId = $this->getDepartmentId();

        Ticket::create([
            'user_id' => $requesterA->id,
            'department_id' => $deptId,
            'title' => 'High Priority Open IT Ticket A',
            'description' => 'Descr',
            'priority' => 'high',
            'status' => 'open',
        ]);

        Ticket::create([
            'user_id' => $requesterB->id,
            'department_id' => $deptId,
            'title' => 'High Priority Open IT Ticket B',
            'description' => 'Descr',
            'priority' => 'high',
            'status' => 'open',
        ]);

        $response = $this->actingAs($requesterA, 'sanctum')
            ->getJson('/api/v1/tickets?priority=high&status=open');

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertCount(1, $tickets);
        $this->assertEquals('High Priority Open IT Ticket A', $tickets[0]['title']);
    }

    public function test_admin_can_filter_system_queue(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $requester1 = User::factory()->create(['role' => 'requester']);
        $requester2 = User::factory()->create(['role' => 'requester']);
        $deptId = $this->getDepartmentId();

        Ticket::create([
            'user_id' => $requester1->id,
            'department_id' => $deptId,
            'title' => 'Database Backup Error',
            'description' => 'Nightly dump failed',
            'priority' => 'high',
            'status' => 'open',
        ]);

        Ticket::create([
            'user_id' => $requester2->id,
            'department_id' => $deptId,
            'title' => 'Keyboard Replacement',
            'description' => 'Broken spacebar',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/tickets?priority=high');

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertCount(1, $tickets);
        $this->assertEquals('Database Backup Error', $tickets[0]['title']);
    }

    public function test_agent_can_filter_system_queue(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);
        $requester1 = User::factory()->create(['role' => 'requester']);
        $requester2 = User::factory()->create(['role' => 'requester']);
        $deptId = $this->getDepartmentId();

        Ticket::create([
            'user_id' => $requester1->id,
            'department_id' => $deptId,
            'title' => 'Server Maintenance Warning',
            'description' => 'High CPU load on host node',
            'priority' => 'high',
            'status' => 'in_progress',
        ]);

        Ticket::create([
            'user_id' => $requester2->id,
            'department_id' => $deptId,
            'title' => 'Mouse Pad Request',
            'description' => 'Ergonomic pad',
            'priority' => 'low',
            'status' => 'open',
        ]);

        $response = $this->actingAs($agent, 'sanctum')
            ->getJson('/api/v1/tickets?status=in_progress');

        $response->assertStatus(200);
        $tickets = $response->json('data.tickets');

        $this->assertCount(1, $tickets);
        $this->assertEquals('Server Maintenance Warning', $tickets[0]['title']);
    }

    public function test_empty_filter_match_returns_successful_response_with_empty_tickets_array(): void
    {
        $user = User::factory()->create(['role' => 'requester']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/tickets?search=nonexistent_keyword_12345');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'tickets' => [],
                ],
            ]);
    }
}
