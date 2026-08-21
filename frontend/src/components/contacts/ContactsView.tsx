import React, { useState, useEffect } from 'react';
import {
  Users, Search, Download, Trash2, Ban, Eye, RefreshCw, X, CheckCircle2, ShieldAlert, Filter, ChevronRight, Mail, Calendar, Hash
} from 'lucide-react';

import { API_BASE, apiFetch } from '../../config';

interface ContactDirectoryItem {
  id: string;
  email: string;
  full_name?: string | null;
  custom_fields?: Record<string, any>;
  status: 'active' | 'suppressed' | 'bounced';
  first_seen_at: string;
  last_updated_at: string;
  campaigns_count: number;
}

interface SendHistoryLog {
  id: string;
  status: string;
  rendered_subject?: string;
  sent_at?: string;
  created_at: string;
  campaign?: {
    name: string;
  };
}

export default function ContactsView() {
  const [directory, setDirectory] = useState<ContactDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suppressed' | 'bounced'>('all');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactDirectoryItem | null>(null);
  const [contactDetailLog, setContactDetailLog] = useState<{ contact: ContactDirectoryItem; sendHistory: SendHistoryLog[] } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modals state
  const [suppressTarget, setSuppressTarget] = useState<{ ids: string[]; emails: string[] } | null>(null);
  const [suppressReason, setSuppressReason] = useState('Manual opt-out request');
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; emails: string[] } | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    localStorage.setItem('visited_contacts', 'true');
    fetchDirectory();
  }, [statusFilter]);

  const fetchDirectory = async (search = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await apiFetch(`/api/contacts/directory?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setDirectory(data.directory || []);
      } else {
        setError(data.error || 'Failed to load contact directory.');
      }
    } catch (err) {
      setError('Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDirectory(searchQuery);
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    window.open(`${API_BASE}/api/contacts/directory/export-csv?${params.toString()}`, '_blank');
  };

  const handleViewDetail = async (contact: ContactDirectoryItem) => {
    setSelectedContact(contact);
    setLoadingDetails(true);
    setContactDetailLog(null);
    try {
      const res = await apiFetch(`/api/contacts/directory/${contact.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setContactDetailLog({
          contact: data.contact,
          sendHistory: data.sendHistory || [],
        });
      }
    } catch (err) {
      console.warn('Failed to load contact details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === directory.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(directory.map((c) => c.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const executeSuppress = async () => {
    if (!suppressTarget) return;
    setSubmittingAction(true);
    try {
      const res = await apiFetch('/api/contacts/directory/suppress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: suppressTarget.ids,
          emails: suppressTarget.emails,
          reason: suppressReason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Contact(s) marked as suppressed.');
        setSelectedIds([]);
        setSuppressTarget(null);
        fetchDirectory();
      } else {
        setError(data.error || 'Failed to suppress contact(s).');
      }
    } catch (err) {
      setError('An error occurred while executing suppression.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setSubmittingAction(true);
    try {
      const res = await apiFetch('/api/contacts/directory/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: deleteTarget.ids,
          emails: deleteTarget.emails,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Contact(s) deleted from directory.');
        setSelectedIds([]);
        setDeleteTarget(null);
        if (selectedContact && deleteTarget.ids.includes(selectedContact.id)) {
          setSelectedContact(null);
        }
        fetchDirectory();
      } else {
        setError(data.error || 'Failed to delete contact(s).');
      }
    } catch (err) {
      setError('An error occurred while deleting contact(s).');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A]">Global Contact Directory</h1>
          <p className="text-xs text-[#5A5A5A] mt-0.5 font-medium">
            Deduplicated master directory automatically synced from your cold email campaign uploads
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="btn-primary py-2.5 px-4 text-xs font-black gap-2 flex items-center cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[3]" /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FEE2E2] border-2 border-[#D64545] rounded-xl text-xs text-[#D64545] font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-[#5A5A5A] hover:text-black font-bold ml-2">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="notice-banner p-4 text-xs font-bold text-[#054048] flex items-center justify-between">
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#054048]" /> {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-[#5A5A5A] hover:text-black font-bold ml-2">✕</button>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white border-2 border-black p-4 rounded-xl">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#5A5A5A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts by email, name, or attributes..."
            className="input-field text-xs pl-10 py-2 w-full"
          />
        </form>

        {/* Status Filter Tabs & Bulk Actions */}
        <div className="flex items-center gap-3 overflow-x-auto">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-[#FEF6EA] border-2 border-black px-3 py-1.5 rounded-xl text-xs">
              <span className="font-extrabold text-[#1A1A1A]">{selectedIds.length} Selected</span>
              <button
                onClick={() => setSuppressTarget({ ids: selectedIds, emails: [] })}
                className="px-2 py-0.5 text-[11px] font-bold bg-[#F8F8F8] text-[#1A1A1A] border border-black rounded-lg cursor-pointer flex items-center gap-1"
              >
                <Ban className="w-3 h-3" /> Bulk Suppress
              </button>
              <button
                onClick={() => setDeleteTarget({ ids: selectedIds, emails: [] })}
                className="px-2 py-0.5 text-[11px] font-bold bg-[#FEE2E2] text-[#D64545] border border-black rounded-lg cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Bulk Delete
              </button>
            </div>
          )}

          <div className="flex bg-[#F8F8F8] border-2 border-black rounded-xl p-1 text-xs">
            {(['all', 'active', 'suppressed', 'bounced'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#054048] text-white shadow-sm'
                    : 'text-[#5A5A5A] hover:text-black'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="border-2 border-black rounded-xl overflow-hidden bg-white">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-[#054048] animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#5A5A5A]">Loading contacts directory...</p>
          </div>
        ) : directory.length === 0 ? (
          <div className="p-10 text-center space-y-4 max-w-md mx-auto">
            <div className="relative w-20 h-20 mx-auto">
              <img
                src="/assets/Avatar1.png"
                alt="Waving Avatar"
                className="w-20 h-20 rounded-2xl border-2 border-black object-cover shadow-sm bg-[#FEF6EA]"
              />
              <span className="absolute -top-2 -right-2 bg-[#054048] text-white border-2 border-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                👋 Welcome!
              </span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1A1A1A]">No Directory Contacts Yet</h3>
              <p className="text-xs text-[#5A5A5A] mt-1.5 leading-relaxed font-medium">
                Contacts appear here automatically once you run your first campaign upload. You will have a single persistent view of everyone you've ever emailed.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F8F8] text-[#1A1A1A] border-b-2 border-black uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === directory.length && directory.length > 0}
                      onChange={handleToggleSelectAll}
                      className="rounded border-black cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Campaigns</th>
                  <th className="py-3 px-4">First Added</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10 text-[#1A1A1A]">
                {directory.map((contact) => {
                  const isSelected = selectedIds.includes(contact.id);
                  const company = contact.custom_fields?.company || contact.custom_fields?.organization || '';
                  const role = contact.custom_fields?.role || contact.custom_fields?.title || '';

                  return (
                    <tr key={contact.id} className={`hover:bg-[#FEF6EA] transition-colors ${isSelected ? 'bg-[#FEF6EA]' : ''}`}>
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(contact.id)}
                          className="rounded border-black cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-[#1A1A1A]">{contact.email}</div>
                        {(contact.full_name || company || role) && (
                          <div className="text-[11px] text-[#5A5A5A] font-semibold flex items-center gap-2 mt-0.5">
                            {contact.full_name && <span>{contact.full_name}</span>}
                            {company && <span>• {company}</span>}
                            {role && <span className="text-[#5A5A5A]/80">({role})</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border-2 border-black ${
                          contact.status === 'active' ? 'bg-[#FEF6EA] text-[#054048]' :
                          contact.status === 'suppressed' ? 'bg-[#F8F8F8] text-[#5A5A5A]' :
                          'bg-[#FEE2E2] text-[#D64545]'
                        }`}>
                          {contact.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-[#1A1A1A] bg-[#F8F8F8] border border-black px-2 py-0.5 rounded-md text-[11px]">
                          {contact.campaigns_count || 1} campaign(s)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#5A5A5A] font-medium">
                        {contact.first_seen_at ? new Date(contact.first_seen_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#5A5A5A] font-medium">
                        {contact.last_updated_at ? new Date(contact.last_updated_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleViewDetail(contact)}
                            className="btn-secondary text-[11px] py-1 px-2.5 font-extrabold gap-1 inline-flex items-center cursor-pointer"
                            title="View Contact Details & Send History"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#054048]" /> Inspect
                          </button>

                          {contact.status !== 'suppressed' && (
                            <button
                              onClick={() => setSuppressTarget({ ids: [contact.id], emails: [contact.email] })}
                              className="p-1.5 text-[#5A5A5A] hover:text-black rounded-lg transition-colors cursor-pointer"
                              title="Manually Suppress Contact"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setDeleteTarget({ ids: [contact.id], emails: [contact.email] })}
                            className="p-1.5 text-[#5A5A5A] hover:text-[#D64545] rounded-lg transition-colors cursor-pointer"
                            title="Delete from Directory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contact Details Drawer / Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end p-0 md:p-6">
          <div className="bg-white border-2 border-black rounded-none md:rounded-2xl max-w-xl w-full h-full md:h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 border-b-2 border-black flex items-start justify-between bg-[#F8F8F8]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-[#1A1A1A] font-mono">{selectedContact.email}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border-2 border-black ${
                    selectedContact.status === 'active' ? 'bg-[#FEF6EA] text-[#054048]' :
                    selectedContact.status === 'suppressed' ? 'bg-[#F8F8F8] text-[#5A5A5A]' :
                    'bg-[#FEE2E2] text-[#D64545]'
                  }`}>
                    {selectedContact.status}
                  </span>
                </div>
                {selectedContact.full_name && (
                  <p className="text-xs text-[#5A5A5A] mt-1 font-bold">{selectedContact.full_name}</p>
                )}
              </div>

              <button
                onClick={() => setSelectedContact(null)}
                className="p-1.5 text-[#5A5A5A] hover:text-black rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border-2 border-black p-3.5 rounded-xl space-y-0.5">
                  <span className="text-[11px] text-[#5A5A5A] flex items-center gap-1 font-bold">
                    <Hash className="w-3.5 h-3.5 text-[#054048]" /> Campaigns Occurrences
                  </span>
                  <p className="text-base font-black text-[#1A1A1A]">{selectedContact.campaigns_count || 1} campaign(s)</p>
                </div>

                <div className="bg-white border-2 border-black p-3.5 rounded-xl space-y-0.5">
                  <span className="text-[11px] text-[#5A5A5A] flex items-center gap-1 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-[#054048]" /> First Added
                  </span>
                  <p className="text-base font-black text-[#1A1A1A]">
                    {selectedContact.first_seen_at ? new Date(selectedContact.first_seen_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>

              {/* Merged Custom Fields Attributes */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5A5A5A]">
                  Merged Fixed Attributes
                </h3>
                <div className="bg-[#F8F8F8] border-2 border-black rounded-xl p-4 space-y-2 text-xs">
                  {(() => {
                    const fields = selectedContact.custom_fields || {};
                    const labelsMap = fields.attribute_labels || {};
                    const canonicalFields = [
                      { key: 'full_name', label: 'Full Name', val: fields.full_name || selectedContact.full_name },
                      { key: 'company', label: 'Company', val: fields.company },
                      { key: 'role', label: 'Role / Job Title', val: fields.role },
                      { key: 'attribute_1', label: `Attribute 1${labelsMap.attribute_1 ? ` (from '${labelsMap.attribute_1}')` : ''}`, val: fields.attribute_1 },
                      { key: 'attribute_2', label: `Attribute 2${labelsMap.attribute_2 ? ` (from '${labelsMap.attribute_2}')` : ''}`, val: fields.attribute_2 },
                      { key: 'attribute_3', label: `Attribute 3${labelsMap.attribute_3 ? ` (from '${labelsMap.attribute_3}')` : ''}`, val: fields.attribute_3 },
                      { key: 'attribute_4', label: `Attribute 4${labelsMap.attribute_4 ? ` (from '${labelsMap.attribute_4}')` : ''}`, val: fields.attribute_4 },
                      { key: 'attribute_5', label: `Attribute 5${labelsMap.attribute_5 ? ` (from '${labelsMap.attribute_5}')` : ''}`, val: fields.attribute_5 },
                    ].filter((item) => Boolean(item.val));

                    if (canonicalFields.length === 0) {
                      return <p className="text-xs text-[#5A5A5A] italic">No additional attributes recorded for this contact.</p>;
                    }

                    return canonicalFields.map((item) => (
                      <div key={item.key} className="flex justify-between border-b border-black/10 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-[#5A5A5A] font-mono text-[11px] font-bold">{item.label}:</span>
                        <span className="font-extrabold text-[#1A1A1A] font-mono text-[11px]">{String(item.val)}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Campaign Delivery History */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5A5A5A]">
                  Joined Campaign Delivery History
                </h3>
                {loadingDetails ? (
                  <div className="p-6 text-center text-xs text-[#5A5A5A] font-bold flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#054048]" /> Loading send history...
                  </div>
                ) : contactDetailLog?.sendHistory && contactDetailLog.sendHistory.length > 0 ? (
                  <div className="space-y-2">
                    {contactDetailLog.sendHistory.map((log) => (
                      <div key={log.id} className="bg-white border-2 border-black p-3 rounded-xl flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-[#1A1A1A]">{log.campaign?.name || 'Cold Outreach Campaign'}</span>
                          {log.rendered_subject && (
                            <p className="text-[11px] text-[#5A5A5A] truncate max-w-xs">{log.rendered_subject}</p>
                          )}
                        </div>
                        <div className="text-right space-y-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border-2 border-black ${
                            log.status === 'sent' ? 'bg-[#FEF6EA] text-[#054048]' :
                            'bg-[#F8F8F8] text-[#5A5A5A]'
                          }`}>
                            {log.status}
                          </span>
                          <p className="text-[10px] text-[#5A5A5A]">
                            {log.sent_at || log.created_at ? new Date(log.sent_at || log.created_at).toLocaleTimeString() : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#F8F8F8] border-2 border-black rounded-xl p-6 text-center text-xs text-[#5A5A5A] font-semibold">
                    No past dispatch logs found for this contact email.
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t-2 border-black bg-[#F8F8F8] flex justify-between items-center">
              {selectedContact.status !== 'suppressed' ? (
                <button
                  onClick={() => {
                    setSuppressTarget({ ids: [selectedContact.id], emails: [selectedContact.email] });
                  }}
                  className="btn-secondary py-2 px-3 text-xs font-extrabold text-[#1A1A1A] gap-1 flex items-center"
                >
                  <Ban className="w-3.5 h-3.5" /> Suppress Contact
                </button>
              ) : <div />}

              <button
                onClick={() => setDeleteTarget({ ids: [selectedContact.id], emails: [selectedContact.email] })}
                className="btn-secondary py-2 px-3 text-xs font-extrabold text-[#D64545] gap-1 flex items-center border-[#D64545]"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Directory Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Suppress Modal */}
      {suppressTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF6EA] border-2 border-black text-[#054048] flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1A1A1A]">Manually Suppress Contact(s)</h3>
                <p className="text-xs text-[#5A5A5A]">Opt-out {suppressTarget.ids.length} contact(s) from all future campaign dispatches</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1A1A1A]">Suppression Reason</label>
              <input
                type="text"
                value={suppressReason}
                onChange={(e) => setSuppressReason(e.target.value)}
                placeholder="e.g. Manual opt-out request via support"
                className="input-field text-xs py-2.5"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSuppressTarget(null)}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={executeSuppress}
                disabled={submittingAction}
                className="btn-primary py-2 px-4 text-xs font-bold"
              >
                {submittingAction ? 'Suppressing...' : 'Confirm Suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] border-2 border-[#D64545] text-[#D64545] flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1A1A1A]">Delete Directory Contact(s)</h3>
                <p className="text-xs text-[#5A5A5A]">Remove {deleteTarget.ids.length} entry(ies) from the Directory view</p>
              </div>
            </div>

            <p className="text-xs text-[#5A5A5A] leading-relaxed">
              This only removes the contact from your master directory list. It does <strong>NOT</strong> retroactively delete historical campaign delivery logs for record-keeping compliance.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={submittingAction}
                className="btn-primary py-2 px-4 text-xs font-bold bg-[#D64545] hover:bg-[#B53535] border-2 border-black text-white"
              >
                {submittingAction ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
