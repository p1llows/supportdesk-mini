import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Failed to authenticate.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
          autoFocus
          autoComplete="email"
          className="h-10 bg-white border-stone-300 text-stone-800 placeholder:text-stone-400"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
        </div>
        <PasswordInput
          id="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          disabled={loading}
          required
          autoComplete="current-password"
          className="h-10 bg-white border-stone-300 text-stone-800 placeholder:text-stone-400"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-10 w-full bg-[#0F766E] text-white hover:bg-[#115E59]"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            Sign In
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </Button>

      <div className="border-t border-[#EFECE6] pt-4 text-center text-xs text-stone-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-[#0F766E] hover:text-[#115E59] hover:underline">
          Create one
        </Link>
      </div>
    </form>
  );
};
