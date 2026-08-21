import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Download, Search, Filter, Mail, Eye, MousePointerClick,
  AlertTriangle, UserX, RefreshCw, Send, Pause, Play, Ban, CheckCircle2, Clock,
  FileText, Copy, Check, X, Sparkles
} from 'lucide-react';
import { CampaignDetailAnalytics, ContactSendLogDetail } from '@mailpersonalize/shared';

interface CampaignDetailViewProps {
  campaignId?: string;
  onBack?: () => void;
}

export default function CampaignDetailView({ campaignId: propCampaignId, onBack }: CampaignDetailViewProps) {
  const navigate = useNavigate();
  const params = useParams<{ campaignId: string }>();
  const activeCampaignId = propCampaignId || params.campaignId || '';

  const [data, setData] = useState<CampaignDetailAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/campaigns');
  };

  // Phase 10D State: View Sent Email Modal & Template Preview
  const [selectedLogForModal, setSelectedLogForModal] = useState<ContactSendLogDetail | null>(null);
  const [fetchingLogContent, setFetchingLogContent] = useState(false);
  const [modalLogDetails, setModalLogDetails] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTemplateSection, setShowTemplateSection] = useState(false);

  const fetchAnalytics = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const query = new URLSearchParams({
      page: String(page),
      pageSize: '10',
      search,
      status: statusFilter,
    }).toString();

    fetch(`/api/analytics/${activeCampaignId}/analytics?${query}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          localStorage.setItem('viewed_results', 'true');
          setData(resData.data);
        } else {
          setError(resData.error || 'Failed to load campaign analytics.');
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (activeCampaignId) fetchAnalytics();
  }, [activeCampaignId, page, search, statusFilter]);

  // Auto-polling every 5s while sending
  useEffect(() => {
    let interval: any = null;
    if (data?.campaign.status === 'sending') {
      interval = setInterval(() => {
        fetchAnalytics(true);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [data?.campaign.status]);

  const handleExportCSV = () => {
    window.open(`/api/analytics/${activeCampaignId}/export-csv`, '_blank');
  };

  const handleOpenSentEmailModal = async (log: ContactSendLogDetail) => {
    setSelectedLogForModal(log);
    setCopied(false);

    if (log.renderedSubject && log.renderedBody) {
      setModalLogDetails({
        subject: log.renderedSubject,
        body: log.renderedBody,
      });
      return;
    }

    setFetchingLogContent(true);
    try {
      const targetId = log.contactId || log.id;
      const res = await fetch(`/api/analytics/${activeCampaignId}/contact-log/${targetId}`);
      const resData = await res.json();
      if (resData.success && resData.log) {
        setModalLogDetails({
          subject: resData.log.renderedSubject,
          body: resData.log.renderedBody,
        });
      } else {
        setModalLogDetails({
          subject: data?.campaign?.email_draft?.subject || 'Sent Email Subject',
          body: data?.campaign?.email_draft?.body_template || 'Sent email body content.',
        });
      }
    } catch (e) {
      setModalLogDetails({
        subject: data?.campaign?.email_draft?.subject || 'Sent Email Subject',
        body: data?.campaign?.email_draft?.body_template || 'Sent email body content.',
      });
    } finally {
      setFetchingLogContent(false);
    }
  };

  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !data) {
    return (
      <div className="p-10 text-center space-y-3 font-sans">
        <RefreshCw className="w-6 h-6 text-[#054048] animate-spin mx-auto" />
        <p className="text-xs font-bold text-[#5A5A5A]">Loading campaign reporting analytics...</p>
      </div>
    );
  }

  const campaign = data?.campaign;
  const stats = data?.stats;
  const logs = data?.logs || [];
  const draft = campaign?.email_draft;
  const design = campaign?.email_design;
  const isAIPersonalized = draft?.mode === 'ai_personalized';

  return (
    <div className="space-y-6 font-sans">
      
      {/* Sent Email Content Modal (Gumroad Light Theme) */}
      {selectedLogForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black rounded-2xl max-w-2xl w-full p-6 space-y-5 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#054048] text-white border-2 border-black flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1A1A1A]">Sent Email Content Log</h3>
                  <p className="text-xs text-[#5A5A5A] font-semibold">
                    To: <strong className="text-[#1A1A1A]">{selectedLogForModal.email}</strong>
                    {selectedLogForModal.name && ` (${selectedLogForModal.name})`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLogForModal(null)}
                className="p-1 text-[#5A5A5A] hover:text-black rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {fetchingLogContent ? (
              <div className="p-12 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-[#054048] animate-spin mx-auto" />
                <p className="text-xs font-bold text-[#5A5A5A]">Retrieving exact sent content record...</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Mode Indicator Badge */}
                <div className="flex items-center justify-between text-xs bg-[#FEF6EA] p-3 rounded-xl border-2 border-black">
                  <span className="text-[#1A1A1A] flex items-center gap-1.5 font-bold">
                    {isAIPersonalized ? (
                      <span className="text-[#054048] font-black flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> AI Personalized Content
                      </span>
                    ) : (
                      <span className="text-[#054048] font-black flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> Fixed Template Render
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-bold text-[#5A5A5A]">
                    Provider: <strong className="text-[#1A1A1A]">{selectedLogForModal.providerUsed || 'Google OAuth'}</strong>
                  </span>
                </div>

                {/* Subject Line */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-[#5A5A5A] uppercase tracking-wider">Subject Line</label>
                  <div className="bg-[#F8F8F8] border-2 border-black rounded-xl p-3 text-xs font-bold text-[#1A1A1A]">
                    {modalLogDetails?.subject || 'No subject line'}
                  </div>
                </div>

                {/* Body Content */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-[#5A5A5A] uppercase tracking-wider">Exact Sent Body</label>
                    <button
                      onClick={() => handleCopyContent(`${modalLogDetails?.subject}\n\n${modalLogDetails?.body}`)}
                      className="text-xs text-[#054048] hover:underline flex items-center gap-1 font-extrabold"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[#054048]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied to Clipboard!' : 'Copy Sent Content'}
                    </button>
                  </div>

                  {draft?.format === 'plain_text' ? (
                    <pre className="bg-[#F8F8F8] border-2 border-black rounded-xl p-4 text-xs font-mono text-[#1A1A1A] whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                      {modalLogDetails?.body}
                    </pre>
                  ) : (
                    <div className="bg-[#F8F8F8] border-2 border-black rounded-xl p-4 text-xs text-[#1A1A1A] max-h-80 overflow-y-auto space-y-2">
                      <div
                        className="prose max-w-none text-xs"
                        dangerouslySetInnerHTML={{ __html: modalLogDetails?.body || '' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 border-t-2 border-black flex justify-end">
              <button
                onClick={() => setSelectedLogForModal(null)}
                className="btn-secondary py-2 px-5 text-xs font-bold"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b-2 border-black pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 text-[#5A5A5A] hover:text-black rounded-xl transition-colors cursor-pointer border-2 border-black bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-[#1A1A1A]">{campaign?.name || 'Campaign Report'}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border-2 border-black ${
                campaign?.status === 'completed' ? 'bg-[#FEF6EA] text-[#054048]' :
                campaign?.status === 'sending' ? 'bg-[#E6F4F1] text-[#054048] animate-pulse' :
                'bg-[#F8F8F8] text-[#5A5A5A]'
              }`}>
                {(campaign?.status || 'DRAFT').toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[#5A5A5A] font-semibold mt-0.5">Real-time delivery stats & per-contact email content logs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTemplateSection(!showTemplateSection)}
            className="btn-secondary py-2 px-4 text-xs font-bold gap-2 flex items-center cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#054048]" />
            {showTemplateSection ? 'Hide Master Template' : 'View Master Template'}
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-primary py-2 px-4 text-xs font-black gap-2 flex items-center cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[3]" /> Export CSV Report
          </button>
        </div>
      </div>

      {/* Expandable Campaign Master Template Section */}
      {showTemplateSection && (
        <div className="bg-white border-2 border-black rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <h3 className="text-sm font-extrabold text-[#1A1A1A] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#054048]" /> Campaign Master Template & Design Reference
            </h3>
            <span className="text-xs font-bold text-[#5A5A5A]">
              Mode: <strong className="text-[#1A1A1A]">{draft?.mode || 'fixed_template'}</strong> ({draft?.format || 'html'})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-[#5A5A5A] uppercase tracking-wider">Subject Line Template</label>
              <div className="bg-[#F8F8F8] border-2 border-black rounded-xl p-3 text-xs font-bold text-[#1A1A1A]">
                {draft?.subject || 'No subject set'}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-[#5A5A5A] uppercase tracking-wider">Design Settings Note</label>
              <div className="bg-[#F8F8F8] border-2 border-black rounded-xl p-3 text-xs text-[#5A5A5A] space-y-1 font-semibold">
                <p>🎨 Font: <strong className="text-[#1A1A1A]">{design?.font_family || 'Arial, sans-serif'}</strong></p>
                <p>🖌️ Accent Color: <strong className="text-[#1A1A1A]">{design?.accent_color || '#054048'}</strong></p>
                {design?.logo_url && <p>🖼️ Logo: <strong className="text-[#1A1A1A]">{design.logo_url}</strong></p>}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-[11px] font-extrabold text-[#5A5A5A] uppercase tracking-wider">Master Body Template</label>
            <pre className="bg-[#F8F8F8] border-2 border-black rounded-xl p-4 text-xs font-mono text-[#1A1A1A] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {draft?.body_template || 'No body template set'}
            </pre>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-black rounded-xl p-4 space-y-1">
          <div className="text-xs text-[#5A5A5A] flex items-center justify-between font-bold">
            <span>Total Delivered</span>
            <Send className="w-4 h-4 text-[#054048]" />
          </div>
          <div className="text-2xl font-black text-[#1A1A1A]">{stats?.sentCount || 0}</div>
          <div className="text-[11px] text-[#5A5A5A]">Out of {stats?.totalContacts || 0} contacts</div>
        </div>

        <div className="bg-white border-2 border-black rounded-xl p-4 space-y-1">
          <div className="text-xs text-[#5A5A5A] flex items-center justify-between font-bold">
            <span>Unique Opens</span>
            <Eye className="w-4 h-4 text-[#054048]" />
          </div>
          <div className="text-2xl font-black text-[#054048]">{stats?.openedCount || 0}</div>
          <div className="text-[11px] text-[#054048] font-bold">{stats?.openRate || 0}% Open Rate</div>
        </div>

        <div className="bg-white border-2 border-black rounded-xl p-4 space-y-1">
          <div className="text-xs text-[#5A5A5A] flex items-center justify-between font-bold">
            <span>Link Clicks</span>
            <MousePointerClick className="w-4 h-4 text-[#054048]" />
          </div>
          <div className="text-2xl font-black text-[#1A1A1A]">{stats?.clickedCount || 0}</div>
          <div className="text-[11px] text-[#5A5A5A]">{stats?.clickRate || 0}% Click Rate</div>
        </div>

        <div className="bg-white border-2 border-black rounded-xl p-4 space-y-1">
          <div className="text-xs text-[#5A5A5A] flex items-center justify-between font-bold">
            <span>Unsubscribes / Bounces</span>
            <UserX className="w-4 h-4 text-[#5A5A5A]" />
          </div>
          <div className="text-2xl font-black text-[#1A1A1A]">{stats?.unsubscribedCount || 0}</div>
          <div className="text-[11px] text-[#5A5A5A]">{stats?.failedCount || 0} failed sends</div>
        </div>
      </div>

      {/* Per-Contact Delivery Logs Table */}
      <div className="bg-white border-2 border-black rounded-xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#1A1A1A]">Contact Delivery Logs</h3>
            <p className="text-xs text-[#5A5A5A]">Click "View Sent Email" to inspect exact content delivered to each contact</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#5A5A5A] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 text-xs py-2 w-48"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#5A5A5A]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field text-xs py-2 w-36"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="suppressed">Suppressed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Send Logs Table */}
        <div className="border-2 border-black rounded-xl overflow-hidden bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F8F8] text-[#1A1A1A] border-b-2 border-black uppercase tracking-wider font-extrabold text-[10px]">
              <tr>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Company & Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sent At</th>
                <th className="py-3 px-4">Opened / Clicked</th>
                <th className="py-3 px-4">Error Notes</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/10 text-[#1A1A1A]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#5A5A5A] font-medium">
                    No contact logs found matching filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FEF6EA] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-extrabold">{log.email}</div>
                      {log.name && <div className="text-[11px] text-[#5A5A5A]">{log.name}</div>}
                    </td>
                    <td className="py-3 px-4 text-[#5A5A5A]">
                      <div className="font-semibold">{log.company || '—'}</div>
                      <div className="text-[10px] text-[#5A5A5A]/80">{log.role || ''}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border-2 border-black ${
                        log.status === 'sent' ? 'bg-[#FEF6EA] text-[#054048]' :
                        log.status === 'failed' ? 'bg-[#FEE2E2] text-[#D64545]' :
                        'bg-[#F8F8F8] text-[#5A5A5A]'
                      }`}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5A5A5A] font-medium">
                      {log.sentAt ? new Date(log.sentAt).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {log.openedAt ? (
                          <span className="text-[#054048] font-extrabold text-[10px] flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Opened
                          </span>
                        ) : (
                          <span className="text-[#5A5A5A]/60 text-[10px]">Unopened</span>
                        )}
                        {log.clickedAt && (
                          <span className="text-[#054048] font-extrabold text-[10px] flex items-center gap-1">
                            <MousePointerClick className="w-3 h-3" /> Clicked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#D64545] text-[11px] max-w-xs truncate font-bold" title={log.errorMessage || ''}>
                      {log.errorMessage || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenSentEmailModal(log)}
                        className="btn-secondary text-[11px] py-1 px-3 font-extrabold gap-1 inline-flex items-center cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#054048]" /> View Sent Email
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
