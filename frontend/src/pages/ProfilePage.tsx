import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SupportBadge } from '@/components/ui/status-badges';
import { Loader2, AlertCircle, CheckCircle2, KeyRound, UserRound, Building2 } from 'lucide-react';

interface DepartmentOption {
  id: number;
  name: string;
}

export const ProfilePage = () => {
  const { user, token, checkSession } = useAuth();

  // Account details form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSuccess, setDetailsSuccess] = useState<string | null>(null);

  // Department state (requester self-service)
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  const [departmentSuccess, setDepartmentSuccess] = useState<string | null>(null);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const authHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  });

  // Seed the details form from the session user
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      if (user.department_id) {
        setSelectedDepartment(user.department_id.toString());
      }
    }
  }, [user]);

  // Fetch departments for the requester selector + read-only display
  useEffect(() => {
    if (!token) return;

    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/v1/departments`, {
          headers: authHeaders(),
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
          setDepartments(result.data.departments || []);
        } else {
          setDepartmentError(result.message || 'Failed to load departments');
        }
      } catch (err: unknown) {
        setDepartmentError(err instanceof Error ? err.message : 'Failed to connect to backend server');
      } finally {
        setDepartmentsLoading(false);
      }
    };

    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, apiBaseUrl]);

  const extractError = (result: { message?: string; errors?: Record<string, string[]> }, fallback: string): string => {
    if (result.errors) {
      const firstError = Object.values(result.errors)[0];
      if (firstError?.[0]) return firstError[0];
    }
    return result.message || fallback;
  };

  const handleSaveDetails = async () => {
    if (!name.trim() || !email.trim()) {
      setDetailsError('Name and email are required.');
      return;
    }

    setSavingDetails(true);
    setDetailsError(null);
    setDetailsSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/profile`, {
        method: 'PATCH',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setDetailsSuccess('Account details updated successfully.');
        await checkSession();
      } else {
        setDetailsError(extractError(result, 'Failed to update profile'));
      }
    } catch (err: unknown) {
      setDetailsError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSaveDepartment = async () => {
    if (!selectedDepartment) {
      setDepartmentError('Please select a department');
      return;
    }

    setSavingDepartment(true);
    setDepartmentError(null);
    setDepartmentSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/profile/department`, {
        method: 'PATCH',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ department_id: parseInt(selectedDepartment, 10) }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setDepartmentSuccess('Department updated successfully.');
        await checkSession();
      } else {
        setDepartmentError(extractError(result, 'Failed to update department'));
      }
    } catch (err: unknown) {
      setDepartmentError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSavingDepartment(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/profile/password`, {
        method: 'PATCH',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setPasswordSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(extractError(result, 'Failed to update password'));
      }
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '';

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const currentDepartmentName = departments.find(
    (dept) => dept.id === user?.department_id
  )?.name;

  const detailsDirty = name.trim() !== user?.name || email.trim() !== user?.email;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-stone-900">Profile</h1>
        <p className="mt-1 text-sm text-stone-500">Manage your account settings and preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Profile Summary */}
        <div>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0F766E] text-lg font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-stone-900">{user?.name}</h2>
                    <SupportBadge category="role" value={user?.role ?? 'requester'} />
                  </div>
                  <p className="mt-1 truncate text-sm text-stone-500">{user?.email}</p>
                  {memberSince && (
                    <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-400">
                      Member since {memberSince}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Settings Forms */}
        <div className="space-y-6 lg:col-span-2">
          {/* Account Details Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-stone-500" />
                <CardTitle className="text-base text-stone-900">Account Details</CardTitle>
              </div>
              <CardDescription>Update your name and email address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailsError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {detailsError}
                </div>
              )}

              {detailsSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {detailsSuccess}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="profile-name" className="text-xs font-semibold text-stone-600">
                    Full Name
                  </label>
                  <Input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={savingDetails}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="profile-email" className="text-xs font-semibold text-stone-600">
                    Email Address
                  </label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={savingDetails}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleSaveDetails}
                  disabled={savingDetails || !detailsDirty}
                >
                  {savingDetails && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Details
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Department Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-stone-500" />
                <CardTitle className="text-base text-stone-900">Department</CardTitle>
              </div>
              {user?.role === 'requester' ? (
                <CardDescription>
                  Select the department your support requests belong to. Required before submitting tickets.
                </CardDescription>
              ) : (
                <CardDescription>Assigned by administrators.</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {departmentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading departments...
                </div>
              ) : user?.role === 'requester' ? (
                <>
                  {departmentError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      {departmentError}
                    </div>
                  )}

                  {departmentSuccess && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {departmentSuccess}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="profile-department" className="text-xs font-semibold text-stone-600">
                      Department Assignment
                    </label>
                    <select
                      id="profile-department"
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      disabled={savingDepartment}
                      className="dark-select w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-50 disabled:bg-stone-50"
                    >
                      <option value="">-- Select your department --</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      onClick={handleSaveDepartment}
                      disabled={
                        savingDepartment ||
                        !selectedDepartment ||
                        selectedDepartment === user?.department_id?.toString()
                      }
                    >
                      {savingDepartment && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Department
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-[#E5E2DA] bg-stone-50 px-3 py-2.5 text-sm">
                  <span className="text-stone-500">Current department: </span>
                  <span className="font-semibold text-stone-900">
                    {currentDepartmentName ?? '—'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-stone-500" />
                <CardTitle className="text-base text-stone-900">Change Password</CardTitle>
              </div>
              <CardDescription>
                Choose a strong password of at least 8 characters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {passwordSuccess}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="current-password" className="text-xs font-semibold text-stone-600">
                  Current Password
                </label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={savingPassword}
                  autoComplete="current-password"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="text-xs font-semibold text-stone-600">
                    New Password
                  </label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={savingPassword}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="text-xs font-semibold text-stone-600">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={savingPassword}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleChangePassword}
                  disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                >
                  {savingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
