import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, AlertTriangle, ShieldCheck, Mail, Server, Cloud, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface SendingDecisionHelperProps {
  onRecommendationChange?: (recommended: 'google' | 'smtp' | 'ses' | null) => void;
  compact?: boolean;
}

export default function SendingDecisionHelper({
  onRecommendationChange,
  compact = false,
}: SendingDecisionHelperProps) {
  const [audience, setAudience] = useState<'warm' | 'cold' | null>(null);
  const [showTable, setShowTable] = useState<boolean>(!compact);

  const handleSelectAudience = (type: 'warm' | 'cold') => {
    setAudience(type);
    if (onRecommendationChange) {
      onRecommendationChange(type === 'warm' ? 'google' : 'ses');
    }
  };

  return (
    <div className="bg-white border-2 border-black rounded-2xl p-5 md:p-6 space-y-5 shadow-sm font-sans">
      {/* 1. Interactive Decision Helper Prompt */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FEF6EA] border-2 border-black flex items-center justify-center text-[#054048]">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#1A1A1A]">Sending Method Decision Helper</h3>
            <p className="text-xs text-[#5A5A5A] font-semibold">Answer 1 quick question to find the right inbox provider for your outreach</p>
          </div>
        </div>

        <div className="bg-[#F8F8F8] border-2 border-black rounded-xl p-4 space-y-3">
          <label className="text-xs font-bold text-[#1A1A1A] block">
            Have most of these contacts heard from you before (replied to an email, opted in, or are existing customers)?
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => handleSelectAudience('warm')}
              className={`flex-1 py-2.5 px-4 rounded-xl border-2 border-black text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-2 ${
                audience === 'warm'
                  ? 'bg-[#054048] text-white shadow-sm'
                  : 'bg-white text-[#1A1A1A] hover:bg-[#FEF6EA]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> Yes, they know me (Warm)
            </button>

            <button
              type="button"
              onClick={() => handleSelectAudience('cold')}
              className={`flex-1 py-2.5 px-4 rounded-xl border-2 border-black text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-2 ${
                audience === 'cold'
                  ? 'bg-[#054048] text-white shadow-sm'
                  : 'bg-white text-[#1A1A1A] hover:bg-[#FEF6EA]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" /> No, cold outreach / new contacts (Cold)
            </button>
          </div>

          {/* Contextual Recommendation Callout Banner */}
          {audience === 'warm' && (
            <div className="notice-banner p-3.5 text-xs text-[#054048] font-semibold space-y-1 rounded-xl">
              <div className="flex items-center gap-1.5 font-black text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#054048]" /> Recommended: Gmail OAuth or Custom SMTP
              </div>
              <p className="text-xs leading-relaxed text-[#1A1A1A]">
                Since these contacts already know you, Gmail or SMTP should work well — this is the simplest option to set up.
              </p>
            </div>
          )}

          {audience === 'cold' && (
            <div className="bg-[#FEF6EA] border-2 border-black p-3.5 text-xs text-[#1A1A1A] font-semibold space-y-1.5 rounded-xl">
              <div className="flex items-center gap-1.5 font-black text-xs text-[#054048]">
                <ShieldCheck className="w-4 h-4 text-[#054048]" /> Recommended: Amazon SES with Verified Domain
              </div>
              <p className="text-xs leading-relaxed text-[#1A1A1A]">
                For emails to people who haven't heard from you before, we strongly recommend Amazon SES with your own domain. Gmail's spam filters are specifically tuned to catch this pattern — even a small volume of cold outreach through Gmail often lands in spam, and can hurt your regular Gmail account's reputation.
              </p>
              <a
                href="/help/ses-setup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-extrabold text-[#054048] hover:underline inline-flex items-center gap-1"
              >
                Read our in-app SES setup guide ↗
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 2. Permanent Always-Visible Comparison Reference Table */}
      <div className="border-t-2 border-black pt-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="w-full flex items-center justify-between text-xs font-extrabold text-[#1A1A1A] cursor-pointer hover:text-[#054048]"
        >
          <span className="flex items-center gap-1.5">
            📊 Permanent Comparison Reference: Which should I choose?
          </span>
          {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTable && (
          <div className="overflow-x-auto border-2 border-black rounded-xl bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F8F8] border-b-2 border-black text-[10px] uppercase font-black tracking-wider text-[#1A1A1A]">
                <tr>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Best For</th>
                  <th className="py-2.5 px-3">Setup Difficulty</th>
                  <th className="py-2.5 px-3">Volume Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y border-black font-medium text-[11px]">
                <tr className={audience === 'warm' ? 'bg-[#FEF6EA]/60 font-bold' : ''}>
                  <td className="py-3 px-3 font-bold text-[#1A1A1A] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#054048]" /> Gmail OAuth / App Password
                  </td>
                  <td className="py-3 px-3 text-[#5A5A5A]">Warm contacts who already know you</td>
                  <td className="py-3 px-3 text-[#054048] font-bold">Easy (few 1-click steps)</td>
                  <td className="py-3 px-3 text-[#5A5A5A]">Low (under ~100-200/day)</td>
                </tr>
                <tr className={audience === 'cold' ? 'bg-[#FEF6EA]/60 font-bold' : ''}>
                  <td className="py-3 px-3 font-bold text-[#1A1A1A] flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-[#054048]" /> Amazon SES + Your Domain
                  </td>
                  <td className="py-3 px-3 text-[#5A5A5A]">Cold outreach, new contacts, high deliverability</td>
                  <td className="py-3 px-3 text-[#054048] font-bold">Moderate (Domain DNS setup)</td>
                  <td className="py-3 px-3 text-[#054048] font-black">High (thousands/day with warm-up)</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
