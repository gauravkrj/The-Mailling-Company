import { useState } from 'react';
import { Sparkles, Eye, ArrowLeft, ArrowRight, RefreshCw, UserCheck } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';

interface Step3Props {
  campaignId: string;
  availableColumns: string[];
  mappedContacts: any[];
  onBack: () => void;
  onNext: (draftData: any) => void;
}

export const Step3Draft: React.FC<Step3Props> = ({
  campaignId,
  availableColumns,
  mappedContacts,
  onBack,
  onNext,
}) => {
  const { showToast } = useToast();
  const [promptInput, setPromptInput] = useState(
    'Pitch email introducing our AI workflow platform to marketing and operations leaders, friendly and professional tone'
  );
  const [subject, setSubject] = useState('Streamlining workflow operations at {{company}}');
  const [bodyTemplate, setBodyTemplate] = useState(
    `Hi {{name}},\n\nI noticed your leadership role at {{company}} and wanted to reach out.\n\nWe built The Mailing Company to help growth teams automate cold outreach with human-grade AI personalization per recipient while staying completely safe from spam filters.\n\nWould you have 5 minutes open this Thursday for a brief demo?\n\nBest,\nAlex`
  );
  const [aiPersonalizeEnabled, setAiPersonalizeEnabled] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Lightly rewrite the opening line to reference their specific role/company context.');
  
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Recipient Live Preview state
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<{ subject: string; body: string } | null>(null);

  const handleGenerateWithAI = async () => {
    if (!promptInput.trim()) {
      showToast('Please enter a description for the AI prompt.', 'error');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.generateDraft(promptInput, availableColumns);
      setSubject(res.subject);
      setBodyTemplate(res.bodyTemplate);
      showToast('AI Draft generated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'AI generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handlePreviewRecipient = async (index: number) => {
    const contact = mappedContacts[index];
    if (!contact) return;

    setSelectedPreviewIndex(index);
    setPreviewing(true);
    try {
      const result = await api.previewRecipient({
        subject,
        bodyTemplate,
        contact,
        aiPersonalizeEnabled,
        aiPrompt,
      });
      setPreviewResult(result);
    } catch (err: any) {
      showToast('Failed to generate recipient preview', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSaveAndNext = async () => {
    if (!subject.trim() || !bodyTemplate.trim()) {
      showToast('Subject and email body template cannot be empty.', 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await api.saveDraft({
        campaignId,
        subject,
        bodyTemplate,
        aiPersonalizeEnabled,
        aiPrompt: aiPersonalizeEnabled ? aiPrompt : undefined,
      });

      showToast('Email draft saved.', 'success');
      onNext({
        subject,
        bodyTemplate,
        aiPersonalizeEnabled,
        aiPrompt,
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to save draft', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">3. Draft Email & AI Personalization</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Generate an initial draft with Claude LLM or type your copy using variable placeholders like &#123;&#123;name&#125;&#125;.
        </p>
      </div>

      {/* AI Prompt Input Bar */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
        <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
          AI Generation Prompt
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Describe what email you want to send..."
            className="input-field"
          />
          <button
            onClick={handleGenerateWithAI}
            disabled={generating}
            className="btn-accent shrink-0 gap-2"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Draft Subject & Body Editor */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4 shadow-card">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
            Subject Line
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input-field font-medium"
            placeholder="e.g. Quick question regarding {{company}}"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
            Email Body Template
          </label>
          <textarea
            rows={8}
            value={bodyTemplate}
            onChange={(e) => setBodyTemplate(e.target.value)}
            className="input-field font-sans text-sm leading-relaxed"
            placeholder="Write your email body here..."
          />
        </div>

        {/* Token Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-neutral-500 mr-1 font-medium">Insert Tag:</span>
          {availableColumns.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => setBodyTemplate((prev) => prev + ` {{${col}}}`)}
              className="text-xs font-mono bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded transition-colors"
            >
              + &#123;&#123;{col}&#125;&#125;
            </button>
          ))}
        </div>
      </div>

      {/* Row-Level AI Personalization Toggle */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" /> Recipient AI Personalization
            </span>
            <span className="text-xs text-neutral-500 block mt-0.5">
              When enabled, Claude AI rewrites each recipient's email using their specific row data (beyond simple variable substitution).
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={aiPersonalizeEnabled}
              onChange={(e) => setAiPersonalizeEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </label>
        </div>

        {aiPersonalizeEnabled && (
          <div className="pt-3 border-t border-border space-y-2">
            <label className="block text-xs font-medium text-neutral-700">
              Personalization Directive Prompt:
            </label>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="input-field text-xs"
              placeholder="e.g. Keep tone casual and mention their specific job role..."
            />
          </div>
        )}
      </div>

      {/* Live Per-Recipient Preview Box */}
      <div className="bg-neutral-900 text-white rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-accent-light" />
            <span className="text-sm font-semibold">Live Recipient Preview Simulator</span>
          </div>

          {mappedContacts.length > 0 && (
            <div className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={selectedPreviewIndex}
                onChange={(e) => handlePreviewRecipient(Number(e.target.value))}
                className="bg-neutral-800 border border-neutral-700 text-xs rounded px-2 py-1 text-neutral-200 focus:outline-none"
              >
                {mappedContacts.slice(0, 10).map((c, idx) => (
                  <option key={idx} value={idx}>
                    Recipient #{idx + 1}: {c.name || c.email} ({c.company || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {previewing ? (
          <div className="text-xs text-neutral-400 py-4 text-center">Generating AI personalized preview...</div>
        ) : previewResult ? (
          <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-lg p-4 space-y-2 font-sans text-xs">
            <div className="text-neutral-400">
              <span className="font-semibold text-neutral-300">To:</span> {mappedContacts[selectedPreviewIndex]?.email}
            </div>
            <div className="text-neutral-400">
              <span className="font-semibold text-neutral-300">Subject:</span> {previewResult.subject}
            </div>
            <div className="border-t border-neutral-700 pt-2 text-neutral-200 whitespace-pre-wrap leading-relaxed">
              {previewResult.body}
            </div>
          </div>
        ) : (
          <div className="text-center py-3">
            <button
              onClick={() => handlePreviewRecipient(selectedPreviewIndex)}
              className="text-xs bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-1.5 rounded transition-colors text-neutral-200"
            >
              Generate Live Recipient Preview
            </button>
          </div>
        )}
      </div>

      {/* Action Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="btn-secondary gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handleSaveAndNext} disabled={saving} className="btn-accent gap-2">
          {saving ? 'Saving Draft...' : 'Next: Review & Schedule'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
