import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Loader2, AlertCircle } from 'lucide-react';
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
function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function nameColor(name: string): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading departments...
        </div>
      </main>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Departments</h1>
          <p className="mt-1 text-sm text-slate-500">
            {departments.length} departments · Administrator view
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDepartment(null);
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {departments.map((dept) => {
          const deptAgents = getAgentsForDepartment(dept.id);
          return (
            <div
              key={dept.id}
              className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col"
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{dept.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {deptAgents.length} agent{deptAgents.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingDepartment(dept);
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Edit department"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              {/* Agents list */}
              <div className="space-y-3 flex-1">
                {deptAgents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No agents assigned</p>
                ) : (
                  deptAgents.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-3">
                      <Avatar name={agent.name} color={nameColor(agent.name)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{agent.name}</p>
                        <p className="text-xs text-slate-500 truncate">{agent.email}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
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
