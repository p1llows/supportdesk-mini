import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DepartmentModal } from '@/components/departments/DepartmentModal';

interface DepartmentData {
  id: number;
  name: string;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-stone-900">Departments</h1>
          <p className="mt-1 text-sm text-stone-500">
            {departments.length} departments · Administrator view
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

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {departments.map((dept) => {
          const deptAgents = getAgentsForDepartment(dept.id);
          return (
            <div
              key={dept.id}
              className="flex flex-col rounded-xl border border-[#E5E2DA] bg-white p-5 transition-colors hover:border-stone-300"
            >
              {/* Card header */}
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-stone-100 pb-3.5">
                <div className="flex items-start gap-2.5">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{dept.name}</h3>
                    <p className="mt-0.5 text-xs font-medium tabular-nums text-stone-500">
                      {deptAgents.length} agent{deptAgents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingDepartment(dept);
                    setIsModalOpen(true);
                  }}
                  className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                  title="Edit department"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              {/* Agents list */}
              <div className="flex-1 space-y-2.5">
                {deptAgents.length === 0 ? (
                  <p className="rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-500 italic">
                    No agents assigned yet
                  </p>
                ) : (
                  deptAgents.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-stone-50">
                      <Avatar name={agent.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-stone-800">{agent.name}</p>
                        <p className="truncate text-xs text-stone-500">{agent.email}</p>
                      </div>
                      <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        Active
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
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
