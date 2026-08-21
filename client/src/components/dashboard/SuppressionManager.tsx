import React, { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, Plus, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { SuppressionItem } from '../../types';
import { useToast } from '../ui/Toast';

export const SuppressionManager: React.FC = () => {
  const { showToast } = useToast();
  const [suppressions, setSuppressions] = useState<SuppressionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchSuppressions = async () => {
    try {
      const list = await api.getSuppressions();
      setSuppressions(list);
    } catch (err: any) {
      showToast('Failed to fetch suppression list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppressions();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    setAdding(true);
    try {
      await api.addSuppression(newEmail);
      showToast(`Added ${newEmail} to suppression list.`, 'success');
      setNewEmail('');
      await fetchSuppressions();
    } catch (err: any) {
      showToast(err.message || 'Failed to add email', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (email: string) => {
    try {
      await api.removeSuppression(email);
      showToast(`Removed ${email} from suppression list.`, 'success');
      setSuppressions(prev => prev.filter(s => s.email !== email));
    } catch (err: any) {
      showToast('Failed to remove email', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2.5">
          <ShieldAlert className="w-6 h-6 text-rose-600" /> Global Suppression List
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Emails on this list are automatically blocked from receiving any outreach across all your campaigns to protect deliverability reputation and maintain legal CAN-SPAM compliance.
        </p>
      </div>

      {/* Add Email Form */}
      <form onSubmit={handleAdd} className="bg-white border border-border p-4 rounded-xl shadow-card flex gap-3">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="Enter email address to suppress..."
          className="input-field flex-1"
        />
        <button type="submit" disabled={adding} className="btn-accent shrink-0 gap-1.5">
          <Plus className="w-4 h-4" /> Suppress Email
        </button>
      </form>

      {/* Suppression List Table */}
      <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border bg-neutral-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            Suppressed Recipients ({suppressions.length})
          </span>
          <button onClick={fetchSuppressions} className="btn-ghost p-1 text-neutral-400 hover:text-neutral-600">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-neutral-400">Loading suppression list...</div>
        ) : suppressions.length === 0 ? (
          <div className="py-8 text-center text-neutral-400 text-xs">
            No suppressed email addresses. Unsubscribed contacts will automatically appear here.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {suppressions.map((item) => (
              <div key={item.id} className="px-6 py-3 flex items-center justify-between hover:bg-neutral-50/50 text-xs">
                <div className="space-y-0.5">
                  <span className="font-mono font-medium text-neutral-900 block">{item.email}</span>
                  <span className="text-neutral-400 text-[11px]">
                    Reason: {item.reason} • Added: {new Date(item.addedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(item.email)}
                  className="text-neutral-400 hover:text-rose-600 p-1.5 transition-colors"
                  title="Remove from suppression list"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
