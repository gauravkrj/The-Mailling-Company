import { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Navbar } from './components/dashboard/Navbar';
import { CampaignList } from './components/dashboard/CampaignList';
import { CampaignDetail } from './components/dashboard/CampaignDetail';
import { SuppressionManager } from './components/dashboard/SuppressionManager';
import { SettingsModal } from './components/dashboard/SettingsModal';
import { Step1Upload } from './components/wizard/Step1Upload';
import { Step2Mapping } from './components/wizard/Step2Mapping';
import { Step3Draft } from './components/wizard/Step3Draft';
import { Step4Review } from './components/wizard/Step4Review';
import { api } from './services/api';
import { Campaign, User } from './types';

function MainApp() {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'suppression'>('campaigns');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardData, setWizardData] = useState<{
    campaignName: string;
    parsedResult: any;
    campaignId: string;
    availableColumns: string[];
    mappedContacts: any[];
    draftData: any;
  }>({
    campaignName: '',
    parsedResult: null,
    campaignId: '',
    availableColumns: [],
    mappedContacts: [],
    draftData: null,
  });

  useEffect(() => {
    // Check url params for OAuth token callback
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('auth_token', token);
      showToast('Successfully signed in with Google OAuth!', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    loadUser();
    loadCampaigns();
  }, []);

  const loadUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch (err) {
      console.warn('Failed to load user session');
    }
  };

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const list = await api.getCampaigns();
      setCampaigns(list);
    } catch (err) {
      console.warn('Failed to load campaigns list');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleStartNewCampaign = () => {
    setWizardStep(1);
    setWizardData({
      campaignName: '',
      parsedResult: null,
      campaignId: '',
      availableColumns: [],
      mappedContacts: [],
      draftData: null,
    });
    setSelectedCampaignId(null);
    setIsCreatingCampaign(true);
  };

  const handleWizardComplete = async () => {
    setIsCreatingCampaign(false);
    await loadCampaigns();
    if (wizardData.campaignId) {
      setSelectedCampaignId(wizardData.campaignId);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={(t) => {
          setActiveTab(t);
          setIsCreatingCampaign(false);
          setSelectedCampaignId(null);
        }}
        onNewCampaign={handleStartNewCampaign}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        {/* WIZARD FLOW */}
        {isCreatingCampaign ? (
          <div className="bg-white border border-border rounded-xl p-8 shadow-card space-y-8 animate-in fade-in duration-150">
            {/* Step Wizard Progress Bar */}
            <div className="flex items-center justify-between border-b border-border pb-6">
              {[
                { step: 1, label: '1. Import' },
                { step: 2, label: '2. Map Columns' },
                { step: 3, label: '3. Draft Email' },
                { step: 4, label: '4. Deliverability & Launch' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                      wizardStep === s.step
                        ? 'bg-accent text-white shadow-subtle'
                        : wizardStep > s.step
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-100 text-neutral-400'
                    }`}
                  >
                    {s.step}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      wizardStep === s.step ? 'text-neutral-900 font-semibold' : 'text-neutral-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 1: Upload */}
            {wizardStep === 1 && (
              <Step1Upload
                onNext={(data) => {
                  setWizardData((prev) => ({ ...prev, ...data }));
                  setWizardStep(2);
                }}
              />
            )}

            {/* Step 2: Mapping */}
            {wizardStep === 2 && (
              <Step2Mapping
                campaignName={wizardData.campaignName}
                parsedResult={wizardData.parsedResult}
                onBack={() => setWizardStep(1)}
                onNext={(data) => {
                  setWizardData((prev) => ({ ...prev, ...data }));
                  setWizardStep(3);
                }}
              />
            )}

            {/* Step 3: Draft */}
            {wizardStep === 3 && (
              <Step3Draft
                campaignId={wizardData.campaignId}
                availableColumns={wizardData.availableColumns}
                mappedContacts={wizardData.mappedContacts}
                onBack={() => setWizardStep(2)}
                onNext={(draftData) => {
                  setWizardData((prev) => ({ ...prev, draftData }));
                  setWizardStep(4);
                }}
              />
            )}

            {/* Step 4: Deliverability Review & Launch */}
            {wizardStep === 4 && (
              <Step4Review
                campaignId={wizardData.campaignId}
                campaignName={wizardData.campaignName}
                mappedContacts={wizardData.mappedContacts}
                draftData={wizardData.draftData}
                onBack={() => setWizardStep(3)}
                onComplete={handleWizardComplete}
              />
            )}
          </div>
        ) : selectedCampaignId ? (
          /* CAMPAIGN ANALYTICS DETAIL VIEW */
          <CampaignDetail
            campaignId={selectedCampaignId}
            onBack={() => {
              setSelectedCampaignId(null);
              loadCampaigns();
            }}
          />
        ) : activeTab === 'suppression' ? (
          /* SUPPRESSION MANAGER VIEW */
          <SuppressionManager />
        ) : (
          /* CAMPAIGN LIST DASHBOARD VIEW */
          <CampaignList
            campaigns={campaigns}
            loading={loadingCampaigns}
            onSelectCampaign={(id) => setSelectedCampaignId(id)}
            onNewCampaign={handleStartNewCampaign}
          />
        )}
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        onUserUpdated={loadUser}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
