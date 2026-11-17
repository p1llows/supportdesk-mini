import React, { useEffect, useRef } from 'react';
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasActiveFilters = Boolean(search || status || priority || departmentId);

  // Press '/' anywhere (outside inputs) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E5E2DA] bg-[#FAF9F6] px-4 py-3 sm:px-5">
      {/* Search Input */}
      <div className="sd-trace relative flex-1 min-w-[210px] max-w-sm rounded-lg">
        <Search className="pointer-events-none absolute left-3 top-2.5 z-10 h-4 w-4 text-stone-400" />
        <input
          ref={searchInputRef}
          id="ticket-search"
          type="text"
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="relative h-9 w-full rounded-lg border border-[#E5E2DA] bg-white pl-9 pr-8 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-shadow focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-2.5 z-10 text-stone-400 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2.5 top-2 z-10 hidden rounded border border-[#E5E2DA] bg-[#F7F6F2] px-1.5 py-0.5 font-mono text-[10px] font-medium text-stone-400 sm:inline-block">
            /
          </kbd>
        )}
      </div>

      {/* Status Select */}
      <select
        id="ticket-status-filter"
        aria-label="Filter by status"
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="dark-select h-9 rounded-lg border px-3 py-1 text-[13px] font-medium"
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
        className="dark-select h-9 rounded-lg border px-3 py-1 text-[13px] font-medium"
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
          className="h-9 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1 text-[13px] text-zinc-500 cursor-not-allowed"
        >
          <option>{lockedDepartmentName ?? 'No department assigned'}</option>
        </select>
      ) : (
        <select
          id="ticket-department-filter"
          aria-label="Filter by department"
          value={departmentId}
          onChange={(e) => onDepartmentIdChange(e.target.value)}
          className="dark-select h-9 rounded-lg border px-3 py-1 text-[13px] font-medium"
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
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </button>
      )}

      {/* Ticket count */}
      <span className="ml-auto text-xs font-medium tabular-nums text-zinc-500">
        {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
      </span>
    </div>
  );
};
