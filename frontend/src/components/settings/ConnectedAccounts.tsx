import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Plus, Trash2, CheckCircle2, ShieldCheck, Server, Cloud, ArrowLeft, Key, Lock, Info, X } from 'lucide-react';
import { SendingAccount } from '@mailpersonalize/shared';

interface ConnectedAccountsProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ConnectedAccounts({ isOpen = true, onClose }: ConnectedAccountsProps) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<SendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          setAccounts(data.accounts);
        }
      }
    } catch (err) {
      setError('Failed to load connected sending accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    setDisconnectingId(accountId);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAccounts(accounts.filter((acc) => acc.id !== accountId));
        setSuccessMsg('Sending account disconnected.');
        setShowConfirmModal(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to disconnect account.');
      }
    } catch (err) {
      setError('An error occurred while disconnecting the account.');
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b-2 border-black pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A]">Connected Sending Accounts</h1>
          <p className="text-xs text-[#5A5A5A] font-semibold">Manage your connected Google Workspace, Custom SMTP, and AWS SES accounts</p>
        </div>

        <button
          onClick={() => navigate('/accounts/connect')}
          className="btn-primary py-2.5 px-4 text-xs font-black gap-2 flex items-center cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Connect New Account
        </button>
      </div>

      {error && (
        <div className="p-4 bg-[#FEE2E2] border-2 border-[#D64545] rounded-xl text-xs text-[#D64545] font-bold">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="notice-banner p-4 text-xs font-bold text-[#054048] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#054048]" /> {successMsg}
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-extrabold text-[#1A1A1A]">Disconnect Sending Account</h3>
            <p className="text-xs text-[#5A5A5A] leading-relaxed">
              Are you sure you want to disconnect this account? Active campaigns using this sender will be paused.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDisconnect(showConfirmModal)}
                disabled={Boolean(disconnectingId)}
                className="btn-primary py-2 px-4 text-xs font-bold bg-[#D64545] hover:bg-[#B53535] border-2 border-black text-white"
              >
                {disconnectingId ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connected Accounts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-[#5A5A5A]">Loading sending accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="bg-white border-2 border-black rounded-2xl p-10 text-center space-y-5">
            <div className="relative w-20 h-20 mx-auto">
              <img
                src="/assets/Avatar1.png"
                alt="Waving Avatar"
                className="w-20 h-20 rounded-2xl border-2 border-black object-cover shadow-sm bg-[#FEF6EA]"
              />
              <span className="absolute -top-2 -right-2 bg-[#054048] text-white border-2 border-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                👋 Ready!
              </span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1A1A1A]">No Sending Accounts Connected</h3>
              <p className="text-xs text-[#5A5A5A] mt-1 max-w-md mx-auto font-medium">
                Connect your Google Workspace, Custom SMTP, or AWS SES accounts to start delivering cold email campaigns.
              </p>
            </div>
            <button
              onClick={() => navigate('/accounts/connect')}
              className="btn-primary py-2.5 px-5 text-xs font-extrabold gap-2 inline-flex items-center cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Connect Your First Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white border-2 border-black rounded-xl p-5 space-y-3 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FEF6EA] border-2 border-black flex items-center justify-center text-[#054048]">
                      {acc.provider === 'google_oauth' ? <Mail className="w-5 h-5" /> :
                       acc.provider === 'smtp_app_password' ? <Server className="w-5 h-5 text-[#054048]" /> :
                       <Cloud className="w-5 h-5 text-[#054048]" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#1A1A1A]">{acc.sender_email}</h4>
                      <p className="text-[11px] text-[#5A5A5A] capitalize font-semibold">Provider: {acc.provider}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FEF6EA] text-[#054048] border-2 border-black">
                    CONNECTED
                  </span>
                </div>

                <div className="pt-3 border-t-2 border-black flex items-center justify-between text-xs font-semibold">
                  <span className="text-[11px] text-[#5A5A5A]">
                    Daily Limit: <strong className="text-[#1A1A1A]">{acc.daily_limit || 2000} emails</strong>
                  </span>

                  <button
                    onClick={() => setShowConfirmModal(acc.id)}
                    className="text-[#D64545] hover:underline p-1 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
