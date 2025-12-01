import React, { useMemo, useState } from 'react';
import { supabase } from '../supabase/client';
import { User, UserStatus } from '../types';
import { fetchUserProfile, fetchUserProfileByEmail } from '../services/userProfile';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';
import EnprotecLogo from './icons/EnprotecLogo';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<
    | { kind: 'success'; message: string }
    | { kind: 'error'; message: string }
    | null
  >(null);

  const canSubmitReset = useMemo(
    () => resetEmail.trim().length > 0 && !loading,
    [resetEmail, loading]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.info('[Login] signing in as', email);
      const { error: signInError, data: authData } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !authData.session) {
        console.error('[Login] sign-in failed:', signInError);
        setError('Invalid email or password.');
        return;
      }

      console.info('[Login] fetching profile for', authData.session.user.id);
      const profile = await fetchUserProfile(authData.session.user.id);

      if (!profile || profile.status !== UserStatus.Active) {
        console.warn('[Login] profile missing or inactive', profile);
        setError('Your account is inactive or misconfigured.');
        await supabase.auth.signOut();
        return;
      }

      console.info('[Login] profile loaded, completing login');
      onLoginSuccess(profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.error('Login error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmitReset) return;

    setResetStatus(null);
    setLoading(true);

    try {
      const trimmedEmail = resetEmail.trim().toLowerCase();
      const profile = await fetchUserProfileByEmail(trimmedEmail);

      if (!profile) {
        setResetStatus({
          kind: 'error',
          message: 'No account found with that email address.',
        });
        return;
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });

      if (error) {
        console.error('[Auth] resetPasswordForEmail error', error);
        setResetStatus({
          kind: 'error',
          message: error.message ?? 'Failed to send reset email.',
        });
        return;
      }

      setResetStatus({
        kind: 'success',
        message: 'Check your email for a password reset link.',
      });
    } catch (err) {
      console.error('[Auth] forgot password flow error', err);
      const message =
        err instanceof Error ? err.message : 'Failed to send reset password email.';
      setResetStatus({ kind: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  const renderForgotPasswordForm = () => (
    <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
      <div className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="sr-only">
            Email address
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            value={resetEmail}
            onChange={event => setResetEmail(event.target.value)}
            className="appearance-none block w-full px-3 py-3 border border-zinc-300 bg-white placeholder-zinc-500 text-zinc-900 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            placeholder="Enter your email address"
            disabled={loading}
          />
        </div>
        {resetStatus && (
          <p
            className={`text-sm text-center ${
              resetStatus.kind === 'success' ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {resetStatus.message}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={!canSubmitReset}
          className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-100 focus:ring-sky-500 transition-colors disabled:bg-zinc-300"
        >
          {loading ? 'Sending reset link…' : 'Send reset link'}
        </button>
        <button
          type="button"
          onClick={() => {
            setResetMode(false);
            setResetStatus(null);
            setResetEmail('');
          }}
          className="w-full text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          Back to sign in
        </button>
      </div>
    </form>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-100 font-sans">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg border border-zinc-200 shadow-sm">
        <div className="text-center space-y-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <EnprotecLogo className="h-20 w-auto max-w-sm" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">
            Sign in to your account
          </h2>
          <p className="text-sm text-zinc-500">
            Workflow Management System
          </p>
        </div>
        {isResetMode ? (
          renderForgotPasswordForm()
        ) : (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-zinc-300 bg-white placeholder-zinc-500 text-zinc-900 rounded-t-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                disabled={loading}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-zinc-300 bg-white placeholder-zinc-500 text-zinc-900 rounded-b-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                disabled={loading}
              />
               <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-100 focus:ring-sky-500 transition-colors disabled:bg-zinc-300"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          <div className="text-sm text-center">
            <button
              type="button"
              onClick={() => {
                setResetMode(true);
                setResetStatus(null);
                setResetEmail(email);
              }}
              className="font-medium text-sky-600 hover:text-sky-700"
            >
              Forgot your password?
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default Login;
