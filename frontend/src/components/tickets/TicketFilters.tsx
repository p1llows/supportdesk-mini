import React from 'react';
import { Search, X } from 'lucide-react';

export interface DepartmentOption {
  id: number;
  name: string;
}

interface TicketFiltersProps {
  search: string;
  status: string;
  priority: string;
  departmentId: string;
  departments: DepartmentOption[];
  ticketCount: number;
  /** Non-admin roles are locked to their own department (API already scopes results). */
  departmentLocked?: boolean;
  lockedDepartmentName?: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onDepartmentIdChange: (value: string) => void;
  onClearFilters: () => void;
}

export const TicketFilters: React.FC<TicketFiltersProps> = ({
  search,
  status,
  priority,
  departmentId,
  departments,
  ticketCount,
  departmentLocked = false,
  lockedDepartmentName,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onDepartmentIdChange,
  onClearFilters,
}) => {
  const hasActiveFilters = Boolean(search || status || priority || departmentId);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/80 bg-slate-50/70 px-4 py-3.5 sm:px-5">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[210px] max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          id="ticket-search"
          type="text"
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-300/90 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Status Select */}
      <select
        id="ticket-status-filter"
        aria-label="Filter by status"
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="dark-select h-9 rounded-lg border px-3 py-1 text-sm"
      >
        <option value="">All Statuses</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>

      {/* Priority Select */}
      <select
        id="ticket-priority-filter"
        aria-label="Filter by priority"
        value={priority}
        onChange={(e) => onPriorityChange(e.target.value)}
        className="dark-select h-9 rounded-lg border px-3 py-1 text-sm"
      >
        <option value="">All Priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      {/* Department Select — frozen for agents/requesters, selectable for admins */}
      {departmentLocked ? (
        <select
          id="ticket-department-filter"
          aria-label="Department"
          value={lockedDepartmentName ?? ''}
          disabled
          title="Your tickets are scoped to your department"
          className="h-9 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-500 cursor-not-allowed"
        >
          <option>{lockedDepartmentName ?? 'No department assigned'}</option>
        </select>
      ) : (
        <select
          id="ticket-department-filter"
          aria-label="Filter by department"
          value={departmentId}
          onChange={(e) => onDepartmentIdChange(e.target.value)}
          className="dark-select h-9 rounded-lg border px-3 py-1 text-sm"
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}

      {/* Ticket count */}
      <span className="ml-auto inline-flex items-center rounded-full bg-slate-200/70 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600">
        {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
      </span>
    </div>
  );
};
