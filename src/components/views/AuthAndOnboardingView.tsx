import React, { useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Globe2, Mic, ShieldCheck } from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { PLACEMENT_QUESTIONS } from '../../lib/curriculum';
import { evaluatePlacementLevel } from '../../lib/spacedRepetition';
import type { EnglishAccent, EnglishLevel } from '../../types/lingua';

export function AuthView() {
  const {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resetPassword,
    enterPreviewMode,
    authError,
    clearAuthError,
  } = useLingua();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setResetSent(false);
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else if (mode === 'register') {
        await registerWithEmail(email, password, displayName || email.split('@')[0]);
      } else {
        await resetPassword(email);
        setResetSent(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0F1722] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Editorial Deep Navy Brand Column */}
        <div className="lg:col-span-6 bg-[#243B53] text-white rounded-xl p-8 lg:p-10 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white text-[#243B53] font-bold flex items-center justify-center">
                L
              </div>
              <div>
                <div className="font-semibold text-lg tracking-tight leading-none">LINGUA</div>
                <div className="text-[11px] text-slate-300 mt-1">Learn. Practice. Speak.</div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <h1 className="text-2xl sm:text-3xl font-semibold leading-snug text-balance">
                English komunikasi waiter hotel &amp; restoran yang sopan dan percaya diri.
              </h1>
              <p className="text-slate-300 text-sm leading-relaxed max-w-md">
                Kuasai kosakata layanan tamu, 7 grammar dasar, 150+ latihan per modul yang dirotasi setiap login, dan dialog script Waiter–Tamu.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-white/15 text-xs">
            <div className="space-y-1.5">
              <BookOpen className="w-4 h-4 text-[#D6AD60]" />
              <div className="font-semibold">Kosakata &amp; 7 Grammar</div>
              <div className="text-slate-300 leading-relaxed">Rumus &amp; kalimat layanan tamu</div>
            </div>
            <div className="space-y-1.5">
              <Mic className="w-4 h-4 text-[#66B2AF]" />
              <div className="font-semibold">150+ Bank Soal Waiter</div>
              <div className="text-slate-300 leading-relaxed">Listening, Dictation &amp; Shadowing</div>
            </div>
            <div className="space-y-1.5">
              <Globe2 className="w-4 h-4 text-[#66B2AF]" />
              <div className="font-semibold">Speaking Partner</div>
              <div className="text-slate-300 leading-relaxed">Call partner + script Waiter-Tamu</div>
            </div>
          </div>
        </div>

        {/* Right Clean Auth Form Card */}
        <div className="lg:col-span-6 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-[#243447] dark:text-white">
                {mode === 'login'
                  ? 'Sign in to LINGUA'
                  : mode === 'register'
                  ? 'Create your account'
                  : 'Reset password'}
              </h2>
              <div className="flex items-center gap-1 p-1 bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    clearAuthError();
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    mode === 'login'
                      ? 'bg-white dark:bg-[#243B53] text-[#243447] dark:text-white shadow-2xs'
                      : 'text-[#718096] dark:text-slate-300'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    clearAuthError();
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    mode === 'register'
                      ? 'bg-white dark:bg-[#243B53] text-[#243447] dark:text-white shadow-2xs'
                      : 'text-[#718096] dark:text-slate-300'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full py-2.5 px-4 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#1E2B3B] hover:bg-[#F7F8FA] dark:hover:bg-[#263344] text-sm font-semibold text-[#243447] dark:text-slate-100 flex items-center justify-center gap-2 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-[#3C8D8A]" />
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-[#E4E8EE] dark:border-[#263344]" />
              <span className="shrink mx-3 text-xs text-[#A0AEC0]">or continue with email</span>
              <div className="flex-grow border-t border-[#E4E8EE] dark:border-[#263344]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-medium text-[#486581] dark:text-slate-300 mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Nadia Kusuma"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#1E2B3B] text-[#243447] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40 focus:border-[#3C8D8A]"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-[#486581] dark:text-slate-300 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#1E2B3B] text-[#243447] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40 focus:border-[#3C8D8A]"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-medium text-[#486581] dark:text-slate-300"
                    >
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          clearAuthError();
                        }}
                        className="text-xs text-[#3C8D8A] hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#1E2B3B] text-[#243447] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40 focus:border-[#3C8D8A]"
                  />
                </div>
              )}

              {authError && (
                <div className="p-3 rounded-lg bg-[#FDF2F2] dark:bg-[#D65A5A]/15 border border-[#F5C6C6] dark:border-[#D65A5A]/40 text-xs text-[#9E3535] dark:text-rose-200 leading-relaxed">
                  {authError}
                </div>
              )}

              {resetSent && (
                <div className="p-3 rounded-lg bg-[#E6F0ED] dark:bg-[#39856A]/20 border border-[#C3DED6] dark:border-[#39856A]/40 text-xs text-[#285E4B] dark:text-emerald-200">
                  Password reset instructions have been sent to {email}.
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 px-4 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>
                  {busy
                    ? 'Processing...'
                    : mode === 'login'
                    ? 'Sign In'
                    : mode === 'register'
                    ? 'Create Account'
                    : 'Send Reset Link'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-center text-xs text-[#718096] hover:text-[#243447] dark:hover:text-white"
                >
                  Back to Login
                </button>
              )}
            </form>
          </div>

          <div className="pt-4 border-t border-[#E4E8EE] dark:border-[#263344] flex items-center justify-between gap-2 text-xs text-[#718096]">
            <span>Want to explore the workspace first?</span>
            <button
              type="button"
              onClick={enterPreviewMode}
              className="font-semibold text-[#3C8D8A] hover:underline whitespace-nowrap shrink-0"
            >
              Open Preview Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OnboardingView() {
  const { profile, completeOnboarding } = useLingua();
  const [step, setStep] = useState<'level' | 'quiz' | 'result'>('level');
  const [selectedLevel, setSelectedLevel] = useState<EnglishLevel>(profile?.level || 'B1-B2');
  const [preferredAccent, setPreferredAccent] = useState<EnglishAccent>(
    profile?.preferredAccent || 'American'
  );
  const [dailyTarget, setDailyTarget] = useState(profile?.dailyTargetMinutes || 20);
  const [goals, setGoals] = useState(
    profile?.learningGoals || 'Berkomunikasi sopan dan lancar sebagai waiter di hotel & restoran.'
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const score = PLACEMENT_QUESTIONS.reduce(
    (acc, q) => (answers[q.id] === q.correctIndex ? acc + 1 : acc),
    0
  );
  const evaluation = evaluatePlacementLevel(score, PLACEMENT_QUESTIONS.length);

  const handleFinish = async (useRecommended: boolean) => {
    setSaving(true);
    try {
      await completeOnboarding({
        level: useRecommended ? evaluation.recommendedLevel : selectedLevel,
        learningGoals: goals,
        preferredAccent,
        dailyTargetMinutes: dailyTarget,
        placementScore: score,
        placementTotal: PLACEMENT_QUESTIONS.length,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0F1722] flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-2xl w-full bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#3C8D8A]">Onboarding Assessment</div>
            <h1 className="text-2xl font-semibold text-[#243447] dark:text-white mt-1">
              Personalize Your English Path
            </h1>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#718096]">
            Step {step === 'level' ? '1' : step === 'quiz' ? '2' : '3'} / 3
          </span>
        </div>

        {step === 'level' && (
          <div className="space-y-5">
            <div>
              <div className="text-sm font-medium text-[#243447] dark:text-slate-200 mb-2">
                1. Current Self-Estimated Level
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'A1-A2' as EnglishLevel, title: 'Beginner', sub: 'A1–A2 · Core basics' },
                  { id: 'B1-B2' as EnglishLevel, title: 'Intermediate', sub: 'B1–B2 · Daily fluency' },
                  { id: 'C1-C2' as EnglishLevel, title: 'Advanced', sub: 'C1–C2 · Nuance & work' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedLevel(lvl.id)}
                    className={`p-4 rounded-xl border text-left transition-colors ${
                      selectedLevel === lvl.id
                        ? 'border-[#3C8D8A] bg-[#E6F0ED]/60 dark:bg-[#3C8D8A]/15'
                        : 'border-[#E4E8EE] dark:border-[#263344] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[#243447] dark:text-white">
                      {lvl.title}
                    </div>
                    <div className="text-xs text-[#718096] mt-1">{lvl.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="onb-accent" className="block text-xs font-medium text-[#486581] dark:text-slate-300 mb-1.5">
                  Preferred English Accent
                </label>
                <select
                  id="onb-accent"
                  value={preferredAccent}
                  onChange={(e) => setPreferredAccent(e.target.value as EnglishAccent)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#1E2B3B] text-sm"
                >
                  <option value="American">American English (US)</option>
                  <option value="British">British English (UK)</option>
                </select>
              </div>
              <div>
                <label htmlFor="onb-target" className="block text-xs font-medium text-[#486581] dark:text-slate-300 mb-1.5">
                  Daily Learning Target ({dailyTarget} min/day)
                </label>
                <input
                  id="onb-target"
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(Number(e.target.value))}
                  className="w-full accent-[#3C8D8A] mt-2"
                />
              </div>
            </div>

            <div>
              <label htmlFor="onb-goals" className="block text-xs font-medium text-[#486581] dark:text-slate-300 mb-1.5">
                Learning Goal
              </label>
              <input
                id="onb-goals"
                type="text"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#1E2B3B] text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleFinish(false)}
                className="px-4 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-sm font-medium text-[#486581] dark:text-slate-200 hover:bg-[#F7F8FA]"
              >
                Skip Quiz
              </button>
              <button
                type="button"
                onClick={() => setStep('quiz')}
                className="px-5 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-sm font-semibold"
              >
                Take Quick 5-Question Check
              </button>
            </div>
          </div>
        )}

        {step === 'quiz' && (
          <div className="space-y-5">
            <p className="text-sm text-[#718096] dark:text-slate-400">
              Answer these 5 short questions so we can calibrate your recommended learning path.
            </p>
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {PLACEMENT_QUESTIONS.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-[#E4E8EE] dark:border-[#263344] space-y-2.5"
                >
                  <div className="text-sm font-medium text-[#243447] dark:text-white">
                    {idx + 1}. {q.question}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                        className={`px-3 py-2 rounded-lg border text-left text-xs font-medium transition-colors ${
                          answers[q.id] === optIdx
                            ? 'border-[#3C8D8A] bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-white'
                            : 'border-[#E4E8EE] dark:border-[#263344] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('level')}
                className="px-4 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-sm font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('result')}
                className="px-5 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-sm font-semibold"
              >
                See Recommendation
              </button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className="space-y-5">
            <div className="p-5 rounded-xl bg-[#E6F0ED]/60 dark:bg-[#3C8D8A]/15 border border-[#C3DED6] dark:border-[#3C8D8A]/30 space-y-2">
              <div className="flex items-center gap-2 text-[#39856A] dark:text-[#66B2AF] text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Assessment Complete · Score {score}/{PLACEMENT_QUESTIONS.length} ({evaluation.percentage}%)
                </span>
              </div>
              <div className="text-xl font-semibold text-[#243447] dark:text-white">
                Recommended Level: {evaluation.recommendedLevel}
              </div>
              <p className="text-sm text-[#486581] dark:text-slate-300">{evaluation.summary}</p>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              {evaluation.recommendedLevel !== selectedLevel && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleFinish(false)}
                  className="px-4 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-sm font-medium"
                >
                  Keep {selectedLevel}
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => handleFinish(true)}
                className="px-5 py-2.5 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-sm font-semibold"
              >
                {saving ? 'Saving...' : `Start at ${evaluation.recommendedLevel}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
