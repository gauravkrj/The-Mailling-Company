import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Server, Cloud, Key, Lock, Info } from 'lucide-react';
import SesDomainWizard from '../accounts/SesDomainWizard';
import SendingDecisionHelper from '../common/SendingDecisionHelper';

type ProviderType = 'select' | 'google' | 'smtp' | 'ses';

const SMTP_PRESETS = [
  { label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 465 },
  { label: 'Outlook / Office365', host: 'smtp.office365.com', port: 587 },
  { label: 'Zoho Mail', host: 'smtp.zoho.com', port: 465 },
  { label: 'Custom SMTP Server', host: '', port: 587 },
];

const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
];

export default function ConnectAccountsPage() {
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ProviderType>('select');
  const [submitting, setSubmitting] = useState(false);
  const [showDomainWizard, setShowDomainWizard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // SMTP Form State
  const [smtpEmail, setSmtpEmail] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(465);

  // AWS SES Form State
  const [sesEmail, setSesEmail] = useState('');
  const [sesAccessKey, setSesAccessKey] = useState('');
  const [sesSecretKey, setSesSecretKey] = useState('');
  const [sesRegion, setSesRegion] = useState('us-east-1');

  const [recommendedProvider, setRecommendedProvider] = useState<'google' | 'smtp' | 'ses' | null>(null);

  const handleConnectGoogle = () => {
    window.location.href = '/api/accounts/google/connect';
  };

  const handleSmtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpEmail || !smtpPassword || !smtpHost) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/accounts/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_email: smtpEmail.trim(),
          app_password: smtpPassword,
          smtp_host: smtpHost,
          smtp_port: Number(smtpPort),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to connect SMTP account. Check host & credentials.');
      } else {
        setSuccessMsg(`Successfully connected ${smtpEmail}!`);
        setTimeout(() => navigate('/accounts'), 1500);
      }
    } catch (err: any) {
      setError('An error occurred connecting your SMTP server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sesEmail || !sesAccessKey || !sesSecretKey) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/accounts/ses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_email: sesEmail.trim(),
          aws_access_key: sesAccessKey.trim(),
          aws_secret_key: sesSecretKey.trim(),
          aws_region: sesRegion,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to verify AWS SES credentials.');
      } else {
        setSuccessMsg(`Successfully connected AWS SES account (${sesEmail})!`);
        setTimeout(() => navigate('/accounts'), 1500);
      }
    } catch (err: any) {
      setError('An error occurred connecting AWS SES.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b-2 border-black pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/accounts')}
            className="p-2 text-[#5A5A5A] hover:text-black rounded-xl transition-colors cursor-pointer border-2 border-black bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#1A1A1A]">Connect Sending Account</h1>
            <p className="text-xs text-[#5A5A5A] font-semibold">Link your Google OAuth, Custom SMTP, or AWS SES accounts</p>
          </div>
        </div>
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

      {/* Mode 1: Dedicated AWS SES Domain Setup Wizard (Phase 9A) */}
      {showDomainWizard ? (
        <div className="bg-white border-2 border-black rounded-2xl p-6">
          <SesDomainWizard isOpen={true} onClose={() => setShowDomainWizard(false)} onSuccess={() => setShowDomainWizard(false)} />
        </div>
      ) : (
        <>
          {/* Provider Selection Tabs */}
          {provider !== 'select' && (
            <button
              onClick={() => setProvider('select')}
              className="text-xs text-[#054048] hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Choose a different provider
            </button>
          )}

          {/* Card Options with Decision Helper Below */}
          {provider === 'select' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Google OAuth Card */}
                <div
                  className={`bg-white border-2 border-black rounded-xl p-6 space-y-4 flex flex-col justify-between transition-all ${
                    recommendedProvider === 'google' ? 'ring-4 ring-[#054048]/30 bg-[#FEF6EA]/40' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-[#FEF6EA] border-2 border-black flex items-center justify-center text-black">
                        <Mail className="w-6 h-6 text-[#054048]" />
                      </div>
                      {recommendedProvider === 'google' && (
                        <span className="bg-[#054048] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-black shadow-sm">
                          ⭐ Recommended
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-[#1A1A1A]">Google Workspace</h3>
                    <p className="text-xs text-[#5A5A5A] leading-relaxed font-medium">
                      Connect via 1-click Google OAuth 2.0 with automatic Gmail token refreshing.
                    </p>
                  </div>

                  <button
                    onClick={handleConnectGoogle}
                    className="btn-primary py-2.5 px-4 text-xs font-extrabold w-full justify-center flex items-center gap-2 cursor-pointer"
                  >
                    Connect Google Account
                  </button>
                </div>

                {/* Custom SMTP Card */}
                <div className="bg-white border-2 border-black rounded-xl p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-[#FEF6EA] border-2 border-black flex items-center justify-center text-black">
                      <Server className="w-6 h-6 text-[#054048]" />
                    </div>
                    <h3 className="text-base font-extrabold text-[#1A1A1A]">Custom SMTP</h3>
                    <p className="text-xs text-[#5A5A5A] leading-relaxed font-medium">
                      Connect any SMTP server, Microsoft 365, Zoho, or Google App Passwords.
                    </p>
                  </div>

                  <button
                    onClick={() => setProvider('smtp')}
                    className="btn-primary py-2.5 px-4 text-xs font-extrabold w-full justify-center flex items-center gap-2 cursor-pointer"
                  >
                    Configure SMTP
                  </button>
                </div>

                {/* AWS SES Card */}
                <div
                  className={`bg-white border-2 border-black rounded-xl p-6 space-y-4 flex flex-col justify-between transition-all ${
                    recommendedProvider === 'ses' ? 'ring-4 ring-[#054048]/30 bg-[#FEF6EA]/40' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-[#FEF6EA] border-2 border-black flex items-center justify-center text-black">
                        <Cloud className="w-6 h-6 text-[#054048]" />
                      </div>
                      {recommendedProvider === 'ses' && (
                        <span className="bg-[#054048] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-black shadow-sm">
                          ⭐ Recommended
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-[#1A1A1A]">AWS SES</h3>
                    <p className="text-xs text-[#5A5A5A] leading-relaxed font-medium">
                      Connect AWS Simple Email Service with IAM access keys or custom domain verification.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setProvider('ses')}
                      className="btn-primary py-2.5 px-4 text-xs font-extrabold w-full justify-center flex items-center gap-2 cursor-pointer"
                    >
                      Connect AWS SES
                    </button>
                  </div>
                </div>
              </div>

              {/* Decision Helper Rendered BELOW the Three Option Cards */}
              <SendingDecisionHelper onRecommendationChange={(rec) => setRecommendedProvider(rec)} />
            </div>
          )}

          {/* Form 2: Custom SMTP App Password */}
          {provider === 'smtp' && (
            <form onSubmit={handleSmtpSubmit} className="bg-white border-2 border-black rounded-xl p-6 space-y-5">
              <div className="border-b-2 border-black pb-4">
                <h3 className="text-sm font-extrabold text-[#1A1A1A]">Connect SMTP Server</h3>
                <p className="text-xs text-[#5A5A5A]">Enter your SMTP host settings and application password</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A1A1A]">Select Preset Server</label>
                  <select
                    onChange={(e) => {
                      const found = SMTP_PRESETS.find((p) => p.host === e.target.value);
                      if (found) {
                        setSmtpHost(found.host);
                        setSmtpPort(found.port);
                      }
                    }}
                    className="input-field text-xs py-2.5"
                  >
                    {SMTP_PRESETS.map((p, i) => (
                      <option key={i} value={p.host}>
                        {p.label} {p.host ? `(${p.host}:${p.port})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A1A1A]">Sender Email Address</label>
                  <input
                    type="email"
                    value={smtpEmail}
                    onChange={(e) => setSmtpEmail(e.target.value)}
                    placeholder="you@yourcompany.com"
                    className="input-field text-xs py-2.5"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A1A1A]">App Password / Password</label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="input-field text-xs py-2.5"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#1A1A1A]">SMTP Host</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="input-field text-xs py-2.5"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#1A1A1A]">Port</label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      placeholder="465"
                      className="input-field text-xs py-2.5"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-black flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setProvider('select')}
                  className="btn-secondary py-2.5 px-4 text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2.5 px-6 text-xs font-extrabold"
                >
                  {submitting ? 'Connecting...' : 'Save & Verify SMTP'}
                </button>
              </div>
            </form>
          )}

          {/* Form 3: AWS SES */}
          {provider === 'ses' && (
            <form onSubmit={handleSesSubmit} className="bg-white border-2 border-black rounded-xl p-6 space-y-5">
              <div className="border-b-2 border-black pb-4">
                <h3 className="text-sm font-extrabold text-[#1A1A1A]">Connect AWS Simple Email Service (SES)</h3>
                <p className="text-xs text-[#5A5A5A]">Provide IAM user credentials with ses:SendEmail permissions</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A1A1A]">Verified SES Sender Email</label>
                  <input
                    type="text"
                    value={sesEmail}
                    onChange={(e) => setSesEmail(e.target.value)}
                    placeholder="outreach@mail.dgwrench.com"
                    className="input-field text-xs py-2.5 font-mono"
                    required
                  />
                  <p className="text-[11px] text-[#5A5A5A] font-semibold">
                    Enter your verified AWS SES sender email address (e.g. <u>outreach@mail.dgwrench.com</u>).
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A1A1A]">AWS Region</label>
                  <select
                    value={sesRegion}
                    onChange={(e) => setSesRegion(e.target.value)}
                    className="input-field text-xs py-2.5"
                  >
                    {AWS_REGIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label} ({r.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A1A1A]">AWS Access Key ID</label>
                  <input
                    type="text"
                    value={sesAccessKey}
                    onChange={(e) => setSesAccessKey(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="input-field text-xs py-2.5 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A1A1A]">AWS Secret Access Key</label>
                  <input
                    type="password"
                    value={sesSecretKey}
                    onChange={(e) => setSesSecretKey(e.target.value)}
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    className="input-field text-xs py-2.5 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t-2 border-black flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setProvider('select')}
                  className="btn-secondary py-2.5 px-4 text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2.5 px-6 text-xs font-extrabold"
                >
                  {submitting ? 'Connecting...' : 'Save & Verify SES Credentials'}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
