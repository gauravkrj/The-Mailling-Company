import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';

interface Step2Props {
  campaignName: string;
  parsedResult: any;
  onBack: () => void;
  onNext: (data: { campaignId: string; availableColumns: string[]; mappedContacts: any[] }) => void;
}

export const Step2Mapping: React.FC<Step2Props> = ({ campaignName, parsedResult, onBack, onNext }) => {
  const { showToast } = useToast();
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    email: parsedResult.suggestedMapping.email || '',
    name: parsedResult.suggestedMapping.name || '',
    company: parsedResult.suggestedMapping.company || '',
    role: parsedResult.suggestedMapping.role || '',
  });
  const [loading, setLoading] = useState(false);

  const csvHeaders: string[] = parsedResult.headers || [];

  const handleMappingChange = (standardField: string, selectedHeader: string) => {
    setColumnMapping((prev) => ({ ...prev, [standardField]: selectedHeader }));
  };

  const handleImport = async () => {
    if (!columnMapping.email) {
      showToast('Please select which CSV column contains recipient Email addresses.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Map contacts according to selected mapping
      const mappedContacts = parsedResult.contacts
        .filter((c: any) => c.isValidEmail && !c.isDuplicate)
        .map((c: any) => {
          const email = columnMapping.email ? c.customFields[columnMapping.email] || c.email : c.email;
          const name = columnMapping.name ? c.customFields[columnMapping.name] || c.name : c.name;
          const company = columnMapping.company ? c.customFields[columnMapping.company] || c.company : c.company;
          const role = columnMapping.role ? c.customFields[columnMapping.role] || c.role : c.role;

          // Remaining non-mapped headers become dynamic custom fields
          const customFields: Record<string, any> = {};
          csvHeaders.forEach((header) => {
            if (
              header !== columnMapping.email &&
              header !== columnMapping.name &&
              header !== columnMapping.company &&
              header !== columnMapping.role
            ) {
              customFields[header] = c.customFields[header];
            }
          });

          return { email, name, company, role, customFields };
        });

      const response = await api.importContacts({
        campaignName,
        mappedContacts,
      });

      showToast(`Successfully stored ${response.importedCount} contacts for Campaign!`, 'success');
      onNext({
        campaignId: response.campaignId,
        availableColumns: csvHeaders,
        mappedContacts,
      });
    } catch (err: any) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">2. Map Sheet Columns</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Map your CSV headers to standard contact fields. Unmapped columns will be stored as dynamic custom tags.
        </p>
      </div>

      {/* Mapping Table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-card">
        <div className="bg-neutral-50 px-6 py-3 border-b border-border flex items-center justify-between text-xs font-semibold text-neutral-600 uppercase tracking-wider">
          <span>Standard Field</span>
          <span>Your CSV Column Header</span>
        </div>

        <div className="divide-y divide-border">
          {/* Email (Required) */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
                Email Address <span className="text-rose-500 text-xs">*</span>
              </span>
              <span className="text-xs text-neutral-500 block">Required for sending</span>
            </div>
            <select
              value={columnMapping.email}
              onChange={(e) => handleMappingChange('email', e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="">-- Select Column --</option>
              {csvHeaders.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-neutral-900">Full Name</span>
              <span className="text-xs text-neutral-500 block">Enables &#123;&#123;name&#125;&#125; variable tag</span>
            </div>
            <select
              value={columnMapping.name}
              onChange={(e) => handleMappingChange('name', e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="">-- Select Column (Optional) --</option>
              {csvHeaders.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Company */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-neutral-900">Company Name</span>
              <span className="text-xs text-neutral-500 block">Enables &#123;&#123;company&#125;&#125; variable tag</span>
            </div>
            <select
              value={columnMapping.company}
              onChange={(e) => handleMappingChange('company', e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="">-- Select Column (Optional) --</option>
              {csvHeaders.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-neutral-900">Role / Job Title</span>
              <span className="text-xs text-neutral-500 block">Enables &#123;&#123;role&#125;&#125; variable tag</span>
            </div>
            <select
              value={columnMapping.role}
              onChange={(e) => handleMappingChange('role', e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="">-- Select Column (Optional) --</option>
              {csvHeaders.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Available Custom Tags Preview */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
        <div className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" /> Available Template Tokens
        </div>
        <div className="flex flex-wrap gap-2">
          {csvHeaders.map((h) => (
            <span key={h} className="text-xs font-mono bg-white border border-border px-2.5 py-1 rounded text-neutral-700 shadow-subtle">
              &#123;&#123;{h}&#125;&#125;
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="btn-secondary gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handleImport} disabled={loading} className="btn-accent gap-2">
          {loading ? 'Importing Contacts...' : 'Next: Draft Email'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
