import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, Upload, Check, AlertCircle, Sparkles, Wand2, Tag, LayoutTemplate,
  FileSpreadsheet, ArrowRight, ArrowLeft, Palette, Eye, Mail, Type, Image,
  MousePointerClick, Signature, RefreshCw, Send, Pause, Play, Ban, ShieldCheck, ShieldAlert, ChevronRight
} from 'lucide-react';
import { CSVPreviewResult, CSVRowPreview, ContentMode, EmailDesign, SendingAccount, CampaignSendingProgress } from '@mailpersonalize/shared';
import AvatarLoader from '../common/AvatarLoader';
import SendingDecisionHelper from '../common/SendingDecisionHelper';
import { apiFetch } from '../../config';

interface CampaignWizardProps {
  resumingCampaignId?: string | null;
  onClose?: () => void;
  onCampaignCreated?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

const TONE_OPTIONS = ['Professional', 'Friendly', 'Persuasive', 'Urgent', 'Casual'];
const EMAIL_SAFE_FONTS = [
  { label: 'Arial / Helvetica (Default)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Inter / Roboto (Modern Sans)', value: 'Roboto, Inter, sans-serif' },
  { label: 'Georgia (Classic Serif)', value: 'Georgia, serif' },
  { label: 'Trebuchet MS (Clean)', value: '"Trebuchet MS", sans-serif' },
];

const TEMPLATE_PRESETS = [
  {
    id: 'simple_text',
    name: '1. Clean Personal Outreach',
    description: 'Minimalist layout optimized for standard 1-on-1 cold outreach without heavy graphics.',
    body: `Hi {{full name}},\n\nI came across your profile and noticed your work as {{role}} at {{company}}.\n\nWe recently launched a solution that helps teams at {{company}} streamline their outreach workflows.\n\nWould you be open to a quick 10-minute introduction next Tuesday?\n\nBest regards,`,
  },
  {
    id: 'header_banner',
    name: '2. Executive Hero Banner',
    description: 'Features a dark header banner with custom title, logo, and brand CTA button.',
    body: `Hi {{full name}},\n\nI hope you are having a productive week at {{company}}.\n\nAs {{role}}, you know how critical execution speed is for your team. We built our platform specifically to solve this challenge.\n\nCheck out our interactive demo below to see how it works in practice:`,
  },
  {
    id: 'centered_card',
    name: '3. Centered Brand Card',
    description: 'Card layout centered on screen with prominent logo placement and styled footer.',
    body: `Hello {{full name}},\n\nQuick question regarding your growth strategy at {{company}}.\n\nMany marketing leaders in {{role}} roles struggle with manual attribution tracking. Our SaaS platform automates the entire process in real-time.\n\nWould you like to schedule a 5-minute preview?`,
  },
  {
    id: 'product_showcase',
    name: '4. Product Showcase',
    description: 'Rich layout designed for product announcements and SaaS demo pitches.',
    body: `Hi {{full name}},\n\nBig news for {{company}}!\n\nWe just released our latest AI automation engine designed to save teams like yours 10+ hours every week.\n\nClick the button below to claim your free trial access today:`,
  },
];

export default function CampaignWizard({ resumingCampaignId, onClose, onCampaignCreated }: CampaignWizardProps) {
  const navigate = useNavigate();
  const params = useParams<{ campaignId?: string }>();
  const activeCampaignId = resumingCampaignId || params.campaignId || null;

  const [step, setStep] = useState<WizardStep>(1);
  const [campaignName, setCampaignName] = useState('');
  const [campaignId, setCampaignId] = useState<string | null>(activeCampaignId);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const handleExit = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/campaigns');
    }
  };

  const [parseResult, setParseResult] = useState<CSVPreviewResult | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [mapping, setMapping] = useState({
    email: '',
    full_name: '',
    name: '',
    company: '',
    role: '',
    attribute_1: '',
    attribute_2: '',
    attribute_3: '',
    attribute_4: '',
    attribute_5: '',
    attribute_labels: {} as Record<string, string>,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{ importedCount: number; skippedCount: number } | null>(null);

  // Phase 5A & 5C: Email Content Mode & Format State
  const [mode, setMode] = useState<ContentMode>('fixed_template');
  const [format, setFormat] = useState<'html' | 'plain_text'>('html');
  const [subject, setSubject] = useState('Quick question regarding {{company}}');
  const [bodyTemplate, setBodyTemplate] = useState(TEMPLATE_PRESETS[0].body);
  const [plainSignature, setPlainSignature] = useState('Best regards,\n{{full_name}}\nThe Mailling Company');
  const [aiBrief, setAiBrief] = useState('Pitch email introducing our SaaS to marketing managers, friendly but professional');
  const [aiTone, setAiTone] = useState('Professional');
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // Phase 13E: Step 4 Sub-Step State (1: Write Content full-width, 2: Design Email split view)
  const [contentSubStep, setContentSubStep] = useState<1 | 2>(1);

  // Phase 5C: Visual Design Customization State
  const [design, setDesign] = useState<Partial<EmailDesign>>({
    layout_preset: 'simple_text',
    font_family: 'Arial, Helvetica, sans-serif',
    accent_color: '#054048',
    logo_url: '',
    logo_align: 'center',
    header_bg_image: '',
    cta_button_text: 'Book a 10-Min Demo',
    cta_button_url: 'https://example.com/demo',
    cta_button_radius: '8',
    cta_button_bg: '#054048',
    cta_button_text_color: '#FFFFFF',
    cta_button_align: 'center',
  });

  const [activeTab, setActiveTab] = useState<'designer' | 'editor' | 'button' | 'templates'>('designer');
  const [focusedInput, setFocusedInput] = useState<'subject' | 'body' | 'signature'>('body');
  const [samplePreviewInline, setSamplePreviewInline] = useState<{ subject: string; body: string } | null>(null);

  // Sending Accounts & Progress State
  const [sendingAccounts, setSendingAccounts] = useState<SendingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [sendingProgress, setSendingProgress] = useState<CampaignSendingProgress | null>(null);
  const [isSendingActive, setIsSendingActive] = useState(false);

  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const signatureTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-Hydrate Draft Data when resuming
  useEffect(() => {
    fetchSendingAccounts();
    if (activeCampaignId) {
      hydrateCampaignDraft(activeCampaignId);
    }
  }, [activeCampaignId]);

  // Live Dispatch Progress Polling Effect (0/1 -> 1/1 Real-Time Counter Update)
  useEffect(() => {
    let intervalId: any = null;
    if (isSendingActive && campaignId) {
      intervalId = setInterval(async () => {
        try {
          const res = await apiFetch(`/api/campaigns/${campaignId}/analytics`);
          const data = await res.json();
          const stats = data.analytics?.stats || data.stats;
          if (res.ok && data.success && stats) {
            const processed = (stats.sentCount || 0) + (stats.failedCount || 0);
            const total = stats.totalContacts || importSummary?.importedCount || 1;

            setSendingProgress({
              campaignId: campaignId || '',
              status: processed >= total ? 'completed' : 'sending',
              totalContacts: total,
              sentCount: stats.sentCount || 0,
              failedCount: stats.failedCount || 0,
              pendingCount: Math.max(0, total - processed),
              suppressedCount: stats.unsubscribedCount || 0,
              estimatedCompletion: processed >= total ? 'Completed' : 'Sending...',
            });

            if (processed >= total) {
              setIsSendingActive(false);
              clearInterval(intervalId);
            }
          }
        } catch (e) {}
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSendingActive, campaignId]);

  const fetchSendingAccounts = async () => {
    try {
      const res = await apiFetch('/api/accounts');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.accounts)) {
        setSendingAccounts(data.accounts);
        if (data.accounts.length > 0) {
          setSelectedAccountId((prev) => prev || data.accounts[0].id);
        }
      }
    } catch (e) {}
  };

  const hydrateCampaignDraft = async (cid: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/campaigns/${cid}`);
      const data = await res.json();
      if (res.ok && data.success && data.campaign) {
        const cmp = data.campaign;
        setCampaignId(cmp.id);
        setCampaignName(cmp.name);

        if (cmp.email_draft) {
          setMode(cmp.email_draft.mode || 'fixed_template');
          setFormat(cmp.email_draft.format || 'html');
          setSubject(cmp.email_draft.subject || '');
          setBodyTemplate(cmp.email_draft.body_template || '');
          setPlainSignature(cmp.email_draft.plain_signature || '');
          setAiBrief(cmp.email_draft.ai_brief || '');
          setAiTone(cmp.email_draft.ai_tone || 'Professional');
        }

        if (cmp.email_design) {
          setDesign((prev) => ({ ...prev, ...cmp.email_design }));
        }

        if (cmp._count?.contacts > 0) {
          setStep(4);
        } else {
          setStep(2);
        }
      }
    } catch (e) {
      console.error('Draft hydration failed:', e);
    } finally {
      setLoading(false);
    }
  };

  // Phase 13D: Fixed Field Schema Slots
  const mappedTagSlots = useMemo(() => {
    const slots = [
      { key: 'email', label: 'email', tag: '{{email}}' },
      { key: 'full_name', label: 'full_name', tag: '{{full_name}}' },
      { key: 'company', label: 'company', tag: '{{company}}' },
      { key: 'role', label: 'role', tag: '{{role}}' },
    ];

    ['attribute_1', 'attribute_2', 'attribute_3', 'attribute_4', 'attribute_5'].forEach((attrKey) => {
      const label = mapping.attribute_labels[attrKey] || attrKey;
      slots.push({ key: attrKey, label, tag: `{{${attrKey}}}` });
    });

    return slots;
  }, [mapping]);

  const unmappedTagsFound = useMemo(() => {
    const tagRegex = /\{\{([^}]+)\}\}/g;
    const foundTags = new Set<string>();
    let match: RegExpExecArray | null;

    const fullText = `${subject} ${bodyTemplate}`;
    while ((match = tagRegex.exec(fullText)) !== null) {
      foundTags.add(match[1].trim().toLowerCase());
    }

    const validTagNames = new Set([
      'email', 'full_name', 'full name', 'company', 'role',
      'attribute_1', 'attribute_2', 'attribute_3', 'attribute_4', 'attribute_5',
    ]);

    const unmapped: string[] = [];
    foundTags.forEach((t) => {
      if (!validTagNames.has(t)) unmapped.push(t);
    });

    return unmapped;
  }, [subject, bodyTemplate]);

  // Insert tag into focused input
  const handleInsertTag = (tagText: string) => {
    if (focusedInput === 'subject') {
      setSubject((prev) => prev + ` ${tagText}`);
    } else if (focusedInput === 'body') {
      setBodyTemplate((prev) => prev + ` ${tagText}`);
    } else if (focusedInput === 'signature') {
      setPlainSignature((prev) => prev + ` ${tagText}`);
    }
  };

  // Step 1: Create Campaign Name
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      setError('Please enter a campaign name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: campaignName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create campaign.');
      } else {
        setCampaignId(data.campaign.id);
        setStep(2);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Upload CSV
  const handleFileUpload = async (file: File) => {
    if (!campaignId) return;
    setCsvFile(file);
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch(`/api/contacts/${campaignId}/upload-csv`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to parse CSV file.');
      } else {
        setParseResult(data.preview);
        const auto = data.preview.suggestedMapping || {};
        setMapping((prev) => ({
          ...prev,
          email: auto.email || '',
          full_name: auto.name || '',
          company: auto.company || '',
          role: auto.role || '',
        }));
        setStep(3);
      }
    } catch (err) {
      setError('Failed to upload CSV file.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Save Fixed Schema Column Mapping
  const handleSaveMapping = async () => {
    if (!campaignId || !mapping.email) {
      setError('Email mapping is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/contacts/${campaignId}/save-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapping,
          contacts: parseResult?.contacts || [],
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to save column mapping.');
      } else {
        setImportSummary({
          importedCount: data.importedCount,
          skippedCount: data.skippedCount,
        });
        setStep(4);
        setContentSubStep(1);
      }
    } catch (err) {
      setError('Failed to save mapping.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: AI Personalization Sample Generator
  const handleGenerateAISample = async () => {
    if (!aiBrief.trim()) {
      setError('Please provide an AI personalization brief.');
      return;
    }

    setGeneratingDraft(true);
    setError(null);

    try {
      const sampleContact = parseResult?.contacts?.[0] || {
        email: 'alex.rivera@startup.io',
        name: 'Alex Rivera',
        data: { Company: 'Apex Dynamics', Role: 'VP Marketing' },
      };

      const res = await apiFetch('/api/campaigns/preview-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: aiBrief.trim(),
          tone: aiTone,
          sampleContact,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubject(data.preview.subject);
        setBodyTemplate(data.preview.body);
        setSamplePreviewInline({
          subject: data.preview.subject,
          body: data.preview.body,
        });
      } else {
        setError(data.error || 'Failed to generate AI sample.');
      }
    } catch (err) {
      setError('Error communicating with AI LLM provider.');
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Step 4: Save Email Content & Design
  const handleSaveCampaignContent = async () => {
    if (!campaignId || !subject.trim() || !bodyTemplate.trim()) {
      setError('Subject line and body template are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/campaigns/${campaignId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          format,
          subject: subject.trim(),
          body_template: bodyTemplate.trim(),
          plain_signature: plainSignature.trim(),
          ai_brief: aiBrief.trim(),
          ai_tone: aiTone,
          design,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to save campaign draft.');
      } else {
        setStep(5);
      }
    } catch (err) {
      setError('Error saving campaign content.');
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Dispatch Email Campaign
  const handleLaunchCampaign = async () => {
    if (!campaignId) return;

    setIsSendingActive(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sending_account_id: selectedAccountId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to launch email send pipeline.');
        setIsSendingActive(false);
      } else {
        if (data.progress) {
          setSendingProgress(data.progress);
        }
      }
    } catch (err) {
      setError('Failed to dispatch campaign email send jobs.');
      setIsSendingActive(false);
    }
  };

  // Preset Selection Helper
  const handleSelectPreset = (preset: (typeof TEMPLATE_PRESETS)[0]) => {
    setDesign((prev) => ({ ...prev, layout_preset: preset.id as any }));
    setBodyTemplate(preset.body);
  };

  // File Upload Handlers for Logo & Header Banner
  const handleLogoFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setDesign((prev) => ({ ...prev, logo_url: String(e.target?.result) }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleHeaderBgFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setDesign((prev) => ({ ...prev, header_bg_image: String(e.target?.result) }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper to replace canonical tags with sample contact data (from uploaded CSV or realistic defaults)
  const replaceSampleTags = (text: string) => {
    if (!text) return '';
    const sampleContact = parseResult?.contacts?.[0];
    const sampleEmail = sampleContact?.email || 'alex.rivera@startup.io';
    const sampleName =
      sampleContact?.name ||
      sampleContact?.data?.['full_name'] ||
      sampleContact?.data?.['Full Name'] ||
      sampleContact?.data?.['name'] ||
      'Alex Rivera';
    const sampleCompany =
      sampleContact?.data?.['Company'] ||
      sampleContact?.data?.['company'] ||
      sampleContact?.data?.['Company Name'] ||
      'Apex Dynamics';
    const sampleRole =
      sampleContact?.data?.['Role'] ||
      sampleContact?.data?.['role'] ||
      sampleContact?.data?.['Title'] ||
      'VP Marketing';
    const sampleAttr1 = sampleContact?.data?.['attribute_1'] || 'San Francisco';
    const sampleAttr2 = sampleContact?.data?.['attribute_2'] || 'Tech';
    const sampleAttr3 = sampleContact?.data?.['attribute_3'] || '50-200';
    const sampleAttr4 = sampleContact?.data?.['attribute_4'] || 'Q3 Campaign';
    const sampleAttr5 = sampleContact?.data?.['attribute_5'] || 'Priority';

    return text
      .replace(/\{\{\s*email\s*\}\}/gi, sampleEmail)
      .replace(/\{\{\s*(full_name|full\s*name|name|contact_name|fullname|first_name)\s*\}\}/gi, sampleName)
      .replace(/\{\{\s*(company|organization|company_name|org|company\s*name)\s*\}\}/gi, sampleCompany)
      .replace(/\{\{\s*(role|title|job_title|position|job\s*title)\s*\}\}/gi, sampleRole)
      .replace(/\{\{\s*attribute_1\s*\}\}/gi, sampleAttr1)
      .replace(/\{\{\s*attribute_2\s*\}\}/gi, sampleAttr2)
      .replace(/\{\{\s*attribute_3\s*\}\}/gi, sampleAttr3)
      .replace(/\{\{\s*attribute_4\s*\}\}/gi, sampleAttr4)
      .replace(/\{\{\s*attribute_5\s*\}\}/gi, sampleAttr5);
  };

  // Compiled Live Email Client HTML
  const compiledPreviewHtml = useMemo(() => {
    const renderedBody = replaceSampleTags(bodyTemplate);
    const renderedSubject = replaceSampleTags(subject);
    const renderedSignature = replaceSampleTags(plainSignature);

    const formattedBody = renderedBody.replace(/\n/g, '<br/>');

    const logoHtml = design.logo_url
      ? `<div style="text-align: ${design.logo_align || 'center'}; padding-bottom: 16px;"><img src="${design.logo_url}" style="max-height: 48px; display: inline-block;" alt="Company Logo" /></div>`
      : '';

    const headerBgStyle = design.header_bg_image
      ? `background-image: url('${design.header_bg_image}'); background-size: cover; background-position: center; border-radius: 8px 8px 0 0; padding: 32px 24px; color: #FFFFFF;`
      : `background-color: ${design.accent_color || '#054048'}; border-radius: 8px 8px 0 0; padding: 24px; color: #FFFFFF;`;

    const ctaHtml = design.cta_button_text
      ? `<div style="text-align: ${design.cta_button_align || 'center'}; margin-top: 24px; margin-bottom: 16px;">
          <a href="${design.cta_button_url || '#'}" style="background-color: ${design.cta_button_bg || '#054048'}; color: ${design.cta_button_text_color || '#FFFFFF'}; padding: 12px 24px; border-radius: ${design.cta_button_radius || 8}px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; border: 2px solid #000000;">
            ${design.cta_button_text}
          </a>
         </div>`
      : '';

    const signatureHtml = renderedSignature
      ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E7EB; color: #4B5563; font-size: 13px;">${renderedSignature.replace(/\n/g, '<br/>')}</div>`
      : '';

    return `
      <div style="font-family: ${design.font_family || 'Arial, sans-serif'}; background-color: #F8F8F8; padding: 24px; color: #1A1A1A; border: 2px solid #000000; border-radius: 12px; max-w-xl mx-auto;">
        <div style="background-color: #FFFFFF; border: 2px solid #000000; border-radius: 8px; overflow: hidden;">
          ${design.header_bg_image || design.layout_preset === 'header_banner' ? `<div style="${headerBgStyle}">${logoHtml}<h2 style="margin: 0; font-size: 18px; font-weight: bold;">${renderedSubject}</h2></div>` : ''}
          <div style="padding: 24px;">
            ${!design.header_bg_image && design.layout_preset !== 'header_banner' ? logoHtml : ''}
            <div style="font-size: 14px; line-height: 1.6; color: #1A1A1A;">
              ${formattedBody}
            </div>
            ${ctaHtml}
            ${signatureHtml}
          </div>
        </div>
      </div>
    `;
  }, [bodyTemplate, subject, plainSignature, design, parseResult]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      
      {/* Wizard Header Bar */}
      <div className="flex items-center justify-between border-b-2 border-black pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#054048] text-white flex items-center justify-center font-bold text-sm border-2 border-black shadow-sm">
            {step}
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1A1A1A]">
              {campaignId ? `Campaign: ${campaignName}` : 'Create New Campaign'}
            </h1>
            <p className="text-xs text-[#5A5A5A] font-semibold">
              Step {step} of 5 — {step === 1 && 'Name your campaign'}
              {step === 2 && 'Upload contact CSV'}
              {step === 3 && 'Map fixed schema columns'}
              {step === 4 && (contentSubStep === 1 ? 'Write your content' : 'Design your email layout')}
              {step === 5 && 'Review and launch email dispatch'}
            </p>
          </div>
        </div>

        <button
          onClick={handleExit}
          className="btn-secondary text-xs py-2 px-4 font-bold gap-1 cursor-pointer"
        >
          Exit Wizard ✕
        </button>
      </div>

      {/* Progress Step Bar */}
      <div className="bg-white border-2 border-black p-4 rounded-xl flex items-center justify-between text-xs font-bold shadow-sm">
        {[
          { num: 1, title: '1. Setup' },
          { num: 2, title: '2. Upload CSV' },
          { num: 3, title: '3. Map Columns' },
          { num: 4, title: '4. Content & Design' },
          { num: 5, title: '5. Launch' },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-black ${
                step === s.num
                  ? 'bg-[#054048] text-white'
                  : step > s.num
                  ? 'bg-[#FEF6EA] text-[#054048]'
                  : 'bg-[#F8F8F8] text-[#5A5A5A]'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </span>
            <span className={`hidden sm:inline ${step === s.num ? 'text-[#1A1A1A] font-extrabold' : 'text-[#5A5A5A]'}`}>
              {s.title}
            </span>
            {s.num < 5 && <ChevronRight className="w-4 h-4 text-black/40 hidden sm:inline" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-[#FEE2E2] border-2 border-[#D64545] rounded-xl text-xs text-[#D64545] font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-[#5A5A5A] hover:text-black font-bold ml-2">✕</button>
        </div>
      )}

      {/* STEP 1: CAMPAIGN NAME */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="max-w-xl mx-auto bg-white border-2 border-black p-8 rounded-2xl space-y-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#1A1A1A]">Name your campaign</h2>
            <p className="text-xs text-[#5A5A5A] font-medium">Choose a recognizable name for tracking analytics and reporting.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1A1A1A]">Campaign Title *</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Q3 SaaS Founders Outreach"
              className="input-field text-sm"
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !campaignName.trim()}
              className="btn-primary py-3 px-8 text-xs font-extrabold gap-2 cursor-pointer"
            >
              Next: Upload Lead List <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: CSV UPLOAD */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto bg-white border-2 border-black p-8 rounded-2xl space-y-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#1A1A1A]">Upload target lead list</h2>
            <p className="text-xs text-[#5A5A5A] font-medium">Upload a CSV file containing your contact lead list.</p>
          </div>

          <div className="border-2 border-dashed border-black bg-[#FEF6EA] rounded-2xl p-10 text-center space-y-4 cursor-pointer hover:bg-[#FDF0DC] transition-colors">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id="csv-upload-input"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />
            <label htmlFor="csv-upload-input" className="cursor-pointer block space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#054048] text-white flex items-center justify-center mx-auto border-2 border-black shadow-sm">
                <Upload className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-[#1A1A1A]">
                  {csvFile ? csvFile.name : 'Click to upload or drag & drop CSV file'}
                </p>
                <p className="text-xs text-[#5A5A5A] font-medium">Supports CSV files up to 10MB</p>
              </div>
            </label>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary py-2.5 px-4 text-xs font-bold gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: FIXED SCHEMA COLUMN MAPPING */}
      {step === 3 && parseResult && (
        <div className="max-w-4xl mx-auto bg-white border-2 border-black p-8 rounded-2xl space-y-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#1A1A1A]">Map CSV columns to fixed schema</h2>
            <p className="text-xs text-[#5A5A5A] font-medium">
              Map your CSV file headers to standard canonical fields for consistent email placeholder tags.
            </p>
          </div>

          {/* Mapping Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Required Email Field */}
            <div className="bg-[#FEF6EA] border-2 border-black p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-[#1A1A1A] flex items-center gap-1.5">
                  <span className="text-[#D64545] font-bold">*</span> Email Address (Required)
                </label>
                <span className="text-[10px] font-mono font-bold bg-white border border-black px-2 py-0.5 rounded">
                  &#123;&#123;email&#125;&#125;
                </span>
              </div>
              <select
                value={mapping.email}
                onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                className="input-field text-xs py-2"
                required
              >
                <option value="">-- Select CSV Header --</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Full Name */}
            <div className="bg-[#F8F8F8] border-2 border-black p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1A1A]">Full Name</label>
                <span className="text-[10px] font-mono font-bold bg-white border border-black px-2 py-0.5 rounded">
                  &#123;&#123;full_name&#125;&#125;
                </span>
              </div>
              <select
                value={mapping.full_name}
                onChange={(e) => setMapping({ ...mapping, full_name: e.target.value })}
                className="input-field text-xs py-2"
              >
                <option value="">-- Unmapped --</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Company */}
            <div className="bg-[#F8F8F8] border-2 border-black p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1A1A]">Company</label>
                <span className="text-[10px] font-mono font-bold bg-white border border-black px-2 py-0.5 rounded">
                  &#123;&#123;company&#125;&#125;
                </span>
              </div>
              <select
                value={mapping.company}
                onChange={(e) => setMapping({ ...mapping, company: e.target.value })}
                className="input-field text-xs py-2"
              >
                <option value="">-- Unmapped --</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div className="bg-[#F8F8F8] border-2 border-black p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1A1A]">Role / Job Title</label>
                <span className="text-[10px] font-mono font-bold bg-white border border-black px-2 py-0.5 rounded">
                  &#123;&#123;role&#125;&#125;
                </span>
              </div>
              <select
                value={mapping.role}
                onChange={(e) => setMapping({ ...mapping, role: e.target.value })}
                className="input-field text-xs py-2"
              >
                <option value="">-- Unmapped --</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Custom Attribute 1 */}
            <div className="bg-[#F8F8F8] border-2 border-black p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1A1A]">Custom Attribute 1</label>
                <span className="text-[10px] font-mono font-bold bg-white border border-black px-2 py-0.5 rounded">
                  &#123;&#123;attribute_1&#125;&#125;
                </span>
              </div>
              <select
                value={mapping.attribute_1}
                onChange={(e) => setMapping({ ...mapping, attribute_1: e.target.value })}
                className="input-field text-xs py-2"
              >
                <option value="">-- Unmapped --</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Custom Attribute 2 */}
            <div className="bg-[#F8F8F8] border-2 border-black p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1A1A]">Custom Attribute 2</label>
                <span className="text-[10px] font-mono font-bold bg-white border border-black px-2 py-0.5 rounded">
                  &#123;&#123;attribute_2&#125;&#125;
                </span>
              </div>
              <select
                value={mapping.attribute_2}
                onChange={(e) => setMapping({ ...mapping, attribute_2: e.target.value })}
                className="input-field text-xs py-2"
              >
                <option value="">-- Unmapped --</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Custom Attribute 3 */}
            <div className="bg-[#F8F8F8] border-2 border-black p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1A1A]">Custom Attribute 3</label>
                <span className="text-[10px] font-mono font-bold bg-white border border-black px-2 py-0.5 rounded">
                  &#123;&#123;attribute_3&#125;&#125;
                </span>
              </div>
              <select
                value={mapping.attribute_3}
                onChange={(e) => setMapping({ ...mapping, attribute_3: e.target.value })}
                className="input-field text-xs py-2"
              >
                <option value="">-- Unmapped --</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Custom Attribute 4 */}
            <div className="bg-[#F8F8F8] border-2 border-black p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1A1A]">Custom Attribute 4</label>
                <span className="text-[10px] font-mono font-bold bg-white border border-black px-2 py-0.5 rounded">
                  &#123;&#123;attribute_4&#125;&#125;
                </span>
              </div>
              <select
                value={mapping.attribute_4}
                onChange={(e) => setMapping({ ...mapping, attribute_4: e.target.value })}
                className="input-field text-xs py-2"
              >
                <option value="">-- Unmapped --</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Custom Attribute 5 */}
            <div className="bg-[#F8F8F8] border-2 border-black p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1A1A]">Custom Attribute 5</label>
                <span className="text-[10px] font-mono font-bold bg-white border border-black px-2 py-0.5 rounded">
                  &#123;&#123;attribute_5&#125;&#125;
                </span>
              </div>
              <select
                value={mapping.attribute_5}
                onChange={(e) => setMapping({ ...mapping, attribute_5: e.target.value })}
                className="input-field text-xs py-2"
              >
                <option value="">-- Unmapped --</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t-2 border-black">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-secondary py-2.5 px-4 text-xs font-bold gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <button
              type="button"
              onClick={handleSaveMapping}
              disabled={loading || !mapping.email}
              className="btn-primary py-3 px-8 text-xs font-extrabold gap-2 cursor-pointer"
            >
              Save & Proceed to Content <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CONTENT CREATION & VISUAL DESIGN */}
      {step === 4 && (
        <div className="space-y-6">
          
          {/* Sub-step Navigation Bar */}
          <div className="bg-white border-2 border-black p-2.5 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setContentSubStep(1)}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer border-2 border-black ${
                  contentSubStep === 1 ? 'bg-[#054048] text-white shadow-sm' : 'bg-white text-[#1A1A1A]'
                }`}
              >
                1. Write Content (Full Width)
              </button>
              <button
                type="button"
                onClick={() => setContentSubStep(2)}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer border-2 border-black ${
                  contentSubStep === 2 ? 'bg-[#054048] text-white shadow-sm' : 'bg-white text-[#1A1A1A]'
                }`}
              >
                2. Design Email & Live Preview
              </button>
            </div>

            <span className="text-xs font-bold text-[#5A5A5A]">
              Format: <strong className="text-[#1A1A1A]">{format === 'plain_text' ? 'Plain Text' : 'Rich HTML'}</strong>
            </span>
          </div>

          {/* SUB-STEP 1: "Write your content" (Full Width Workspace) */}
          {contentSubStep === 1 && (
            <div className="max-w-4xl mx-auto bg-white border-2 border-black p-8 rounded-2xl space-y-6 shadow-sm">
              <div className="space-y-2 border-b-2 border-black pb-4">
                <h2 className="text-xl font-black text-[#1A1A1A]">Write your email content</h2>
                <p className="text-xs text-[#5A5A5A] font-medium">Draft your message using canonical tags. No split-screen preview clutter while writing.</p>
              </div>

              {/* Mode & Format Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#1A1A1A]">Email Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormat('html')}
                      className={`p-3 rounded-xl border-2 border-black text-xs font-bold cursor-pointer transition-all ${
                        format === 'html' ? 'bg-[#FEF6EA] text-[#054048]' : 'bg-[#F8F8F8] text-[#5A5A5A]'
                      }`}
                    >
                      Rich HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat('plain_text')}
                      className={`p-3 rounded-xl border-2 border-black text-xs font-bold cursor-pointer transition-all ${
                        format === 'plain_text' ? 'bg-[#FEF6EA] text-[#054048]' : 'bg-[#F8F8F8] text-[#5A5A5A]'
                      }`}
                    >
                      Plain Text
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#1A1A1A]">Generation Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('fixed_template')}
                      className={`p-3 rounded-xl border-2 border-black text-xs font-bold cursor-pointer transition-all ${
                        mode === 'fixed_template' ? 'bg-[#FEF6EA] text-[#054048]' : 'bg-[#F8F8F8] text-[#5A5A5A]'
                      }`}
                    >
                      Fixed Template
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('ai_personalized')}
                      className={`p-3 rounded-xl border-2 border-black text-xs font-bold cursor-pointer transition-all ${
                        mode === 'ai_personalized' ? 'bg-[#FEF6EA] text-[#054048]' : 'bg-[#F8F8F8] text-[#5A5A5A]'
                      }`}
                    >
                      AI Per Contact
                    </button>
                  </div>
                </div>
              </div>

              {/* Tag Insertion Bar */}
              <div className="bg-[#FEF6EA] border-2 border-black p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#1A1A1A]">Canonical Tag Pills (Click to Insert)</span>
                  <span className="text-[11px] text-[#5A5A5A] font-semibold">Target Input: <strong>{focusedInput.toUpperCase()}</strong></span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {mappedTagSlots.map((slot) => (
                    <button
                      key={slot.tag}
                      type="button"
                      onClick={() => handleInsertTag(slot.tag)}
                      className="px-2.5 py-1 bg-white border-2 border-black rounded-lg text-xs font-bold text-[#054048] hover:bg-[#F8F8F8] cursor-pointer font-mono"
                    >
                      +{slot.tag}
                    </button>
                  ))}
                </div>
              </div>

              {unmappedTagsFound.length > 0 && (
                <div className="p-3 bg-[#FEE2E2] border-2 border-[#D64545] rounded-xl text-xs text-[#D64545] font-bold">
                  ⚠️ Unmapped tags detected: {unmappedTagsFound.map((t) => `{{${t}}}`).join(', ')}. Unmapped tags render as empty strings.
                </div>
              )}

              {/* Integrated Gemini AI Subject & Body Drafting Section (Placed ABOVE Subject Line) */}
              {mode === 'fixed_template' && (
                <div className="bg-[#FEF6EA] border-2 border-black rounded-xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#054048] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#054048]" /> Draft Subject & Body using Gemini LLM
                    </span>
                    <span className="text-[11px] text-[#5A5A5A] font-semibold">Press Enter or click button to re-generate anytime</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={aiBrief}
                      onChange={(e) => setAiBrief(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (aiBrief.trim() && !generatingDraft) handleGenerateAISample();
                        }
                      }}
                      placeholder="E.g. Pitch email introducing our SaaS to marketing managers, friendly but professional..."
                      className="input-field text-xs bg-white flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateAISample}
                      disabled={generatingDraft || !aiBrief.trim()}
                      className="btn-primary py-2 px-4 text-xs font-extrabold gap-1.5 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {generatingDraft ? 'Drafting with Gemini...' : 'Draft Email using Gemini'}
                    </button>
                  </div>
                </div>
              )}

              {/* Subject Line Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A1A1A]">Subject Line *</label>
                <input
                  ref={subjectInputRef}
                  type="text"
                  value={subject}
                  onFocus={() => setFocusedInput('subject')}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Quick question regarding {{company}}"
                  className="input-field text-sm font-semibold"
                  required
                />
              </div>

              {/* Body Content Editor or AI Brief Area */}
              {mode === 'ai_personalized' ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1A1A1A]">AI Personalization Prompt Brief *</label>
                    <textarea
                      value={aiBrief}
                      onChange={(e) => setAiBrief(e.target.value)}
                      rows={4}
                      placeholder="Describe the outreach goal, value proposition, and tone for AI generation..."
                      className="input-field text-xs resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-[#1A1A1A]">Tone of Voice:</label>
                      <select
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value)}
                        className="input-field text-xs py-1.5 w-40"
                      >
                        {TONE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateAISample}
                      disabled={generatingDraft || !aiBrief.trim()}
                      className="btn-primary py-2 px-4 text-xs font-extrabold gap-1.5 flex items-center cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" /> {generatingDraft ? 'Generating Sample...' : 'Generate Sample AI Rewrite'}
                    </button>
                  </div>

                  {/* Inline On-Demand AI Sample Preview */}
                  {samplePreviewInline && (
                    <div className="notice-banner p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#054048]">✨ AI Inline Sample Output</span>
                        <button onClick={() => setSamplePreviewInline(null)} className="text-[#5A5A5A] font-bold">✕</button>
                      </div>
                      <p className="font-extrabold">Subject: {samplePreviewInline.subject}</p>
                      <p className="whitespace-pre-wrap font-mono text-[11px] bg-white p-3 rounded-lg border border-black">{samplePreviewInline.body}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1A1A1A]">Email Body Template *</label>
                  <textarea
                    ref={bodyTextareaRef}
                    value={bodyTemplate}
                    onFocus={() => setFocusedInput('body')}
                    onChange={(e) => setBodyTemplate(e.target.value)}
                    rows={10}
                    placeholder="Write your email body template using {{placeholder}} tags..."
                    className="input-field font-mono text-xs resize-none"
                    required
                  />
                </div>
              )}

              {/* Signature Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A1A1A]">Plain Text Signature</label>
                <textarea
                  ref={signatureTextareaRef}
                  value={plainSignature}
                  onFocus={() => setFocusedInput('signature')}
                  onChange={(e) => setPlainSignature(e.target.value)}
                  rows={4}
                  placeholder="Best regards,&#10;Gaurav Jha&#10;The Mailling Company"
                  className="input-field font-mono text-xs resize-none"
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-secondary py-2.5 px-4 text-xs font-bold gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Column Mapping
                </button>

                <button
                  type="button"
                  onClick={() => setContentSubStep(2)}
                  className="btn-primary py-3 px-8 text-xs font-extrabold gap-2 cursor-pointer"
                >
                  Next: Design Email <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SUB-STEP 2: "Design your email" (Contextual Split Preview & Browser Card Mockup) */}
          {contentSubStep === 2 && (
            <div>
              {format === 'html' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column (50%): Visual Designer Controls */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex border-b-2 border-black gap-4 text-xs font-extrabold text-[#5A5A5A]">
                      <button
                        type="button"
                        onClick={() => setActiveTab('designer')}
                        className={`pb-2 transition-colors cursor-pointer ${activeTab === 'designer' || activeTab === 'editor' ? 'text-[#1A1A1A] border-b-2 border-[#054048]' : 'hover:text-[#1A1A1A]'}`}
                      >
                        Header & Logo
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('button')}
                        className={`pb-2 transition-colors cursor-pointer ${activeTab === 'button' ? 'text-[#1A1A1A] border-b-2 border-[#054048]' : 'hover:text-[#1A1A1A]'}`}
                      >
                        CTA Button
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('templates')}
                        className={`pb-2 transition-colors cursor-pointer ${activeTab === 'templates' ? 'text-[#1A1A1A] border-b-2 border-[#054048]' : 'hover:text-[#1A1A1A]'}`}
                      >
                        Presets
                      </button>
                    </div>

                    {/* Header & Logo Controls */}
                    {(activeTab === 'designer' || activeTab === 'editor') && (
                      <div className="bg-white border-2 border-black rounded-xl p-5 space-y-5">
                        <div className="space-y-3 bg-[#FEF6EA] p-4 rounded-xl border-2 border-black">
                          <label className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                            <Image className="w-3.5 h-3.5 text-[#054048]" /> Header Logo & Background Banner
                          </label>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-[11px] text-[#5A5A5A] font-bold block mb-1">Company Logo</span>
                              <label className="btn-secondary py-1.5 px-3 text-xs cursor-pointer block text-center truncate font-bold">
                                {design.logo_url ? 'Change Logo' : 'Upload Logo'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handleLogoFileUpload(e.target.files[0]);
                                  }}
                                />
                              </label>
                            </div>

                            <div>
                              <span className="text-[11px] text-[#5A5A5A] font-bold block mb-1">Header Banner</span>
                              <label className="btn-secondary py-1.5 px-3 text-xs cursor-pointer block text-center truncate font-bold">
                                {design.header_bg_image ? 'Change Banner' : 'Upload Banner'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handleHeaderBgFileUpload(e.target.files[0]);
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-[#1A1A1A] block mb-1">Logo Alignment</label>
                            <select
                              value={design.logo_align || 'center'}
                              onChange={(e) => setDesign({ ...design, logo_align: e.target.value as any })}
                              className="input-field text-xs py-1.5"
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-[#1A1A1A] block mb-1">Font Family</label>
                            <select
                              value={design.font_family || 'Arial, Helvetica, sans-serif'}
                              onChange={(e) => setDesign({ ...design, font_family: e.target.value })}
                              className="input-field text-xs py-1.5"
                            >
                              <option value="Arial, Helvetica, sans-serif">Arial / Sans-Serif</option>
                              <option value="'Roboto', sans-serif">Roboto</option>
                              <option value="Georgia, serif">Georgia / Serif</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CTA Button Controls */}
                    {activeTab === 'button' && (
                      <div className="bg-white border-2 border-black rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                            <MousePointerClick className="w-3.5 h-3.5 text-[#054048]" /> CTA Button Settings
                          </label>
                          {design.cta_button_text ? (
                            <button
                              type="button"
                              onClick={() => setDesign({ ...design, cta_button_text: '', cta_button_url: '' })}
                              className="px-2.5 py-1 bg-[#FEE2E2] text-[#D64545] rounded-lg border-2 border-black text-xs font-bold cursor-pointer"
                            >
                              Remove Button
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDesign({ ...design, cta_button_text: 'Book a 10-Min Demo', cta_button_url: 'https://example.com/demo' })}
                              className="btn-primary text-xs py-1 px-3"
                            >
                              + Add CTA Button
                            </button>
                          )}
                        </div>

                        <div className="space-y-3 bg-[#F8F8F8] p-4 rounded-xl border-2 border-black">
                          <input
                            type="text"
                            value={design.cta_button_text || ''}
                            onChange={(e) => setDesign({ ...design, cta_button_text: e.target.value })}
                            placeholder="Button Label Text..."
                            className="input-field text-xs"
                          />
                          <input
                            type="url"
                            value={design.cta_button_url || ''}
                            onChange={(e) => setDesign({ ...design, cta_button_url: e.target.value })}
                            placeholder="Target URL..."
                            className="input-field text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {/* Layout Presets */}
                    {activeTab === 'templates' && (
                      <div className="bg-white border-2 border-black rounded-xl p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {TEMPLATE_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleSelectPreset(preset)}
                              className={`border-2 border-black rounded-xl p-4 text-left space-y-2 cursor-pointer transition-all ${
                                design.layout_preset === preset.id
                                  ? 'bg-[#FEF6EA] text-[#054048]'
                                  : 'bg-white hover:bg-[#F8F8F8]'
                              }`}
                            >
                              <h4 className="text-xs font-extrabold text-[#1A1A1A]">{preset.name}</h4>
                              <p className="text-[11px] text-[#5A5A5A] font-medium">{preset.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sub-step 2 Navigation Controls */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setContentSubStep(1)}
                        className="btn-secondary text-xs py-2.5 px-4 font-bold gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back to Content
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCampaignContent}
                        disabled={loading || !subject.trim() || !bodyTemplate.trim()}
                        className="btn-primary text-xs py-2.5 px-6 font-extrabold cursor-pointer gap-2"
                      >
                        Proceed to Launch <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Right Column (70%): Live Sticky Browser Mockup Email Preview */}
                  <div className="lg:col-span-7 space-y-3 sticky top-6">
                    <div className="flex items-center justify-between text-xs text-[#5A5A5A] bg-white p-3 rounded-xl border-2 border-black">
                      <span className="font-extrabold text-[#1A1A1A] flex items-center gap-2">
                        <Eye className="w-4 h-4 text-[#054048]" /> Live Email Client Render (600px Standard)
                      </span>
                      <span>Sample Contact: <strong className="text-[#054048]">Alex Rivera</strong></span>
                    </div>

                    {/* Gumroad Reference Style Browser-Card Mockup (Visible URL Bar) */}
                    <div className="border-2 border-black rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="bg-[#F8F8F8] border-b-2 border-black px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-400 border border-black"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-400 border border-black"></div>
                          <div className="w-3 h-3 rounded-full bg-green-400 border border-black"></div>
                        </div>
                        <div className="bg-white border border-black rounded-lg px-4 py-1 text-[11px] font-mono text-[#5A5A5A] w-64 text-center truncate font-bold">
                          yourcompany.com/l/preview
                        </div>
                        <div className="w-12"></div>
                      </div>

                      <div className="p-6 min-h-[480px] max-h-[660px] overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: compiledPreviewHtml }} className="mx-auto" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Plain Text Read-Only Inbox Preview */
                <div className="max-w-2xl mx-auto bg-white border-2 border-black p-6 rounded-2xl space-y-5 shadow-sm">
                  <div className="flex items-center justify-between border-b-2 border-black pb-4">
                    <div>
                      <h3 className="text-base font-black text-[#1A1A1A]">Plain Text Email Confirmation</h3>
                      <p className="text-xs text-[#5A5A5A] font-medium mt-0.5">
                        Plain text format uses no HTML styles or banners for maximum primary inbox placement.
                      </p>
                    </div>
                    <span className="bg-[#FEF6EA] text-[#054048] px-3 py-1 rounded-full text-xs font-extrabold border-2 border-black">
                      Primary Inbox Optimized
                    </span>
                  </div>

                  <div className="bg-[#F8F8F8] border-2 border-black rounded-xl p-5 space-y-3 font-mono text-xs text-[#1A1A1A] leading-relaxed">
                    <div className="border-b-2 border-black pb-2">
                      <span className="text-[#5A5A5A] uppercase tracking-wider text-[10px] font-bold">Subject:</span>
                      <p className="font-extrabold text-[#1A1A1A] mt-0.5">{replaceSampleTags(subject)}</p>
                    </div>
                    <div className="whitespace-pre-wrap">{replaceSampleTags(bodyTemplate)}</div>
                    {plainSignature && (
                      <div className="border-t-2 border-black pt-3 whitespace-pre-wrap text-[#5A5A5A]">
                        {replaceSampleTags(plainSignature)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setContentSubStep(1)}
                      className="btn-secondary text-xs py-2.5 px-4 font-bold gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Content
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCampaignContent}
                      disabled={loading || !subject.trim() || !bodyTemplate.trim()}
                      className="btn-primary text-xs py-2.5 px-6 font-extrabold cursor-pointer gap-2"
                    >
                      Looks Good, Proceed to Launch <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 5: REVIEW & SEND PIPELINE CONTROLS */}
      {step === 5 && (
        <div className="space-y-6 max-w-3xl mx-auto pt-2 pb-10">
          
          <div className="bg-white border-2 border-black rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#054048]" />
                <h3 className="text-lg font-black text-[#1A1A1A]">Step 5: Review & Send Pipeline</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-[#FEF6EA] text-[#054048] px-3 py-1 rounded-full text-xs font-extrabold border-2 border-black">
                <ShieldCheck className="w-3.5 h-3.5 text-[#054048]" /> Unsubscribe Link Protection Active
              </div>
            </div>

            {/* Contextual Sending Method Decision Helper */}
            <SendingDecisionHelper compact={true} />

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-[#1A1A1A]">Select Connected Sending Account</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="input-field py-2.5 text-xs font-bold"
                disabled={isSendingActive}
              >
                {sendingAccounts.length === 0 ? (
                  <option value="">No Accounts Connected (Using Default Scaffolding Transporter)</option>
                ) : (
                  sendingAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.display_name} ({acc.sender_email}) — Provider: {acc.provider.toUpperCase()} — Limit: {acc.daily_limit}/day
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Campaign Pre-Send Summary Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="bg-[#F8F8F8] p-3.5 rounded-xl border-2 border-black space-y-0.5">
                <span className="text-[10px] text-[#5A5A5A] block uppercase tracking-wider font-extrabold">Total Contacts</span>
                <span className="text-sm font-black text-[#1A1A1A]">
                  {importSummary?.importedCount || parseResult?.validCount || 3} Recipients
                </span>
              </div>
              <div className="bg-[#F8F8F8] p-3.5 rounded-xl border-2 border-black space-y-0.5">
                <span className="text-[10px] text-[#5A5A5A] block uppercase tracking-wider font-extrabold">Selected Format</span>
                <span className="text-sm font-black text-[#054048]">
                  {format === 'plain_text' ? 'Plain Text' : 'Rich HTML'}
                </span>
              </div>
              <div className="bg-[#F8F8F8] p-3.5 rounded-xl border-2 border-black space-y-0.5">
                <span className="text-[10px] text-[#5A5A5A] block uppercase tracking-wider font-extrabold">Content Mode</span>
                <span className="text-sm font-black text-[#1A1A1A]">
                  {mode === 'ai_personalized' ? 'AI Personalization' : 'Fixed Template'}
                </span>
              </div>
              <div className="bg-[#F8F8F8] p-3.5 rounded-xl border-2 border-black space-y-0.5">
                <span className="text-[10px] text-[#5A5A5A] block uppercase tracking-wider font-extrabold">Safety Guards</span>
                <span className="text-sm font-black text-[#054048]">Global Opt-Out</span>
              </div>
            </div>

            {/* Dispatch Action Area */}
            <div className="pt-4 border-t-2 border-black flex flex-col items-center gap-4 text-center">
              {!isSendingActive ? (
                <button
                  type="button"
                  onClick={handleLaunchCampaign}
                  className="btn-primary text-sm py-3.5 px-10 font-black gap-2 flex items-center cursor-pointer shadow-sm"
                >
                  <Send className="w-5 h-5 stroke-[3]" /> Launch Outreach Campaign Now
                </button>
              ) : (
                <div className="w-full notice-banner p-6 text-center space-y-4">
                  <AvatarLoader
                    message="Dispatching Campaign Emails in Background..."
                    subtext={`Sent: ${sendingProgress?.sentCount || 0} / ${sendingProgress?.totalContacts || importSummary?.importedCount || 3}`}
                    avatarSrc="/assets/Avatar6.png"
                    size="md"
                  />
                  <button
                    onClick={handleExit}
                    className="btn-primary py-2.5 px-6 text-xs font-black inline-flex items-center gap-1.5"
                  >
                    View Reporting Dashboard &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
