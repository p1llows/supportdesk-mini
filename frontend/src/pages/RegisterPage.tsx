import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = passwordConfirmation.length > 0 && password === passwordConfirmation;
  const showMatchHint = passwordConfirmation.length > 0 && password !== passwordConfirmation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password || !passwordConfirmation) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await register(name, email, password, passwordConfirmation);
      if (!result.success) {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <header className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-500">
          Register to submit and track support requests.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="reg-name">Full name</Label>
          <Input
            id="reg-name"
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
            autoFocus
            autoComplete="name"
            className="h-10 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-email">Email address</Label>
          <Input
            id="reg-email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            autoComplete="email"
            className="h-10 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-password">Password</Label>
          <PasswordInput
            id="reg-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            autoComplete="new-password"
            className="h-10 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-password-confirm">Confirm password</Label>
          <PasswordInput
            id="reg-password-confirm"
            placeholder="Repeat your password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            disabled={loading}
            required
            autoComplete="new-password"
            className="h-10 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
          />
          {showMatchHint && (
            <p className="flex items-center gap-1 text-[11px] font-medium text-red-600">
              <AlertCircle className="h-3 w-3" />
              Passwords do not match
            </p>
          )}
          {passwordsMatch && (
            <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              Passwords match
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-10 w-full bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </span>
          ) : (
            'Create Account'
          )}
        </Button>

        <p className="pt-2 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-[11px] leading-relaxed text-slate-400">
          Registration creates a requester account. After signing up, set your
          department from your profile to start submitting tickets.
        </p>
      </form>
    </AuthShell>
  );
};
