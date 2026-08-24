<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed default departments
        $this->call(DepartmentSeeder::class);

        $deptIt = Department::where('name', 'Information Technology')->first();
        $deptHr = Department::where('name', 'Human Resources')->first();
        $deptFin = Department::where('name', 'Finance')->first();

        // Development & Presentation Seed Accounts
        $admin = User::updateOrCreate(
            ['email' => 'admin@supportdesk.local'],
            [
                'name' => 'Administrator',
                'password' => Hash::make('password123'),
                'role' => 'admin',
            ]
        );

        $agent = User::updateOrCreate(
            ['email' => 'agent@supportdesk.local'],
            [
                'name' => 'Support Agent',
                'password' => Hash::make('password123'),
                'role' => 'agent',
                'department_id' => $deptIt?->id,
            ]
        );

        // Requester WITHOUT a department (for testing the submission block)
        $requesterBlocked = User::updateOrCreate(
            ['email' => 'requester@supportdesk.local'],
            [
                'name' => 'Jane Requester (No Dept)',
                'password' => Hash::make('password123'),
                'role' => 'requester',
            ]
        );

        // Requester WITH a department (for testing successful ticket submission)
        $requesterActive = User::updateOrCreate(
            ['email' => 'requester_active@supportdesk.local'],
            [
                'name' => 'John Active',
                'password' => Hash::make('password123'),
                'role' => 'requester',
                'department_id' => $deptFin?->id,
            ]
        );



        // Seed Sample Presentation Tickets
        $vpnTicket = null;
        $printerTicket = null;
        $licenseTicket = null;

        if ($deptIt && $deptHr && $deptFin && $requesterActive) {
            $vpnTicket = Ticket::updateOrCreate(
                ['title' => 'VPN Access Request for Remote Work'],
                [
                    'user_id' => $requesterActive->id,
                    'department_id' => $deptIt->id,
                    'description' => 'Need VPN credentials configured for remote laptop.',
                    'priority' => 'medium',
                    'status' => 'open',
                ]
            );

            $printerTicket = Ticket::updateOrCreate(
                ['title' => 'Printer Offline in HR Office'],
                [
                    'user_id' => $requesterActive->id,
                    'department_id' => $deptHr->id,
                    'description' => 'HR department printer is not responding on network.',
                    'priority' => 'high',
                    'status' => 'in_progress',
                ]
            );

            $licenseTicket = Ticket::updateOrCreate(
                ['title' => 'Software License Renewal for Finance'],
                [
                    'user_id' => $requesterActive->id,
                    'department_id' => $deptFin->id,
                    'description' => 'Annual spreadsheet software subscription renewal.',
                    'priority' => 'low',
                    'status' => 'closed',
                ]
            );

            // Seed Sample Activity Timelines (Day 5)
            $this->seedTimeline($vpnTicket, $requesterActive, $agent, $admin, 'open');
            $this->seedTimeline($printerTicket, $requesterActive, $agent, $admin, 'in_progress');
            $this->seedTimeline($licenseTicket, $requesterActive, $agent, $admin, 'closed');
        }
    }

    /**
     * Seed a demo activity timeline for a ticket, matching its current status.
     * Guarded so repeated db:seed runs do not duplicate entries.
     */
    private function seedTimeline(
        Ticket $ticket,
        User $requester,
        User $agent,
        User $admin,
        string $finalStatus
    ): void {
        if (TicketActivity::where('ticket_id', $ticket->id)->exists()) {
            return;
        }

        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id' => $requester->id,
            'type' => 'created',
        ]);

        if ($finalStatus === 'open') {
            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'user_id' => $requester->id,
                'type' => 'comment',
                'body' => 'Also need access to the staging environment if possible.',
            ]);

            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'user_id' => $agent->id,
                'type' => 'comment',
                'body' => 'Received — checking VPN concentrator capacity today and will follow up.',
            ]);

            return;
        }

        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id' => $agent->id,
            'type' => 'status_change',
            'metadata' => ['old' => 'open', 'new' => 'in_progress'],
        ]);

        if ($finalStatus === 'in_progress') {
            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'user_id' => $admin->id,
                'type' => 'priority_change',
                'metadata' => ['old' => 'medium', 'new' => 'high'],
            ]);

            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'user_id' => $agent->id,
                'type' => 'comment',
                'body' => 'Restarted the print spooler; monitoring for recurrence.',
            ]);

            return;
        }

        // closed: in_progress -> resolved -> closed
        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id' => $agent->id,
            'type' => 'status_change',
            'metadata' => ['old' => 'in_progress', 'new' => 'resolved'],
        ]);

        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id' => $agent->id,
            'type' => 'comment',
            'body' => 'Renewal quote was approved by Finance and processed with the vendor.',
        ]);

        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id' => $admin->id,
            'type' => 'status_change',
            'metadata' => ['old' => 'resolved', 'new' => 'closed'],
        ]);
    }
}
