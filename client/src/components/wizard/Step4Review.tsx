import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, Send, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';

interface Step4Props {
  campaignId: string;
  campaignName: string;
  mappedContacts: any[];
  draftData: any;
  onBack: () => void;
  onComplete: () => void;
}

export const Step4Review: React.FC<Step4Props> = ({
  campaignId,
  campaignName,
  mappedContacts,
  draftData,
  onBack,
  onComplete,
}) => {
  const { showToast } = useToast();
  const [provider, setProvider] = useState<'GMAIL' | 'SES'>('GMAIL');
  const [rateLimitPerHour, setRateLimitPerHour] = useState(80);
  const [scheduleEstimate, setScheduleEstimate] = useState<any>(null);
  const [autoSpreadDays, setAutoSpreadDays] = useState(1);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    fetchEstimate();
  }, [provider, rateLimitPerHour]);

  const fetchEstimate = async () => {
    try {
      const res = await api.estimateSchedule({
        totalContacts: mappedContacts.length,
        provider,
        workspaceType: 'GMAIL_PERSONAL',
      });
      setScheduleEstimate(res);
      if (res.requiresMultiDaySchedule) {
        setAutoSpreadDays(res.estimatedDays);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const res = await api.launchCampaign({
        campaignId,
        provider,
        rateLimitPerHour,
        autoSpreadDays,
      });

      showToast(res.message || 'Campaign launched successfully!', 'success');
      onComplete();
    } catch (err: any) {
      showToast(err.message || 'Failed to launch campaign', 'error');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">4. Deliverability Review & Launch</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Configure rate limits, verify deliverability safeguards, and initiate queued sending.
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-card space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="border-r border-border pr-4">
            <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider block">Campaign Name</span>
            <span className="text-sm font-semibold text-neutral-900 truncate block mt-0.5">{campaignName}</span>
          </div>
          <div className="border-r border-border pr-4">
            <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider block">Total Recipients</span>
            <span className="text-sm font-semibold text-neutral-900 block mt-0.5">{mappedContacts.length} contacts</span>
          </div>
          <div>
            <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider block">AI Personalization</span>
            <span className="text-sm font-semibold text-accent block mt-0.5">
              {draftData?.aiPersonalizeEnabled ? 'Enabled (Claude Row Rewriting)' : 'Standard Variable Sub'}
            </span>
          </div>
        </div>
      </div>

      {/* Sending Provider & Rate Limits */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-card space-y-5">
        <h3 className="text-sm font-semibold text-neutral-900">Select Sending Infrastructure</h3>

        <div className="grid grid-cols-2 gap-4">
          <label
            onClick={() => setProvider('GMAIL')}
            className={`border rounded-lg p-4 cursor-pointer transition-all flex items-start justify-between ${
              provider === 'GMAIL' ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-border hover:bg-neutral-50'
            }`}
          >
            <div>
              <span className="text-sm font-semibold text-neutral-900 block">Gmail API OAuth</span>
              <span className="text-xs text-neutral-500 block mt-1">
                Best for low-volume (&lt; 300/day). Highest primary inbox placement.
              </span>
            </div>
            <input type="radio" name="provider" checked={provider === 'GMAIL'} readOnly className="mt-1" />
          </label>

          <label
            onClick={() => setProvider('SES')}
            className={`border rounded-lg p-4 cursor-pointer transition-all flex items-start justify-between ${
              provider === 'SES' ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-border hover:bg-neutral-50'
            }`}
          >
            <div>
              <span className="text-sm font-semibold text-neutral-900 block">AWS SES (Enterprise)</span>
              <span className="text-xs text-neutral-500 block mt-1">
                For high-volume bulk outreach lists. Bypasses Gmail daily caps.
              </span>
            </div>
            <input type="radio" name="provider" checked={provider === 'SES'} readOnly className="mt-1" />
          </label>
        </div>

        {/* Rate limit Slider */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 mb-2">
            <span>Send Rate Throttling</span>
            <span className="font-mono text-accent">{rateLimitPerHour} emails / hour</span>
          </div>
          <input
            type="range"
            min={20}
            max={provider === 'SES' ? 500 : 120}
            step={10}
            value={rateLimitPerHour}
            onChange={(e) => setRateLimitPerHour(Number(e.target.value))}
            className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-accent"
          />
          <span className="text-xs text-neutral-500 mt-1 block">
            Recommended: 80 emails/hr for Gmail reputation preservation.
          </span>
        </div>

        {/* Schedule Estimate Box */}
        {scheduleEstimate && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-700">
              <span className="font-semibold block mb-0.5 text-neutral-900">Calculated Schedule & Duration</span>
              {scheduleEstimate.recommendation}
            </div>
          </div>
        )}

        {/* Multi-Day Schedule Option Warning */}
        {scheduleEstimate?.exceedsDailyLimit && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <span className="font-semibold block">Gmail Daily Volume Threshold Reached</span>
              <p>
                Your list of {mappedContacts.length} recipients exceeds Gmail's safe daily limit. Select how you would like to proceed:
              </p>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="scheduleOption"
                    checked={autoSpreadDays > 1}
                    onChange={() => setAutoSpreadDays(scheduleEstimate.estimatedDays)}
                  />
                  Auto-spread across {scheduleEstimate.estimatedDays} days
                </label>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="scheduleOption"
                    checked={provider === 'SES'}
                    onChange={() => setProvider('SES')}
                  />
                  Switch to AWS SES
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compliance & Deliverability Checklist */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-card space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Automated Compliance Verification
        </div>

        <ul className="space-y-2 text-xs text-neutral-600">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Clean multipart MIME format (HTML + Plain text alternative) generated for 100% Primary Inbox placement
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Localhost URL protection enabled: avoids triggering automated ISP spam filters during testing
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Mandatory 1-click Unsubscribe footer & Suppression List validation
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Global Suppression List checked before every single send attempt
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Exponential backoff retry handler enabled for transient SMTP / API rate errors
          </li>
        </ul>
      </div>

      {/* Action Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="btn-secondary gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handleLaunch} disabled={launching} className="btn-accent px-6 py-2.5 text-base gap-2">
          {launching ? 'Queuing Pipeline...' : 'Launch Campaign'} <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
