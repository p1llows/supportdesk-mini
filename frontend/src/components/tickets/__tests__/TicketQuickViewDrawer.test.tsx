import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TicketQuickViewDrawer } from '@/components/tickets/TicketQuickViewDrawer';
import type { TicketData } from '@/components/tickets/TicketsTable';

const sampleTicket: TicketData = {
  id: 7,
  title: 'VPN drops intermittently',
  description: 'Disconnects every 15 minutes on Wi-Fi.',
  priority: 'high',
  status: 'open',
  assigned_to: null,
  department: { id: 1, name: 'Information Technology' },
  requester: { id: 4, name: 'John Active', email: 'john@supportdesk.local' },
  assignee: null,
  created_at: '2026-11-16T06:00:00Z',
  updated_at: '2026-11-16T06:00:00Z',
};

describe('TicketQuickViewDrawer', () => {
  it('renders ticket details and allows agent status transition and assignment', () => {
    const onStatusChange = vi.fn();
    const onAssign = vi.fn();
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <TicketQuickViewDrawer
          mode="inline"
          ticket={sampleTicket}
          role="agent"
          agents={[
            { id: 2, name: 'Support Agent', role: 'agent', department_id: 1 },
            { id: 3, name: 'HR Agent', role: 'agent', department_id: 2 },
          ]}
          onClose={onClose}
          onStatusChange={onStatusChange}
          onAssign={onAssign}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('TK-007')).toBeInTheDocument();
    expect(screen.getByText('VPN drops intermittently')).toBeInTheDocument();
    expect(screen.getByText('Disconnects every 15 minutes on Wi-Fi.')).toBeInTheDocument();

    // Only same-department agent should appear in assignee dropdown
    const assignSelect = screen.getByLabelText('Assign ticket');
    expect(screen.getByRole('option', { name: 'Support Agent' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'HR Agent' })).not.toBeInTheDocument();

    fireEvent.change(assignSelect, { target: { value: '2' } });
    expect(onAssign).toHaveBeenCalledWith(sampleTicket, 2);

    fireEvent.click(screen.getByRole('button', { name: /mark as in progress/i }));
    expect(onStatusChange).toHaveBeenCalledWith(sampleTicket, 'in_progress');
  });
});
