import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Filter } from 'lucide-react';

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
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onDepartmentIdChange,
  onClearFilters,
}) => {
  const isFiltered = Boolean(search || status || priority || departmentId);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Filter & Search Queue</span>
        </div>
        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs text-slate-500 hover:text-slate-800 h-7 px-2"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="relative md:col-span-5">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            id="ticket-search"
            type="text"
            placeholder="Search title or description..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        {/* Status Select */}
        <div className="md:col-span-2">
          <select
            id="ticket-status-filter"
            aria-label="Filter by status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Priority Select */}
        <div className="md:col-span-2">
          <select
            id="ticket-priority-filter"
            aria-label="Filter by priority"
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 text-slate-700"
          >
            <option value="">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>

        {/* Department Select */}
        <div className="md:col-span-3">
          <select
            id="ticket-department-filter"
            aria-label="Filter by department"
            value={departmentId}
            onChange={(e) => onDepartmentIdChange(e.target.value)}
            className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 text-slate-700"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
