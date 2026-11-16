import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/table-pagination';
import { PlusCircle, Pencil, Loader2, AlertCircle, Building2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DepartmentModal } from '@/components/departments/DepartmentModal';

interface DepartmentData {
  id: number;
  name: string;
  description?: string | null;
}

interface AgentData {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: number | null;
}

// Avatar initials
function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E5E2DA] bg-[#F1EFE9] text-xs font-bold text-stone-700">
      {initials}
    </div>
  );
}

export const DepartmentsPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentData | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [deptRes, usersRes] = await Promise.all([
        fetch(`${apiBaseUrl}/v1/departments`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        }),
        fetch(`${apiBaseUrl}/v1/users`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        }),
      ]);

      const deptResult = await deptRes.json();
      const usersResult = await usersRes.json();

      if (deptRes.ok && deptResult.status === 'success') {
        setDepartments(deptResult.data.departments || []);
      } else {
        setError(deptResult.message || 'Failed to load departments');
      }

      if (usersRes.ok && usersResult.status === 'success') {
        // Only keep agents for department cards
        setAgents(
          (usersResult.data.users || []).filter((u: AgentData) => u.role === 'agent')
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error loading departments');
    } finally {
      setLoading(false);
    }
  }, [token, apiBaseUrl]);

  useEffect(() => {
    // Only admins should access this page
    if (user && user.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }
    fetchData();
  }, [user, navigate, fetchData]);

  const getAgentsForDepartment = (deptId: number) => {
    return agents.filter((a) => a.department_id === deptId);
  };

  if (loading && departments.length === 0) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-stone-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading departments...
        </div>
      </main>
    );
  }

  const filteredDepartments = departments.filter((dept) =>
    `${dept.name} ${dept.description ?? ''}`.toLowerCase().includes(query.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedDepartments = filteredDepartments.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-stone-900">Departments</h1>
          <p className="mt-1 text-sm text-stone-500">
            {departments.length} departments · {agents.length} assigned agent{agents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDepartment(null);
            setIsModalOpen(true);
          }}
          className="h-9 bg-[#0F766E] px-3.5 text-sm font-semibold text-white hover:bg-[#115E59]"
        >
          <PlusCircle className="mr-1.5 h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Unified Departments Directory Card */}
      <div className="overflow-hidden rounded-xl border border-[#E5E2DA] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E2DA] bg-[#FAF9F6] px-4 py-3 sm:px-5">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search departments..."
              className="h-9 w-full rounded-lg border border-[#E5E2DA] bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-shadow focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-stone-500">
            {filteredDepartments.length} {filteredDepartments.length === 1 ? 'department' : 'departments'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E2DA] bg-[#FAF9F6]/60 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-5 py-3">Department</th>
                <th className="px-4 py-3">Assigned Agents</th>
                <th className="px-4 py-3">Count</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE6]">
              {paginatedDepartments.map((dept) => {
                const deptAgents = getAgentsForDepartment(dept.id);
                return (
                  <tr key={dept.id} className="transition-colors hover:bg-[#FAF9F6]">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2.5">
                        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900">{dept.name}</p>
                          {dept.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                              {dept.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {deptAgents.length === 0 ? (
                        <span className="text-xs italic text-stone-400">No agents assigned</span>
                      ) : (
                        <div className="flex items-center -space-x-2">
                          {deptAgents.map((agent) => (
                            <div
                              key={agent.id}
                              tabIndex={0}
                              aria-label={`${agent.name} (${agent.email})`}
                              title={`${agent.name} · ${agent.email}`}
                              className="group/avatar relative rounded-full ring-2 ring-white transition-transform hover:z-10 hover:scale-105 focus-visible:z-10 focus-visible:outline-none"
                            >
                              <Avatar name={agent.name} />
                              <div
                                role="tooltip"
                                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100"
                              >
                                {agent.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs font-medium tabular-nums text-stone-600 whitespace-nowrap">
                      {deptAgents.length}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDepartment(dept);
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-[#EFECE6] hover:text-stone-900"
                        title="Edit department"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={safePage}
          pageSize={pageSize}
          totalItems={filteredDepartments.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <DepartmentModal
        isOpen={isModalOpen}
        department={editingDepartment}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
};
