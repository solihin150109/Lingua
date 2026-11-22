import React, { useState } from 'react';
import { CheckCircle2, Shield } from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import type { EnglishAccent, EnglishLevel } from '../../types/lingua';
import { PageHeader, useToast } from '../ui/ToastAndPrimitives';

export function ProfileView() {
  const { profile, account, updateUserProfile } = useLingua();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [level, setLevel] = useState<EnglishLevel>(profile?.level || 'B1-B2');
  const [accent, setAccent] = useState<EnglishAccent>(profile?.preferredAccent || 'American');
  const [dailyTarget, setDailyTarget] = useState(profile?.dailyTargetMinutes || 20);
  const [goals, setGoals] = useState(profile?.learningGoals || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        photoURL: photoURL.trim(),
        level,
        preferredAccent: accent,
        dailyTargetMinutes: Number(dailyTarget),
        learningGoals: goals.trim(),
      });
      setSaved(true);
      showToast('Profile saved', 'success', 'Your learning preferences have been updated.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Manage your English level, preferred speaking accent, daily practice target, and learner profile."
      />

      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-5"
      >
        <div className="flex items-center gap-4 pb-4 border-b border-[#E4E8EE] dark:border-[#263344]">
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-xl object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-[#243B53] text-white text-lg font-semibold flex items-center justify-center">
              {(displayName || 'L').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-base font-semibold text-[#243447] dark:text-white">
              {displayName || 'Learner'}
            </div>
            <div className="text-xs text-[#718096]">{account?.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="prof-name"
              className="block text-xs font-medium text-[#486581] dark:text-slate-300 mb-1"
            >
              Display Name
            </label>
            <input
              id="prof-name"
              type="text"
              required
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="prof-photo"
              className="block text-xs font-medium text-[#486581] dark:text-slate-300 mb-1"
            >
              Profile Photo URL (optional)
            </label>
            <input
              id="prof-photo"
              type="url"
              maxLength={512}
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="prof-level"
              className="block text-xs font-medium text-[#486581] dark:text-slate-300 mb-1"
            >
              Learning Level
            </label>
            <select
              id="prof-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as EnglishLevel)}
              className="w-full px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm"
            >
              <option value="A1-A2">Beginner (A1–A2)</option>
              <option value="B1-B2">Intermediate (B1–B2)</option>
              <option value="C1-C2">Advanced (C1–C2)</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="prof-accent"
              className="block text-xs font-medium text-[#486581] dark:text-slate-300 mb-1"
            >
              Preferred Accent
            </label>
            <select
              id="prof-accent"
              value={accent}
              onChange={(e) => setAccent(e.target.value as EnglishAccent)}
              className="w-full px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm"
            >
              <option value="American">American English</option>
              <option value="British">British English</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="prof-target"
              className="block text-xs font-medium text-[#486581] dark:text-slate-300 mb-1"
            >
              Daily Target (min)
            </label>
            <input
              id="prof-target"
              type="number"
              min={5}
              max={240}
              value={dailyTarget}
              onChange={(e) => setDailyTarget(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm font-mono tabular-nums"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="prof-goals"
            className="block text-xs font-medium text-[#486581] dark:text-slate-300 mb-1"
          >
            Learning Goals
          </label>
          <textarea
            id="prof-goals"
            rows={3}
            maxLength={300}
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm"
          />
        </div>

        {saved && (
          <div className="text-xs text-[#39856A] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile saved successfully.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-xs font-semibold transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

export function SettingsView() {
  const {
    account,
    grantAudioConsent,
    darkMode,
    toggleDarkMode,
    unblockUser,
    serverHealth,
  } = useLingua();
  const { showToast } = useToast();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure interface appearance, microphone and transcript consent, safety preferences, and service connectivity."
      />

      {/* Privacy & Audio Consent */}
      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#243447] dark:text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#3C8D8A]" />
          <span>Audio &amp; Appearance</span>
        </h2>

        <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[#E4E8EE] dark:border-[#263344]">
          <div>
            <div className="text-sm font-medium text-[#243447] dark:text-white">
              Consent to Save Conversation Transcripts
            </div>
            <div className="text-xs text-[#718096]">
              Live microphone audio is streamed securely and never stored permanently. Only text transcripts are saved when enabled.
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              const next = !account?.audioConsentGranted;
              await grantAudioConsent(next);
              showToast(
                next ? 'Transcript consent enabled' : 'Transcript consent disabled',
                'info'
              );
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
              account?.audioConsentGranted
                ? 'bg-[#39856A] text-white'
                : 'bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300'
            }`}
          >
            {account?.audioConsentGranted ? 'Granted' : 'Disabled'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <div className="text-sm font-medium text-[#243447] dark:text-white">Interface Theme</div>
            <div className="text-xs text-[#718096]">
              Switch between light daylight and dark slate surfaces.
            </div>
          </div>
          <div
            role="group"
            aria-label="Interface theme"
            className="inline-flex rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] p-0.5 shrink-0"
          >
            <button
              type="button"
              aria-pressed={!darkMode}
              onClick={() => {
                if (darkMode) toggleDarkMode();
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                !darkMode
                  ? 'bg-white text-[#243B53] shadow-xs'
                  : 'text-[#718096] dark:text-slate-400 hover:text-white'
              }`}
            >
              Light Mode
            </button>
            <button
              type="button"
              aria-pressed={darkMode}
              onClick={() => {
                if (!darkMode) toggleDarkMode();
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                darkMode
                  ? 'bg-[#243B53] text-white shadow-xs'
                  : 'text-[#718096] hover:text-[#243447]'
              }`}
            >
              Dark Mode
            </button>
          </div>
        </div>
      </div>

      {/* Blocked Users */}
      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-3">
        <h2 className="text-base font-semibold text-[#243447] dark:text-white">
          Blocked Speaking Partners
        </h2>
        {!account?.blockedUserIds?.length ? (
          <p className="text-xs text-[#718096]">You have not blocked any speaking partners.</p>
        ) : (
          <div className="divide-y divide-[#E4E8EE] dark:divide-[#263344]">
            {account.blockedUserIds.map((uid) => (
              <div key={uid} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-mono text-[#486581] dark:text-slate-300">{uid}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await unblockUser(uid);
                    showToast('Partner unblocked', 'info');
                  }}
                  className="text-[#3C8D8A] font-semibold hover:underline"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Integration Status */}
      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-3 text-xs">
        <h2 className="text-base font-semibold text-[#243447] dark:text-white">
          Platform Integration Status
        </h2>
        <div className="space-y-2 text-[#486581] dark:text-slate-300">
          <div className="flex justify-between py-1.5 border-b border-[#E4E8EE] dark:border-[#263344]">
            <span>Firebase Authentication &amp; Cloud Firestore</span>
            <span className="font-semibold text-[#39856A]">Provisioned</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#E4E8EE] dark:border-[#263344]">
            <span>Server-Side Gemini AI Engine</span>
            <span
              className={`font-semibold ${
                serverHealth?.geminiConfigured ? 'text-[#39856A]' : 'text-[#D69E36]'
              }`}
            >
              {serverHealth?.geminiConfigured ? 'Configured' : 'Configure GEMINI_API_KEY'}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span>WebRTC Signaling &amp; Gemini Live WebSocket</span>
            <span
              className={`font-semibold ${
                serverHealth?.webrtcSignaling ? 'text-[#39856A]' : 'text-[#718096]'
              }`}
            >
              {serverHealth?.webrtcSignaling ? 'Active' : 'Checking...'}
            </span>
          </div>
        </div>
        <p className="text-[#718096] pt-1">
          Google Sign-In works immediately. Enable Email/Password in Firebase Console &gt; Authentication &gt; Sign-in method if you also want email password login.
        </p>
      </div>
    </div>
  );
}
