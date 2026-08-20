import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2, ArrowLeft, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DepartmentModal } from '@/components/departments/DepartmentModal';

interface DepartmentData {
  id: number;
  name: string;
}

export const DepartmentsPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentData | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const fetchDepartments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/v1/departments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setDepartments(result.data.departments || []);
      } else {
        setError(result.message || 'Failed to load departments');
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
    fetchDepartments();
  }, [user, navigate, fetchDepartments]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department? This cannot be undone.')) return;

    try {
      const response = await fetch(`${apiBaseUrl}/v1/departments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok && result.status === 'success') {
        fetchDepartments();
      } else {
        alert(result.message || 'Failed to delete department. It may have existing tickets.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to connect to backend server');
    }
  };

  if (loading && departments.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading departments...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-slate-600 hover:text-slate-900 -ml-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <Button
            onClick={() => {
              setEditingDepartment(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Department
          </Button>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900">Department Management</CardTitle>
                <CardDescription className="mt-1">
                  Manage support departments and their initial agents
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-4 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                {error}
              </div>
            )}

            <div className="rounded-md border border-slate-200 overflow-hidden bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold w-full">Department Name</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        No departments found.
                      </td>
                    </tr>
                  ) : (
                    departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-500">#{dept.id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{dept.name}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setEditingDepartment(dept);
                                setIsModalOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-slate-600 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(dept.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <DepartmentModal
        isOpen={isModalOpen}
        department={editingDepartment}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDepartments}
      />
    </main>
  );
};
