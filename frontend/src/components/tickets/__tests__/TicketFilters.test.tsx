import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TicketFilters } from '@/components/tickets/TicketFilters';

describe('TicketFilters', () => {
  const defaultProps = {
    search: '',
    status: '',
    priority: '',
    departmentId: '',
    departments: [
      { id: 1, name: 'Information Technology' },
      { id: 2, name: 'Human Resources' },
    ],
    ticketCount: 3,
    onSearchChange: vi.fn(),
    onStatusChange: vi.fn(),
    onPriorityChange: vi.fn(),
    onDepartmentIdChange: vi.fn(),
    onClearFilters: vi.fn(),
  };

  it('renders search input, filter selects, and ticket count', () => {
    render(<TicketFilters {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search tickets...')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by department')).toBeInTheDocument();
    expect(screen.getByText('3 tickets')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
  });

  it('shows Reset button when filters are active and triggers onClearFilters', () => {
    const onClearFilters = vi.fn();
    render(<TicketFilters {...defaultProps} status="open" onClearFilters={onClearFilters} />);

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetBtn);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('locks department select when departmentLocked is true', () => {
    render(
      <TicketFilters
        {...defaultProps}
        departmentLocked
        lockedDepartmentName="Finance"
      />
    );

    const deptSelect = screen.getByLabelText('Department');
    expect(deptSelect).toBeDisabled();
    expect(deptSelect).toHaveValue('Finance');
  });
});
