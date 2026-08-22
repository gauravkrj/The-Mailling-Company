import { useState } from 'react';
import { Send, Mail, Lock, User as UserIcon, Globe, ArrowRight, Check, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { User } from '@mailpersonalize/shared';
import { apiFetch } from '../../config';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
  onGoogleSignIn: () => void;
  onDemoSignIn: () => void;
}

export default function AuthView({ onAuthSuccess, onGoogleSignIn, onDemoSignIn }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password' | 'reset_password'>('login');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live Inline Password Rules
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const isPasswordValid = hasMinLength && hasNumber;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email address and password are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid email or password.');
      } else {
        onAuthSuccess(data.user);
      }
    } catch (err: any) {
      setError('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email, and password are required.');
      return;
    }

    if (!isPasswordValid) {
      setError('Password must meet length and number requirements.');
      return;
    }

    if (!termsAccepted) {
      setError('You must agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          company_website: website.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Signup failed.');
      } else {
        setCreatedUser(data.user);
        if (data.verificationUrl) {
          setVerificationUrl(data.verificationUrl);
        } else {
          onAuthSuccess(data.user);
        }
      }
    } catch (err: any) {
      setError('An error occurred during account creation.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
        if (data.resetUrl) {
          console.log('Dev Reset Link:', data.resetUrl);
        }
      } else {
        setError(data.error || 'Failed to request password reset.');
      }
    } catch (err: any) {
      setError('Error sending password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim() || !password.trim()) {
      setError('Reset token and new password are required.');
      return;
    }

    if (!isPasswordValid) {
      setError('New password must meet length and number requirements.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Password reset successfully! You can now log in.');
        setMode('login');
        setPassword('');
      } else {
        setError(data.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setError('Error resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-[#1A1A1A] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative Floating Avatars (Desktop view) */}
      <div className="hidden lg:flex items-center gap-2 absolute top-12 left-16 bg-white border-2 border-black p-2.5 rounded-2xl shadow-sm animate-bounce" style={{ animationDuration: '4s' }}>
        <img src="/assets/Avatar1.png" alt="Brand avatar" className="w-10 h-10 rounded-xl border border-black object-cover bg-[#FEF6EA]" />
        <div>
          <div className="text-xs font-black text-[#1A1A1A]">Cold Outreach SaaS</div>
          <div className="text-[10px] text-[#054048] font-bold">👋 Welcome back!</div>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 absolute top-16 right-16 bg-white border-2 border-black p-2.5 rounded-2xl shadow-sm animate-bounce" style={{ animationDuration: '5s' }}>
        <img src="/assets/Avatar5.png" alt="AI avatar" className="w-10 h-10 rounded-xl border border-black object-cover bg-[#E6F4F1]" />
        <div>
          <div className="text-xs font-black text-[#1A1A1A]">AI Personalization</div>
          <div className="text-[10px] text-[#054048] font-bold">⚡ Higher open rates</div>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 absolute bottom-12 left-20 bg-white border-2 border-black p-2.5 rounded-2xl shadow-sm animate-bounce" style={{ animationDuration: '6s' }}>
        <img src="/assets/Avatar7.png" alt="Deliverability avatar" className="w-10 h-10 rounded-xl border border-black object-cover bg-[#FEF6EA]" />
        <div>
          <div className="text-xs font-black text-[#1A1A1A]">Smart Rotations</div>
          <div className="text-[10px] text-[#054048] font-bold">✉️ High deliverability</div>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 absolute bottom-16 right-20 bg-white border-2 border-black p-2.5 rounded-2xl shadow-sm animate-bounce" style={{ animationDuration: '4.5s' }}>
        <img src="/assets/Avatar4.png" alt="Integrations avatar" className="w-10 h-10 rounded-xl border border-black object-cover bg-[#E6F4F1]" />
        <div>
          <div className="text-xs font-black text-[#1A1A1A]">AWS SES & Gmail</div>
          <div className="text-[10px] text-[#054048] font-bold">🛡️ Enterprise security</div>
        </div>
      </div>

      {/* Main Auth Form Container */}
      <div className="max-w-md w-full bg-white border-2 border-black rounded-2xl p-8 space-y-6 shadow-sm z-10">
        
        {/* App Logo & Header with Avatar Showcase */}
        <div className="text-center space-y-3">
          <div className="relative w-16 h-16 mx-auto">
            <img
              src="/assets/Avatar1.png"
              alt="Hero Brand Avatar"
              className="w-16 h-16 rounded-2xl border-2 border-black object-cover shadow-sm bg-[#FEF6EA]"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#054048] text-white flex items-center justify-center border border-black shadow-sm">
              <Send className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">The Mailling Company</h1>
            <p className="text-xs text-[#5A5A5A] font-semibold mt-0.5">Production Cold Email Personalization SaaS</p>
          </div>
        </div>

        {/* Verification Link Confirmation Card */}
        {verificationUrl && (
          <div className="notice-banner p-4 text-left space-y-3">
            <div className="flex items-center gap-2 text-[#054048] font-extrabold text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#054048]" /> Account Registered Successfully!
            </div>
            <p className="text-xs text-[#1A1A1A] leading-relaxed">
              We have generated your email verification link. In production mode, this is delivered directly to your inbox.
            </p>
            <div className="pt-1 flex flex-col gap-2">
              <a
                href={verificationUrl}
                className="btn-primary w-full py-2.5 text-center text-xs font-bold text-white block bg-[#054048] hover:bg-[#0A5D66]"
              >
                ✓ Verify Email Address Now
              </a>
              <button
                type="button"
                onClick={() => {
                  if (createdUser) onAuthSuccess(createdUser);
                }}
                className="text-xs text-[#5A5A5A] hover:text-black font-semibold text-center pt-1"
              >
                Skip to Dashboard →
              </button>
            </div>
          </div>
        )}

        {/* Auth Mode Tabs (Login vs Signup) */}
        {!verificationUrl && (mode === 'login' || mode === 'signup') && (
          <div className="flex bg-[#F8F8F8] p-1 rounded-xl border-2 border-black">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login' ? 'bg-[#054048] text-white shadow-sm' : 'text-[#5A5A5A] hover:text-black'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signup' ? 'bg-[#054048] text-white shadow-sm' : 'text-[#5A5A5A] hover:text-black'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-[#FEE2E2] border-2 border-[#D64545] text-[#D64545] rounded-xl text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-[#D64545] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="notice-banner px-4 py-3 text-xs flex items-center gap-2 font-semibold text-[#054048]">
            <CheckCircle2 className="w-4 h-4 text-[#054048] shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Google OAuth Option (Prominent) */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                if (mode === 'signup' && !termsAccepted) {
                  setError('You must agree to the Terms of Service and Privacy Policy to continue with Google.');
                  return;
                }
                onGoogleSignIn();
              }}
              className="btn-secondary w-full py-2.5 gap-2.5 text-xs font-bold flex items-center justify-center cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
            </button>

            {/* Visual Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t-2 border-black w-full"></div>
              <span className="bg-white px-3 text-[10px] text-[#5A5A5A] font-extrabold tracking-wider uppercase shrink-0">
                Or with email
              </span>
              <div className="border-t-2 border-black w-full"></div>
            </div>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-[#1A1A1A]">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5A5A5A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1A1A]">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] text-[#054048] hover:underline font-bold transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5A5A5A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs font-bold cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In with Email'}
            </button>
          </form>
        )}

        {/* 2. SIGN UP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1A1A1A]">Full Name *</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#5A5A5A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Gaurav Jha"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1A1A1A]">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5A5A5A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1A1A1A]">Company Website (Optional)</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-[#5A5A5A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://company.com"
                  className="input-field pl-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1A1A1A]">Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5A5A5A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>

              {/* Inline Password Requirement Feedback */}
              <div className="bg-[#FEF6EA] p-3 rounded-xl border-2 border-black space-y-1 mt-2">
                <div className="text-[10px] font-extrabold text-[#1A1A1A] mb-1">Password Requirements:</div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  {hasMinLength ? (
                    <Check className="w-3.5 h-3.5 text-[#054048]" />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-[#5A5A5A]">•</span>
                  )}
                  <span className={hasMinLength ? 'text-[#054048] font-bold' : 'text-[#5A5A5A]'}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  {hasNumber ? (
                    <Check className="w-3.5 h-3.5 text-[#054048]" />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-[#5A5A5A]">•</span>
                  )}
                  <span className={hasNumber ? 'text-[#054048] font-bold' : 'text-[#5A5A5A]'}>
                    At least one number (0-9)
                  </span>
                </div>
              </div>
            </div>

            {/* Mandatory Terms & Privacy Policy Consent Checkbox */}
            <div className="bg-[#F8F8F8] p-3 rounded-xl border-2 border-black space-y-1 mt-2">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="signupTermsAccepted"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#054048] rounded border-2 border-black cursor-pointer shrink-0"
                />
                <label htmlFor="signupTermsAccepted" className="text-xs text-[#1A1A1A] font-medium leading-tight cursor-pointer">
                  I agree to the{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#054048] font-bold underline hover:text-black cursor-pointer"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#054048] font-bold underline hover:text-black cursor-pointer"
                  >
                    Privacy Policy
                  </a>.
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid || !termsAccepted}
              className="btn-primary w-full py-2.5 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Free Account'}
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD VIEW */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-left">
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-[#1A1A1A]">Reset Your Password</h2>
              <p className="text-xs text-[#5A5A5A]">
                Enter your email address and we'll send you a password reset link.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1A1A1A]">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5A5A5A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs font-bold cursor-pointer"
            >
              {loading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-[#5A5A5A] hover:text-black font-semibold transition-colors"
              >
                ← Back to Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('reset_password');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-[#054048] hover:underline font-bold"
              >
                Have a reset token?
              </button>
            </div>
          </form>
        )}

        {/* 4. RESET PASSWORD VIEW */}
        {mode === 'reset_password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-left">
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-[#1A1A1A]">Set New Password</h2>
              <p className="text-xs text-[#5A5A5A]">
                Enter your reset token and choose a new password.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1A1A1A]">Reset Token</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#5A5A5A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste reset token here"
                  className="input-field pl-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1A1A1A]">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5A5A5A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>

              {/* Inline Password Feedback */}
              <div className="bg-[#FEF6EA] p-3 rounded-xl border-2 border-black space-y-1 mt-2">
                <div className="flex items-center gap-1.5 text-[11px]">
                  {hasMinLength ? <Check className="w-3.5 h-3.5 text-[#054048]" /> : <span className="w-3.5 h-3.5 text-[#5A5A5A]">•</span>}
                  <span className={hasMinLength ? 'text-[#054048] font-bold' : 'text-[#5A5A5A]'}>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  {hasNumber ? <Check className="w-3.5 h-3.5 text-[#054048]" /> : <span className="w-3.5 h-3.5 text-[#5A5A5A]">•</span>}
                  <span className={hasNumber ? 'text-[#054048] font-bold' : 'text-[#5A5A5A]'}>At least one number (0-9)</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="btn-primary w-full py-2.5 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-xs text-[#5A5A5A] hover:text-black font-semibold transition-colors pt-1 block"
            >
              ← Back to Sign In
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
