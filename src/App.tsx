import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LayoutShell } from './components/LayoutShell';
import { ToastProvider } from './components/ui/ToastAndPrimitives';
import { AiNativeTutorView } from './components/views/AiNativeTutorView';
import { AuthView, OnboardingView } from './components/views/AuthAndOnboardingView';
import { DashboardView } from './components/views/DashboardView';
import { GrammarCenterView } from './components/views/GrammarCenterView';
import {
  DailyChallengeView,
  LearningPathView,
} from './components/views/LearningPathAndChallengeViews';
import {
  ListeningPracticeView,
  PronunciationView,
} from './components/views/ListeningAndPronunciationViews';
import { ProfileView, SettingsView } from './components/views/ProfileAndSettingsViews';
import { AchievementsView, AnalyticsView } from './components/views/ProgressViews';
import { SentenceBuilderView } from './components/views/SentenceBuilderView';
import {
  ConversationSimulatorView,
  SpeakingHistoryView,
} from './components/views/SimulatorAndHistoryViews';
import { SpeakingCommunityView } from './components/views/SpeakingCommunityView';
import { VocabularyReviewView } from './components/views/VocabularyReviewView';
import { VocabularyView } from './components/views/VocabularyView';
import { LinguaProvider, useLingua } from './context/LinguaContext';

function LinguaRouter() {
  const { authReady, firebaseUser, isPreviewMode, profile, activeRoute } = useLingua();

  if (!authReady && !isPreviewMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] dark:bg-[#0F1722] px-4">
        <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl px-6 py-5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#243B53] text-white font-semibold text-sm flex items-center justify-center">
            L
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-[#243447] dark:text-white">LINGUA</div>
            <div className="text-xs text-[#718096] dark:text-slate-400">
              Preparing your workspace...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSignedInVerified = Boolean(firebaseUser && firebaseUser.emailVerified);

  if (!isSignedInVerified && !isPreviewMode) {
    return <AuthView />;
  }

  if (profile && !profile.onboardingCompleted && !isPreviewMode) {
    return <OnboardingView />;
  }

  const renderPage = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardView />;
      case 'learning-path':
        return <LearningPathView />;
      case 'daily-challenge':
        return <DailyChallengeView />;
      case 'vocabulary':
        return <VocabularyView />;
      case 'grammar':
        return <GrammarCenterView />;
      case 'sentence-builder':
        return <SentenceBuilderView />;
      case 'listening':
        return <ListeningPracticeView />;
      case 'pronunciation':
        return <PronunciationView />;
      case 'ai-tutor':
        return <AiNativeTutorView />;
      case 'speaking-community':
        return <SpeakingCommunityView />;
      case 'simulator':
        return <ConversationSimulatorView />;
      case 'speaking-history':
        return <SpeakingHistoryView />;
      case 'achievements':
        return <AchievementsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'review-vocabulary':
        return <VocabularyReviewView />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return <LayoutShell>{renderPage()}</LayoutShell>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <LinguaProvider>
          <LinguaRouter />
        </LinguaProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
