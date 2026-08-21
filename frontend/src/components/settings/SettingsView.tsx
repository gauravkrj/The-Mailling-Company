import React, { useState } from 'react';
import {
  User as UserIcon, Lock, ShieldAlert, CheckCircle2, AlertTriangle, Save, Key, Mail, Globe, Check, Trash2, X
} from 'lucide-react';
import { User } from '@mailpersonalize/shared';
import { apiFetch } from '../../config';

interface SettingsViewProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
}

export default function SettingsView({ user, onUpdateUser, onLogout }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'danger'>('profile');

  // Profile Form State
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [website, setWebsite] = useState(user.company_website || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Account Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isGoogleUser = Boolean(user.google_id);

  // Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isPasswordFormValid = hasMinLength && hasNumber && passwordsMatch;

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileError('Full name cannot be empty.');
      return;
    }

    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await apiFetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company_website: website.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileError(data.error || 'Failed to update profile.');
      } else {
        onUpdateUser(data.user);
        setProfileSuccess('Profile details saved successfully!');
        setTimeout(() => setProfileSuccess(null), 3000);
      }
    } catch (err: any) {
      setProfileError('An error occurred while updating profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Password Update
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !isPasswordFormValid) return;

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const res = await apiFetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPasswordError(data.error || 'Failed to update password.');
      } else {
        setPasswordSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(null), 3000);
      }
    } catch (err: any) {
      setPasswordError('An error occurred while changing password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Cascading Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmationInput !== 'DELETE') return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await apiFetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDeleteError(data.error || 'Failed to delete account.');
        setDeleteLoading(false);
      } else {
        onLogout();
      }
    } catch (err: any) {
      setDeleteError('An error occurred during account deletion.');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl font-sans">
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2 text-[#D64545] font-extrabold text-sm">
                <AlertTriangle className="w-5 h-5" /> Permanent Account Deletion
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-[#5A5A5A] hover:text-black p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#5A5A5A] leading-relaxed">
              <p className="text-[#1A1A1A] font-extrabold">
                Are you absolutely sure you want to delete your account?
              </p>
              <p>
                This action is permanent and irreversible. All your created campaigns, uploaded contact lists, send logs, and connected email accounts will be permanently destroyed.
              </p>
              <div className="p-3 bg-[#FEE2E2] border-2 border-[#D64545] rounded-xl text-[11px] text-[#D64545] font-bold">
                To confirm, please type <strong className="text-black underline font-black">DELETE</strong> in the box below:
              </div>
            </div>

            <input
              type="text"
              value={deleteConfirmationInput}
              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
              placeholder='Type "DELETE"'
              className="input-field text-xs uppercase"
            />

            {deleteError && (
              <p className="text-xs text-[#D64545] font-bold">{deleteError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary flex-1 py-2.5 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationInput !== 'DELETE' || deleteLoading}
                className="btn-primary flex-1 py-2.5 text-xs font-bold bg-[#D64545] hover:bg-[#B53535] text-white border-2 border-black disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="border-b-2 border-black pb-4">
        <h2 className="text-2xl font-black text-[#1A1A1A]">Account Settings</h2>
        <p className="text-xs text-[#5A5A5A] font-semibold mt-1">Manage your profile, security credentials, and account preferences</p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b-2 border-black space-x-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2.5 px-4 text-xs font-extrabold border-b-2 transition-all gap-2 flex items-center cursor-pointer ${
            activeTab === 'profile'
              ? 'border-[#054048] text-[#054048]'
              : 'border-transparent text-[#5A5A5A] hover:text-black'
          }`}
        >
          <UserIcon className="w-4 h-4" /> Profile Information
        </button>

        {!isGoogleUser && (
          <button
            onClick={() => setActiveTab('password')}
            className={`py-2.5 px-4 text-xs font-extrabold border-b-2 transition-all gap-2 flex items-center cursor-pointer ${
              activeTab === 'password'
                ? 'border-[#054048] text-[#054048]'
                : 'border-transparent text-[#5A5A5A] hover:text-black'
            }`}
          >
            <Lock className="w-4 h-4" /> Change Password
          </button>
        )}

        <button
          onClick={() => setActiveTab('danger')}
          className={`py-2.5 px-4 text-xs font-extrabold border-b-2 transition-all gap-2 flex items-center cursor-pointer ${
            activeTab === 'danger'
              ? 'border-[#D64545] text-[#D64545]'
              : 'border-transparent text-[#5A5A5A] hover:text-[#D64545]'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Danger Zone
        </button>
      </div>

      {/* 1. Profile Section */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white border-2 border-black rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b-2 border-black pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#1A1A1A]">Profile Details</h3>
              <p className="text-xs text-[#5A5A5A] font-medium">Update your display name and company information</p>
            </div>

            {/* Read-Only Auth Provider Badge */}
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#FEF6EA] border-2 border-black text-[#054048]">
              {isGoogleUser ? '🔑 Signed in with Google OAuth' : '✉️ Signed in with Email & Password'}
            </span>
          </div>

          {profileSuccess && (
            <div className="notice-banner p-3 text-xs font-bold text-[#054048] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#054048]" /> {profileSuccess}
            </div>
          )}

          {profileError && (
            <div className="bg-[#FEE2E2] border-2 border-[#D64545] text-[#D64545] p-3 rounded-xl text-xs font-bold">
              {profileError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1A1A1A]">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="input-field text-xs py-2.5"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1A1A1A]">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="input-field text-xs py-2.5"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1A1A1A]">Company Website (Optional)</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourcompany.com"
                className="input-field text-xs py-2.5"
              />
            </div>
          </div>

          <div className="pt-3 border-t-2 border-black flex justify-end">
            <button
              type="submit"
              disabled={profileLoading}
              className="btn-primary py-2.5 px-6 text-xs font-extrabold gap-2 flex items-center"
            >
              <Save className="w-4 h-4" /> {profileLoading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>

          {/* Legal Documentation & Consent Status Card */}
          <div className="bg-[#FEF6EA] border-2 border-black rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-black text-[#1A1A1A] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#054048]" /> Legal Terms & Consent Status
            </h4>
            <p className="text-[11px] text-[#5A5A5A] leading-relaxed">
              You agreed to the Terms of Service & Privacy Policy on:{' '}
              <strong className="text-[#054048]">
                {user.terms_accepted_at
                  ? new Date(user.terms_accepted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'Active Account Consent'}
              </strong>
            </p>
            <div className="flex items-center gap-4 text-xs font-extrabold text-[#054048] pt-1">
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">Read Privacy Policy ↗</a>
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">Read Terms of Service ↗</a>
            </div>
          </div>
        </form>
      )}

      {/* 2. Password Section (Only for Email/Password users) */}
      {activeTab === 'password' && (
        <form onSubmit={handleSavePassword} className="bg-white border-2 border-black rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-sm font-extrabold text-[#1A1A1A]">Security & Password</h3>
            <p className="text-xs text-[#5A5A5A]">Update your account password</p>
          </div>

          {passwordSuccess && (
            <div className="notice-banner p-3 text-xs font-bold text-[#054048] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#054048]" /> {passwordSuccess}
            </div>
          )}

          {passwordError && (
            <div className="bg-[#FEE2E2] border-2 border-[#D64545] text-[#D64545] p-3 rounded-xl text-xs font-bold">
              {passwordError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1A1A1A]">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field text-xs py-2.5"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1A1A1A]">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters with 1 number"
                className="input-field text-xs py-2.5"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1A1A1A]">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="input-field text-xs py-2.5"
                required
              />
            </div>

            {/* Live Inline Password Feedback */}
            <div className="p-3 bg-[#F8F8F8] border-2 border-black rounded-xl space-y-1.5 text-xs font-bold">
              <p className={`flex items-center gap-2 ${hasMinLength ? 'text-[#054048]' : 'text-[#5A5A5A]'}`}>
                {hasMinLength ? <Check className="w-3.5 h-3.5 text-[#054048]" /> : '○'} At least 8 characters long
              </p>
              <p className={`flex items-center gap-2 ${hasNumber ? 'text-[#054048]' : 'text-[#5A5A5A]'}`}>
                {hasNumber ? <Check className="w-3.5 h-3.5 text-[#054048]" /> : '○'} At least one number (0-9)
              </p>
              <p className={`flex items-center gap-2 ${passwordsMatch ? 'text-[#054048]' : 'text-[#5A5A5A]'}`}>
                {passwordsMatch ? <Check className="w-3.5 h-3.5 text-[#054048]" /> : '○'} Passwords match
              </p>
            </div>
          </div>

          <div className="pt-3 border-t-2 border-black flex justify-end">
            <button
              type="submit"
              disabled={!isPasswordFormValid || !currentPassword || passwordLoading}
              className="btn-primary py-2.5 px-6 text-xs font-extrabold gap-2 flex items-center disabled:opacity-50"
            >
              <Key className="w-4 h-4" /> {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}

      {/* 3. Account Danger Zone Section */}
      {activeTab === 'danger' && (
        <div className="bg-white border-2 border-[#D64545] rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3 border-b-2 border-black pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] border-2 border-[#D64545] text-[#D64545] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#D64545]">Danger Zone: Account Destruction</h3>
              <p className="text-xs text-[#5A5A5A]">Permanently erase your account and all associated campaign data</p>
            </div>
          </div>

          <div className="text-xs text-[#5A5A5A] space-y-2 leading-relaxed font-semibold">
            <p>
              Deleting your account will cascade across all connected services and permanently destroy:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#1A1A1A]">
              <li>All email outreach campaigns & draft templates</li>
              <li>All uploaded lead lists and contact custom field data</li>
              <li>All connected Google OAuth & SMTP sending accounts</li>
              <li>All historical send logs, analytics, and tracking records</li>
            </ul>
          </div>

          <div className="pt-3 border-t-2 border-black flex justify-end">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="btn-primary py-2.5 px-6 text-xs font-extrabold gap-2 flex items-center bg-[#D64545] hover:bg-[#B53535] border-2 border-black text-white"
            >
              <Trash2 className="w-4 h-4" /> Delete Account Permanently
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
