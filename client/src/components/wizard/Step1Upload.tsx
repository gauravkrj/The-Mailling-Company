import React, { useState } from 'react';
import { Upload, Link2, AlertTriangle, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';

interface Step1Props {
  onNext: (data: {
    campaignName: string;
    parsedResult: any;
  }) => void;
}

export const Step1Upload: React.FC<Step1Props> = ({ onNext }) => {
  const { showToast } = useToast();
  const [campaignName, setCampaignName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'csv' | 'gsheet'>('csv');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (!campaignName) {
      setCampaignName(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setParsedData(null);
    };
    reader.readAsText(file);
  };

  const handleParse = async () => {
    if (!campaignName.trim()) {
      showToast('Please enter a campaign name.', 'error');
      return;
    }

    if (activeTab === 'csv' && !csvContent) {
      showToast('Please select a CSV file to parse.', 'error');
      return;
    }

    if (activeTab === 'gsheet' && !googleSheetUrl.trim()) {
      showToast('Please paste a public Google Sheet link.', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await api.parseContacts({
        csvContent: activeTab === 'csv' ? csvContent : undefined,
        googleSheetUrl: activeTab === 'gsheet' ? googleSheetUrl : undefined,
      });

      setParsedData(result);
      showToast(`Parsed ${result.totalRows} contacts (${result.validCount} valid).`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to parse contacts file', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (!parsedData || parsedData.contacts.length === 0) {
      showToast('No contacts available to import.', 'error');
      return;
    }
    onNext({ campaignName, parsedResult: parsedData });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">1. Import Contacts</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Upload a CSV spreadsheet or paste a Google Sheet link to start your personalized campaign.
        </p>
      </div>

      {/* Campaign Name Input */}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
          Campaign Name
        </label>
        <input
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="e.g. Q3 SaaS Marketing Leaders Outreach"
          className="input-field"
        />
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('csv')}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'csv'
              ? 'border-accent text-accent'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Upload CSV File
        </button>
        <button
          onClick={() => setActiveTab('gsheet')}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'gsheet'
              ? 'border-accent text-accent'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Google Sheet Link
        </button>
      </div>

      {/* CSV Drag & Drop / File Input */}
      {activeTab === 'csv' && (
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
          <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-800">
            {fileName ? fileName : 'Click to choose or drop your .csv file here'}
          </p>
          <p className="text-xs text-neutral-500 mt-1">Supports standard CSV format with headers</p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-file-input"
          />
          <label htmlFor="csv-file-input" className="btn-secondary mt-4 cursor-pointer">
            Browse File
          </label>
        </div>
      )}

      {/* Google Sheet URL Input */}
      {activeTab === 'gsheet' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="text"
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0X..."
                className="input-field pl-9"
              />
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            Ensure your Google Sheet sharing setting is set to "Anyone with the link can view".
          </p>
        </div>
      )}

      {/* Parse Action Button */}
      {!parsedData && (
        <button onClick={handleParse} disabled={loading} className="btn-primary w-full">
          {loading ? 'Parsing Contacts...' : 'Parse & Validate File'}
        </button>
      )}

      {/* Parsed Summary & Validation Checks */}
      {parsedData && (
        <div className="bg-white border border-border rounded-xl p-6 space-y-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-neutral-900">Parsed Data Summary</span>
            </div>
            <span className="text-xs font-mono bg-neutral-100 px-2 py-1 rounded text-neutral-700">
              {parsedData.headers.length} columns detected
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              <div className="text-xs text-neutral-500">Total Rows</div>
              <div className="text-lg font-bold text-neutral-900">{parsedData.totalRows}</div>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <div className="text-xs text-emerald-700 font-medium">Valid Emails</div>
              <div className="text-lg font-bold text-emerald-800">{parsedData.validCount}</div>
            </div>
            <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
              <div className="text-xs text-rose-700 font-medium">Invalid Format</div>
              <div className="text-lg font-bold text-rose-800">{parsedData.invalidCount}</div>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <div className="text-xs text-amber-700 font-medium">Duplicates</div>
              <div className="text-lg font-bold text-amber-800">{parsedData.duplicateCount}</div>
            </div>
          </div>

          {/* Compliance Reminder Banner */}
          {parsedData.complianceReminder && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-3.5 rounded-lg text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Compliance & Deliverability Reminder</span>
                {parsedData.complianceReminder}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setParsedData(null)} className="btn-secondary">
              Re-parse File
            </button>
            <button onClick={handleProceed} className="btn-accent gap-2">
              Next: Map Columns <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
