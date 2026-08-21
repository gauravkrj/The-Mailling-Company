import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, ShieldCheck, CheckCircle2, AlertTriangle, ArrowLeft, ExternalLink,
  ChevronDown, ChevronUp, Copy, Info, Server, HelpCircle, FileText, Lock, Zap, X
} from 'lucide-react';

interface StepItem {
  id: number;
  instruction: string;
  codeSnippet?: string;
  registrarHelp?: boolean;
  tooltip: string;
}

export default function SesHelpGuideView() {
  const navigate = useNavigate();
  const [activeRegistrar, setActiveRegistrar] = useState<'hostinger' | 'godaddy' | 'namecheap' | 'cloudflare'>('hostinger');
  const [openTooltipId, setOpenTooltipId] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const steps: StepItem[] = [
    {
      id: 1,
      instruction: 'Go to aws.amazon.com and create a free account',
      tooltip: 'AWS (Amazon Web Services) is Amazon\'s cloud platform. Simple Email Service (SES) is their enterprise email infrastructure service.',
    },
    {
      id: 2,
      instruction: 'In the AWS search bar at the top, type "SES" and click Amazon Simple Email Service',
      tooltip: 'SES stands for Simple Email Service — Amazon\'s high-deliverability cloud mail server engine.',
    },
    {
      id: 3,
      instruction: 'Click "Create identity"',
      tooltip: 'An "identity" in SES is an email address or domain name you authorize Amazon to send emails from.',
    },
    {
      id: 4,
      instruction: 'Select "Domain," and enter your sending domain (recommended: mail.yourdomain.com)',
      tooltip: 'We strongly recommend using a subdomain (like mail.yourdomain.com) so any spam complaints on outreach never affect your main business email domain.',
    },
    {
      id: 5,
      instruction: 'Click "Create identity" to generate your DNS records',
      tooltip: 'DNS records are public internet setup instructions that tell receiving inboxes like Gmail that Amazon SES is authorized to send for your domain.',
    },
    {
      id: 6,
      instruction: 'Copy each DNS record shown (Type, Host/Name, Value) into your domain\'s DNS settings',
      registrarHelp: true,
      tooltip: 'TXT records verify ownership, CNAME records add DKIM cryptographic signatures, and MX/MAIL FROM records handle bounce processing. Avoid duplicate domain suffixes!',
    },
    {
      id: 7,
      instruction: 'Wait for verification — click "Check Verification Status" in our wizard periodically',
      tooltip: 'DNS propagation means internet servers worldwide updating their address books. This usually takes 5–15 minutes, but up to a few hours in rare cases.',
    },
    {
      id: 8,
      instruction: 'Once verified, go to the AWS search bar again, type "IAM," and open it',
      tooltip: 'IAM (Identity and Access Management) is where you create secure API login keys so our app can send emails through your SES account.',
    },
    {
      id: 9,
      instruction: 'Click "Users" in the left sidebar, then "Create user"',
      tooltip: 'Creating a separate API user protects your main AWS account login credentials.',
    },
    {
      id: 10,
      instruction: 'Name the user (e.g., "ses-sending-user"), leave "Provide user access to AWS Management Console" UNCHECKED, click Next',
      tooltip: 'Console access is for human web logins. Our app only needs programatic API key access.',
    },
    {
      id: 11,
      instruction: 'Select "Attach policies directly," search for "AmazonSESFullAccess," check it, click Next, then "Create user"',
      tooltip: 'This permission grants the user access to send emails via Amazon SES without granting access to billing or other AWS services.',
    },
    {
      id: 12,
      instruction: 'Click on the new user you just created, go to the "Security credentials" tab, click "Create access key"',
      tooltip: 'An access key consists of a Key ID and Secret Key that act like a username and password for API authorization.',
    },
    {
      id: 13,
      instruction: 'Select "Application running outside AWS" as the use case, click Next, then "Create access key"',
      tooltip: 'This setting configures standard static API credentials for third-party application servers.',
    },
    {
      id: 14,
      instruction: 'Copy both the Access Key ID and Secret Access Key immediately — the Secret Key is shown ONLY ONCE',
      tooltip: 'AWS hides the Secret Key after this step for security. If lost, you must delete it and generate a new key pair.',
    },
    {
      id: 15,
      instruction: 'Paste these into our app\'s SES connection screen, along with your domain and AWS region',
      tooltip: 'Self-explanatory: connects your verified SES domain & IAM keys directly to The Mailling Company.',
    },
    {
      id: 16,
      instruction: 'In the AWS SES console, find your account\'s sending status — if it says "Sandbox," click "Request production access"',
      tooltip: 'Sandbox mode is AWS\'s default testing state that limits sending to verified addresses only.',
    },
    {
      id: 17,
      instruction: 'Fill out the production access request form honestly (describe personalized business outreach with unsubscribe support)',
      codeSnippet: 'We send personalized B2B outreach emails to opt-in business contacts. All emails feature 1-click unsubscribe links and strictly follow CAN-SPAM and GDPR guidelines.',
      tooltip: 'AWS reviews production requests to prevent spam. Requests are typically approved within 12–24 hours.',
    },
    {
      id: 18,
      instruction: 'While waiting, you can already test sending — verify your own email as a recipient in SES and send yourself a test campaign',
      tooltip: 'In Sandbox mode, you can immediately send test campaigns to your own verified email addresses while waiting for full production approval.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-[#1A1A1A] font-sans antialiased py-8 px-4 md:px-8 space-y-8 max-w-4xl mx-auto">
      
      {/* Top Navigation Header */}
      <div className="bg-white p-6 rounded-2xl border-2 border-black shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-[#5A5A5A] hover:text-black rounded-xl transition-colors border-2 border-black bg-[#F8F8F8] cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#054048] bg-[#FEF6EA] border border-black px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1">
              <Zap className="w-3.5 h-3.5" /> Action-First Checklist
            </div>
            <h1 className="text-xl md:text-2xl font-black text-[#1A1A1A] tracking-tight">
              Amazon SES + Domain Setup Checklist
            </h1>
            <p className="text-xs text-[#5A5A5A] font-semibold">
              Follow the 18 numbered action steps below. Click any <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#054048] text-white text-[10px] font-bold">?</span> for optional context.
            </p>
          </div>
        </div>

        <button
          onClick={() => window.close()}
          className="btn-secondary text-xs py-2 px-4 font-bold self-start md:self-auto cursor-pointer"
        >
          Close Tab ✕
        </button>
      </div>

      {/* MAIN CHECKLIST OF 18 ACTION STEPS */}
      <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <h2 className="text-base font-black text-[#1A1A1A]">
            18-Step Quick Execution Checklist
          </h2>
          <span className="text-[11px] font-bold text-[#054048] bg-[#FEF6EA] border border-black px-2.5 py-1 rounded-full">
            No jargon required
          </span>
        </div>

        <div className="space-y-3.5 pt-2">
          {steps.map((s) => (
            <div
              key={s.id}
              className="bg-[#F8F8F8] border-2 border-black rounded-xl p-4 flex flex-col space-y-2 relative transition-all hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-[#054048] text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                    {s.id}
                  </span>
                  <div className="text-xs md:text-sm font-extrabold text-[#1A1A1A] leading-snug">
                    {s.instruction}
                  </div>
                </div>

                {/* Optional ? Info Button */}
                <button
                  type="button"
                  onClick={() => setOpenTooltipId(openTooltipId === s.id ? null : s.id)}
                  className={`w-6 h-6 rounded-full border border-black flex items-center justify-center text-xs font-black shrink-0 cursor-pointer transition-all ${
                    openTooltipId === s.id
                      ? 'bg-[#054048] text-white'
                      : 'bg-white text-[#054048] hover:bg-[#FEF6EA]'
                  }`}
                  title="Why this step matters (Optional)"
                >
                  ?
                </button>
              </div>

              {/* Optional ? Tooltip / Context Popover */}
              {openTooltipId === s.id && (
                <div className="mt-2 p-3 bg-[#FEF6EA] border-2 border-black rounded-xl text-xs space-y-1 relative animate-fadeIn">
                  <div className="flex items-center justify-between font-black text-[#054048] text-[11px]">
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" /> Why this step matters:
                    </span>
                    <button
                      onClick={() => setOpenTooltipId(null)}
                      className="text-[#5A5A5A] hover:text-black font-bold text-[10px]"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <p className="text-[11px] text-[#1A1A1A] leading-relaxed font-medium">
                    {s.tooltip}
                  </p>
                </div>
              )}

              {/* Embedded Sub-instructions for Step 6 (Registrar Paths) */}
              {s.registrarHelp && (
                <div className="mt-2 pt-2 border-t border-black/20 space-y-3">
                  <div className="text-[11px] font-extrabold text-[#1A1A1A]">
                    Click your registrar below for exact DNS navigation path:
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(['hostinger', 'godaddy', 'namecheap', 'cloudflare'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setActiveRegistrar(r)}
                        className={`py-1 px-3 rounded-lg text-[11px] font-extrabold capitalize border border-black cursor-pointer transition-all ${
                          activeRegistrar === r
                            ? 'bg-[#054048] text-white'
                            : 'bg-white text-[#1A1A1A] hover:bg-[#FEF6EA]'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <div className="bg-white border border-black rounded-lg p-3 text-xs font-mono text-[#054048] font-bold">
                    {activeRegistrar === 'hostinger' && 'Hostinger: hPanel → Domains → your domain → DNS / Name Servers → DNS Zone Editor'}
                    {activeRegistrar === 'godaddy' && 'GoDaddy: My Products → DNS → Manage Zones'}
                    {activeRegistrar === 'namecheap' && 'Namecheap: Domain List → Manage → Advanced DNS'}
                    {activeRegistrar === 'cloudflare' && 'Cloudflare: select your domain → DNS → Records (Proxy = DNS Only)'}
                  </div>
                </div>
              )}

              {/* Code Snippet Copy Option for Step 17 */}
              {s.codeSnippet && (
                <div className="mt-2 bg-white p-3 rounded-lg border border-black text-[11px] font-mono text-[#1A1A1A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span>"{s.codeSnippet}"</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(s.codeSnippet!, 'step17')}
                    className="btn-primary text-[10px] py-1 px-2.5 font-bold shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'step17' ? '✓ Copied' : 'Copy Text'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* COMMON PROBLEMS SECTION (1-2 Sentences Action-Focused) */}
      <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-8 space-y-4 shadow-sm">
        <h2 className="text-base font-black text-[#1A1A1A] flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Common Problems (Action-Focused Fixes)
        </h2>

        <div className="space-y-2.5 text-xs">
          {/* FAQ 1 */}
          <div className="border-2 border-black rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}
              className="w-full p-3.5 text-left font-extrabold text-[#1A1A1A] bg-[#F8F8F8] hover:bg-[#FEF6EA] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>"DNS still shows Pending after a while"</span>
              {openFaq === 1 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openFaq === 1 && (
              <div className="p-3.5 border-t-2 border-black font-medium leading-relaxed text-[#1A1A1A] bg-[#FEF6EA]">
                Check your records at <a href="https://www.whatsmydns.net" target="_blank" rel="noopener noreferrer" className="text-[#054048] underline font-bold">whatsmydns.net ↗</a> — if they don't show there either, re-check for typos or the auto-append issue in step 6.
              </div>
            )}
          </div>

          {/* FAQ 2 */}
          <div className="border-2 border-black rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}
              className="w-full p-3.5 text-left font-extrabold text-[#1A1A1A] bg-[#F8F8F8] hover:bg-[#FEF6EA] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>"Verification failed"</span>
              {openFaq === 2 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openFaq === 2 && (
              <div className="p-3.5 border-t-2 border-black font-medium leading-relaxed text-[#1A1A1A] bg-[#FEF6EA]">
                Most common cause: your registrar added your domain twice to the record name — check for something like <code className="font-mono bg-white px-1">record.yourdomain.com.yourdomain.com</code> and fix it.
              </div>
            )}
          </div>

          {/* FAQ 3 */}
          <div className="border-2 border-black rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => setOpenFaq(openFaq === 3 ? null : 3)}
              className="w-full p-3.5 text-left font-extrabold text-[#1A1A1A] bg-[#F8F8F8] hover:bg-[#FEF6EA] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>"AWS is asking follow-up questions on my production request"</span>
              {openFaq === 3 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openFaq === 3 && (
              <div className="p-3.5 border-t-2 border-black font-medium leading-relaxed text-[#1A1A1A] bg-[#FEF6EA]">
                Normal, just answer honestly about your use case (describe your opt-out handling and contact collection methods).
              </div>
            )}
          </div>

          {/* FAQ 4 */}
          <div className="border-2 border-black rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => setOpenFaq(openFaq === 4 ? null : 4)}
              className="w-full p-3.5 text-left font-extrabold text-[#1A1A1A] bg-[#F8F8F8] hover:bg-[#FEF6EA] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>"Can I skip the subdomain and use my main domain?"</span>
              {openFaq === 4 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openFaq === 4 && (
              <div className="p-3.5 border-t-2 border-black font-medium leading-relaxed text-[#1A1A1A] bg-[#FEF6EA]">
                Yes, just skip typing "mail." in step 4 — but a reputation issue on this domain later would then also affect your regular email.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STILL STUCK? SUPPORT CONTACT SECTION */}
      <div className="bg-[#FEF6EA] border-2 border-black rounded-2xl p-6 text-center space-y-3 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-white border-2 border-black flex items-center justify-center mx-auto text-[#054048]">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-black text-[#1A1A1A]">Still Stuck? Need Direct Help?</h3>
          <p className="text-xs text-[#5A5A5A] font-medium max-w-md mx-auto">
            Our support team can double check your DNS records and AWS permissions for you.
          </p>
        </div>
        <a
          href="mailto:support@thedgwrench.com?subject=SES%20Domain%20Setup%20Assistance"
          className="btn-primary py-2.5 px-6 text-xs font-black inline-flex items-center gap-2 cursor-pointer"
        >
          Contact Support Team →
        </a>
      </div>

    </div>
  );
}
