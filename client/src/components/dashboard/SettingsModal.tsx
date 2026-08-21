import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { User } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';
import { CheckCircle, ShieldCheck, Key } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGoogleConnect = async () => {
    try {
      const res = await api.getGoogleAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      } else {
        showToast(res.message || 'Google Client ID missing. Using Instant Demo Mode.', 'info');
      }
    } catch (err: any) {
      showToast('Failed to get Google OAuth URL', 'error');
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const res = await api.demoLogin();
      localStorage.setItem('auth_token', res.token);
      showToast('Logged in as Alex Rivera (Demo User)', 'success');
      onUserUpdated();
      onClose();
    } catch (err: any) {
      showToast('Demo login error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Infrastructure & OAuth Settings">
      <div className="space-y-6">
        {/* Google Sign-in & Gmail Scope Status */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Google OAuth Sending Permission
            </span>
            {user?.hasGmailOAuth ? (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                Demo / Simulated
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-600">
            Authorizes The Mailing Company to send low-volume personalized emails directly through your Gmail account with official OAuth 2.0 security.
          </p>
          <div className="flex gap-2">
            <button onClick={handleGoogleConnect} className="btn-secondary text-xs">
              Connect Google Account
            </button>
            <button onClick={handleDemoLogin} disabled={loading} className="btn-primary text-xs">
              Instant Demo Account
            </button>
          </div>
        </div>

        {/* Workspace Quotas */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-neutral-900 uppercase tracking-wider block">
            Safe Deliverability Quotas
          </span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="border border-border p-3 rounded-lg bg-white">
              <span className="text-neutral-500 font-medium block">Gmail Personal Daily Cap</span>
              <span className="text-base font-bold text-neutral-900 mt-0.5 block">500 emails / day</span>
              <span className="text-[11px] text-neutral-400">Safe rate: ~80/hr</span>
            </div>
            <div className="border border-border p-3 rounded-lg bg-white">
              <span className="text-neutral-500 font-medium block">Gmail Workspace Cap</span>
              <span className="text-base font-bold text-neutral-900 mt-0.5 block">2,000 emails / day</span>
              <span className="text-[11px] text-neutral-400">Safe rate: ~100/hr</span>
            </div>
          </div>
        </div>

        {/* AWS SES Status */}
        <div className="bg-white border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-900">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-accent" /> AWS SES Integration
            </span>
            {user?.hasSESConfigured ? (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
            ) : (
              <span className="text-xs font-medium text-neutral-500">Configured via .env</span>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            For high volume enterprise bulk sends, set AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY in server environment variables.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Close Settings
          </button>
        </div>
      </div>
    </Modal>
  );
};
