import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DepartmentOption {
  id: number;
  name: string;
}

export const ProfilePage = () => {
  const { user, token, checkSession } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  useEffect(() => {
    // Only requesters should need to use this profile page for department assignment
    if (user && user.role !== 'requester') {
      navigate('/', { replace: true });
      return;
    }

    if (user?.department_id) {
      setSelectedDepartment(user.department_id.toString());
    }

    const fetchDepartments = async () => {
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
        setError(err instanceof Error ? err.message : 'Failed to connect to backend server');
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [user, token, apiBaseUrl, navigate]);

  const handleSave = async () => {
    if (!selectedDepartment) {
      setError('Please select a department');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/profile/department`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ department_id: parseInt(selectedDepartment, 10) }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setSuccessMessage('Profile updated successfully.');
        // Refresh the user session so useAuth() has the updated department_id
        await checkSession();
      } else {
        if (response.status === 422 && result.errors) {
          const firstError = Object.values(result.errors)[0] as string[];
          setError(firstError[0] || 'Validation failed');
        } else {
          setError(result.message || 'Failed to update profile');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading profile...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="text-slate-600 hover:text-slate-900 -ml-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900">{user?.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  {user?.email}
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    {user?.role}
                  </span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                {successMessage}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="department" className="text-sm font-medium text-slate-700">
                Department Assignment
              </label>
              <p className="text-sm text-slate-500 mb-3">
                You must select your department before you can submit any support tickets.
              </p>
              
              <select
                id="department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
                disabled={saving}
              >
                <option value="">-- Select your department --</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-200 flex justify-end p-4">
            <Button
              onClick={handleSave}
              disabled={saving || !selectedDepartment || selectedDepartment === user?.department_id?.toString()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Profile
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
};
