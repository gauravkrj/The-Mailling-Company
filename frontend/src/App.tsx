import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { User, AuthStatusResponse } from '@mailpersonalize/shared';

import Sidebar from './components/layout/Sidebar';
import DashboardOverview from './components/dashboard/DashboardOverview';
import CampaignsList from './components/dashboard/CampaignsList';
import CampaignDetailView from './components/dashboard/CampaignDetailView';
import CampaignWizard from './components/wizard/CampaignWizard';
import ConnectedAccounts from './components/settings/ConnectedAccounts';
import ConnectAccountsPage from './components/settings/ConnectAccountsPage';
import ContactsView from './components/contacts/ContactsView';
import SettingsView from './components/settings/SettingsView';
import AuthView from './components/auth/AuthView';
import NotFoundView from './components/common/NotFoundView';
import LandingPage from './components/landing/LandingPage';
import SesHelpGuideView from './components/help/SesHelpGuideView';
import PrivacyPolicyView from './components/legal/PrivacyPolicyView';
import TermsOfServiceView from './components/legal/TermsOfServiceView';
import TermsConsentModal from './components/auth/TermsConsentModal';
import SupportBubble from './components/common/SupportBubble';
import { API_BASE, apiFetch } from './config';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('auth_error');
    if (err) {
      setAuthError(err);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const verified = params.get('verified');
    if (verified === 'true') {
      setVerificationNotice('Your email address has been verified successfully!');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const accountSuccess = params.get('account_success');
    if (accountSuccess === 'connected') {
      navigate('/accounts');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data: AuthStatusResponse = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = `${API_BASE}/api/auth/google`;
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setAuthError(null);
        navigate('/dashboard');
      }
    } catch (e) {
      setAuthError('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      navigate('/login');
    } catch (e) {
      console.warn('Logout error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] text-[#1A1A1A] flex items-center justify-center font-sans">
        <div className="text-xs font-bold text-[#054048] tracking-wider uppercase animate-pulse">
          Loading authentication session...
        </div>
      </div>
    );
  }

  // 1. OAuth Security Error Handler State
  if (authError) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] text-[#1A1A1A] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border-2 border-black rounded-2xl p-8 text-center shadow-card space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#D64545]/15 text-[#D64545] border-2 border-black flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A]">Authentication Failed</h2>
          <p className="text-xs text-[#5A5A5A] leading-relaxed">
            {authError === 'consent_denied' && 'Google sign-in consent was denied.'}
            {authError === 'csrf_validation_failed' && 'CSRF state security check failed. Please try signing in again.'}
            {authError === 'token_exchange_failed' && 'Failed to exchange authorization code with Google.'}
            {!['consent_denied', 'csrf_validation_failed', 'token_exchange_failed'].includes(authError) &&
              'An error occurred during authentication. Please try again.'}
          </p>
          <button onClick={() => setAuthError(null)} className="btn-primary text-xs w-full mt-2">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Routes
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/help/ses-setup" element={<SesHelpGuideView />} />
        <Route path="/privacy" element={<PrivacyPolicyView />} />
        <Route path="/terms" element={<TermsOfServiceView />} />
        <Route
          path="/login"
          element={
            <AuthView
              onAuthSuccess={(authUser) => {
                setUser(authUser);
                setAuthError(null);
                navigate('/dashboard');
              }}
              onGoogleSignIn={handleGoogleSignIn}
              onDemoSignIn={handleDemoSignIn}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // 3. Authenticated App Layout with Client-Side Routing & Persistent Sidebar
  return (
    <div className="min-h-screen bg-[#F8F8F8] text-[#1A1A1A] flex font-sans">
      {/* Intermediate Consent Modal for Users Without Consent Timestamp */}
      <TermsConsentModal user={user} onConsentGiven={(updatedUser) => setUser(updatedUser)} />

      {/* Persistent Left Navigation Sidebar */}
      <Sidebar
        user={user}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main App Content Viewport - Expands to Full Available Width on Collapse */}
      <main
        className={`flex-1 transition-all duration-200 ease-in-out px-6 md:px-10 py-6 md:py-8 space-y-6 mt-14 md:mt-0 w-full ${
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
        }`}
      >
        {/* Email Verification Toast Notice Banner */}
        {verificationNotice && (
          <div className="notice-banner px-4 py-3 text-xs font-semibold flex items-center justify-between">
            <span>{verificationNotice}</span>
            <button onClick={() => setVerificationNotice(null)} className="text-[#5A5A5A] hover:text-black font-bold ml-2">✕</button>
          </div>
        )}

        {/* Unverified Email Persistent Warning Banner */}
        {user.is_email_verified === false && (
          <div className="notice-banner px-4 py-3 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-base">✉️</span>
              <span className="text-[#1A1A1A]">
                <strong>Please verify your email address.</strong> We sent a verification link to <u>{user.email}</u>.
              </span>
            </div>
          </div>
        )}

        {/* Dedicated Bookmarkable Client-Side Routes */}
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/help/ses-setup" element={<SesHelpGuideView />} />
          <Route path="/privacy" element={<PrivacyPolicyView />} />
          <Route path="/terms" element={<TermsOfServiceView />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard Overview */}
          <Route path="/dashboard" element={<DashboardOverview user={user} />} />
          
          {/* Campaigns Flow */}
          <Route path="/campaigns" element={<CampaignsList />} />
          <Route path="/campaigns/new" element={<CampaignWizard />} />
          <Route path="/campaigns/:campaignId/edit" element={<CampaignWizard />} />
          <Route path="/campaigns/:campaignId" element={<CampaignDetailView />} />
          
          {/* Contacts Directory */}
          <Route path="/contacts" element={<ContactsView />} />

          {/* Sending Accounts Flow */}
          <Route path="/accounts" element={<ConnectedAccounts />} />
          <Route path="/accounts/connect" element={<ConnectAccountsPage />} />
          
          {/* User Settings */}
          <Route
            path="/settings"
            element={
              <SettingsView
                user={user}
                onUpdateUser={(updatedUser) => setUser(updatedUser)}
                onLogout={handleLogout}
              />
            }
          />
          
          {/* 404 Fallback Route */}
          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </main>

      {/* Floating Support Contact Bubble (Present on all logged-in pages) */}
      <SupportBubble />
    </div>
  );
}
