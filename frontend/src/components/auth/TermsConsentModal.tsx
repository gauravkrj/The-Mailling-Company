import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { User } from '@mailpersonalize/shared';
import { apiFetch } from '../../config';

interface TermsConsentModalProps {
  user: User;
  onConsentGiven: (updatedUser: User) => void;
}

export default function TermsConsentModal({ user, onConsentGiven }: TermsConsentModalProps) {
  const location = useLocation();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Do not show consent modal if user accepted, signed up via Google, or if user is viewing legal routes
  if (user.terms_accepted_at || user.google_id || location.pathname === '/privacy' || location.pathname === '/terms') {
    return null;
  }

  const handleConfirmConsent = async () => {
    if (!accepted) {
      setError('Please check the box to agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/user/consent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        onConsentGiven(data.user);
      } else {
        const now = new Date().toISOString();
        onConsentGiven({ ...user, terms_accepted_at: now });
      }
    } catch (e: any) {
      const now = new Date().toISOString();
      onConsentGiven({ ...user, terms_accepted_at: now });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm font-sans">
      <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 animate-fadeIn">
        <div className="flex items-center gap-3 border-b-2 border-black pb-4">
          <div className="w-10 h-10 rounded-xl bg-[#FEF6EA] border-2 border-black flex items-center justify-center text-[#054048]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#1A1A1A]">One Final Step</h2>
            <p className="text-xs text-[#5A5A5A] font-semibold">Please review and agree to our legal terms</p>
          </div>
        </div>

        <p className="text-xs text-[#1A1A1A] leading-relaxed font-medium">
          Welcome to The Mailling Company! Before continuing to your account, please confirm that you agree to our Terms of Service and Privacy Policy.
        </p>

        {error && (
          <div className="p-3 bg-[#FEE2E2] border-2 border-[#D64545] text-[#D64545] rounded-xl text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-[#F8F8F8] border-2 border-black rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="modalTermsAccepted"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-[#054048] rounded border-2 border-black cursor-pointer shrink-0"
            />
            <label htmlFor="modalTermsAccepted" className="text-xs text-[#1A1A1A] font-medium leading-tight cursor-pointer">
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
          type="button"
          onClick={handleConfirmConsent}
          disabled={loading || !accepted}
          className="btn-primary w-full py-2.5 text-xs font-black cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Confirming...' : 'I Agree & Continue to App →'}
        </button>
      </div>
    </div>
  );
}
