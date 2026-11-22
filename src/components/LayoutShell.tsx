import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Home,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PenTool,
  Search,
  Settings,
  Sparkles,
  Sun,
  User,
  Users,
  X,
} from 'lucide-react';
import { useLingua } from '../context/LinguaContext';
import type { NavRoute } from '../types/lingua';
import { PersonalAssistantDrawer } from './PersonalAssistantDrawer';

interface NavItem {
  id: NavRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchRoutes?: NavRoute[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'OVERVIEW',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }],
  },
  {
    title: 'LEARNING',
    items: [
      { id: 'vocabulary', label: 'Vocabulary', icon: BookOpen },
      { id: 'grammar', label: 'Grammar', icon: Layers },
      { id: 'sentence-builder', label: 'Sentence Builder', icon: PenTool },
      {
        id: 'listening',
        label: 'Listening & Pronunciation',
        icon: Headphones,
        matchRoutes: ['listening', 'pronunciation'],
      },
    ],
  },
  {
    title: 'SPEAKING',
    items: [
      { id: 'ai-tutor', label: 'AI Tutor', icon: Bot },
      { id: 'speaking-community', label: 'Speaking Partner', icon: Users },
      {
        id: 'simulator',
        label: 'Conversation Practice',
        icon: MessageSquare,
        matchRoutes: ['simulator', 'speaking-history'],
      },
    ],
  },
  {
    title: 'PROGRESS',
    items: [
      {
        id: 'analytics',
        label: 'Learning Progress',
        icon: BarChart3,
        matchRoutes: ['analytics', 'learning-path', 'daily-challenge', 'review-vocabulary'],
      },
      { id: 'achievements', label: 'Achievements', icon: Award },
    ],
  },
];

const ROUTE_META: Record<NavRoute, { section: string; title: string }> = {
  dashboard: { section: 'Overview', title: 'Dashboard' },
  vocabulary: { section: 'Learning', title: 'Vocabulary' },
  grammar: { section: 'Learning', title: 'Grammar' },
  'sentence-builder': { section: 'Learning', title: 'Sentence Builder' },
  listening: { section: 'Learning', title: 'Listening & Pronunciation' },
  pronunciation: { section: 'Learning', title: 'Listening & Pronunciation' },
  'ai-tutor': { section: 'Speaking', title: 'AI Tutor' },
  'speaking-community': { section: 'Speaking', title: 'Speaking Partner' },
  simulator: { section: 'Speaking', title: 'Conversation Practice' },
  'speaking-history': { section: 'Speaking', title: 'Conversation Practice' },
  analytics: { section: 'Progress', title: 'Learning Progress' },
  'learning-path': { section: 'Progress', title: 'Learning Path' },
  'daily-challenge': { section: 'Progress', title: 'Daily Challenge' },
  'review-vocabulary': { section: 'Progress', title: 'Vocabulary Review' },
  achievements: { section: 'Progress', title: 'Achievements' },
  settings: { section: 'Account', title: 'Settings' },
  profile: { section: 'Account', title: 'Profile' },
};

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const {
    activeRoute,
    setActiveRoute,
    globalSearch,
    setGlobalSearch,
    profile,
    notifications,
    markNotificationRead,
    darkMode,
    toggleDarkMode,
    logout,
    lastError,
    clearLastError,
    openAssistantWithPrompt,
  } = useLingua();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const currentMeta = ROUTE_META[activeRoute] || ROUTE_META.dashboard;

  const isNavItemActive = (item: NavItem) => {
    if (item.matchRoutes) return item.matchRoutes.includes(activeRoute);
    return activeRoute === item.id;
  };

  const handleNavClick = (id: NavRoute) => {
    setActiveRoute(id);
    setMobileMenuOpen(false);
    setNotifOpen(false);
    setProfileMenuOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      setActiveRoute('vocabulary');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F7F8FA] dark:bg-[#0F1722] text-[#243447] dark:text-slate-100">
      {/* Desktop Left Sidebar (~240px when open) */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 lg:h-screen lg:sticky lg:top-0 border-r border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] transition-all duration-200 ${
          collapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {/* Top Brand Area */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E4E8EE] dark:border-[#263344] shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 text-left min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C8D8A] rounded-lg"
          >
            <div className="w-8 h-8 rounded-lg bg-[#243B53] text-white font-semibold text-sm flex items-center justify-center shrink-0">
              L
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-semibold text-[15px] tracking-tight text-[#243B53] dark:text-white leading-none">
                  LINGUA
                </div>
                <div className="text-[10px] font-medium text-[#718096] dark:text-slate-400 mt-1 whitespace-nowrap">
                  Learn. Practice. Speak.
                </div>
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-[#718096] hover:text-[#243B53] dark:hover:text-white hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5" aria-label="Primary Sidebar">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-0.5">
              {!collapsed && (
                <div className="px-2.5 pb-1 text-[10px] font-semibold tracking-wider text-[#A0AEC0] dark:text-slate-500">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] font-semibold'
                        : 'text-[#486581] dark:text-slate-300 font-medium hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] hover:text-[#243447] dark:hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-[#3C8D8A] dark:text-[#66B2AF]' : 'text-[#718096] dark:text-slate-400'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Pinned Account Links */}
        <div className="p-2.5 border-t border-[#E4E8EE] dark:border-[#263344] space-y-0.5 shrink-0">
          {[
            { id: 'settings' as NavRoute, label: 'Settings', icon: Settings },
            { id: 'profile' as NavRoute, label: 'Profile', icon: User },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] font-semibold'
                    : 'text-[#486581] dark:text-slate-300 font-medium hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] hover:text-[#243447] dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-[#3C8D8A]' : 'text-[#718096] dark:text-slate-400'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          <button
            type="button"
            onClick={logout}
            title={collapsed ? 'Logout' : undefined}
            aria-label="Logout"
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-[#718096] dark:text-slate-400 hover:bg-[#FDF2F2] dark:hover:bg-[#D65A5A]/15 hover:text-[#D65A5A] transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 bg-[#243B53]/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[85vw] bg-white dark:bg-[#16202C] h-full flex flex-col border-r border-[#E4E8EE] dark:border-[#263344] z-10">
            <div className="h-16 px-4 flex items-center justify-between border-b border-[#E4E8EE] dark:border-[#263344]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#243B53] text-white font-semibold text-sm flex items-center justify-center">
                  L
                </div>
                <div>
                  <div className="font-semibold text-[15px] text-[#243B53] dark:text-white leading-none">
                    LINGUA
                  </div>
                  <div className="text-[10px] text-[#718096] dark:text-slate-400 mt-1">
                    Learn. Practice. Speak.
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-[#718096] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
              {NAV_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1">
                  <div className="px-2.5 pb-1 text-[10px] font-semibold tracking-wider text-[#A0AEC0]">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isNavItemActive(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-colors ${
                          active
                            ? 'bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] font-semibold'
                            : 'text-[#486581] dark:text-slate-300 font-medium'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="p-3 border-t border-[#E4E8EE] dark:border-[#263344] space-y-1">
              <button
                type="button"
                onClick={() => handleNavClick('settings')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-[#486581] dark:text-slate-300"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('profile')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-[#486581] dark:text-slate-300"
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-[#D65A5A]"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Minimalist Top Header */}
        <header className="h-16 px-4 lg:px-8 bg-white dark:bg-[#16202C] border-b border-[#E4E8EE] dark:border-[#263344] flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-[#486581] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-[#A0AEC0] dark:text-slate-500">
                <span>{currentMeta.section}</span>
                <span aria-hidden="true">/</span>
                <span className="text-[#718096] dark:text-slate-400">{currentMeta.title}</span>
              </div>
              <div className="text-sm sm:text-[15px] font-semibold text-[#243447] dark:text-white truncate">
                {currentMeta.title}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Compact Search */}
            <form onSubmit={handleSearchSubmit} className="relative hidden sm:block sm:w-52 md:w-64">
              <Search className="w-3.5 h-3.5 text-[#A0AEC0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search..."
                aria-label="Search vocabulary or grammar topics"
                className="w-full pl-8 pr-2.5 py-1.5 text-xs sm:text-sm bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] rounded-lg text-[#243447] dark:text-slate-100 placeholder:text-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40 focus:border-[#3C8D8A]"
              />
            </form>

            {/* Personal AI Coach Trigger */}
            <button
              type="button"
              onClick={() => openAssistantWithPrompt()}
              aria-label="Open Personal AI Coach"
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 border border-[#C3DED6] dark:border-[#3C8D8A]/40 text-[#243B53] dark:text-[#E6F0ED] hover:bg-[#D5E6E1] text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#3C8D8A]" />
              <span className="hidden sm:inline">AI Coach</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setProfileMenuOpen(false);
                }}
                aria-label={`Notifications (${unreadCount} unread)`}
                className="relative p-2 rounded-lg text-[#486581] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#3C8D8A]" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl shadow-md p-3 z-40">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E4E8EE] dark:border-[#263344]">
                    <span className="text-xs font-semibold text-[#243447] dark:text-white">
                      Notifications
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-[#718096] hover:text-[#243447] dark:hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-[#718096] py-5 text-center">No notifications yet.</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-1.5">
                      {notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            markNotificationRead(n.id);
                            setNotifOpen(false);
                            setActiveRoute((n.actionRoute as NavRoute) || 'dashboard');
                          }}
                          className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                            n.read
                              ? 'border-transparent bg-[#F7F8FA] dark:bg-[#1E2B3B]/50 text-[#718096]'
                              : 'border-[#D5E6E1] dark:border-[#3C8D8A]/30 bg-[#E6F0ED]/50 dark:bg-[#3C8D8A]/15 text-[#243447] dark:text-slate-100'
                          }`}
                        >
                          <div className="text-xs font-semibold">{n.title}</div>
                          <div className="text-xs opacity-80 mt-0.5 line-clamp-2">{n.body}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Avatar & Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((o) => !o);
                  setNotifOpen(false);
                }}
                aria-label="Open profile menu"
                className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] transition-colors"
              >
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[#243B53] text-white font-semibold text-xs flex items-center justify-center">
                    {(profile?.displayName || 'L').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline text-xs font-semibold text-[#243447] dark:text-slate-100 max-w-[120px] truncate">
                  {profile?.displayName || 'Learner'}
                </span>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl shadow-md p-2 z-40">
                  <div className="px-3 py-2 border-b border-[#E4E8EE] dark:border-[#263344] mb-1">
                    <div className="text-xs font-semibold text-[#243447] dark:text-white truncate">
                      {profile?.displayName}
                    </div>
                    <div className="text-[11px] text-[#718096] dark:text-slate-400">
                      {profile?.level} · {profile?.preferredAccent}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavClick('profile')}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-[#718096]" />
                    <span>Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('settings')}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#718096]" />
                    <span>Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      {darkMode ? (
                        <Sun className="w-3.5 h-3.5 text-[#D6AD60]" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-[#718096]" />
                      )}
                      <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </span>
                  </button>
                  <div className="my-1 border-t border-[#E4E8EE] dark:border-[#263344]" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg text-[#D65A5A] hover:bg-[#FDF2F2] dark:hover:bg-[#D65A5A]/15 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {lastError && (
          <div className="mx-4 lg:mx-8 mt-4 p-3 rounded-lg bg-[#FDF2F2] dark:bg-[#D65A5A]/15 border border-[#F5C6C6] dark:border-[#D65A5A]/40 flex items-center justify-between gap-3 text-xs text-[#9E3535] dark:text-rose-200">
            <span>{lastError}</span>
            <button
              type="button"
              onClick={clearLastError}
              className="font-semibold underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 max-w-[1320px] w-full mx-auto pb-20 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Compact Mobile Bottom Nav */}
      <nav
        aria-label="Mobile quick navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 h-14 bg-white dark:bg-[#16202C] border-t border-[#E4E8EE] dark:border-[#263344] flex items-center justify-around px-2 z-30"
      >
        {[
          { id: 'dashboard' as NavRoute, label: 'Home', icon: Home, match: ['dashboard'] },
          {
            id: 'vocabulary' as NavRoute,
            label: 'Learn',
            icon: BookOpen,
            match: ['vocabulary', 'grammar', 'sentence-builder', 'listening', 'pronunciation'],
          },
          {
            id: 'ai-tutor' as NavRoute,
            label: 'Speak',
            icon: Bot,
            match: ['ai-tutor', 'speaking-community', 'simulator', 'speaking-history'],
          },
          {
            id: 'analytics' as NavRoute,
            label: 'Progress',
            icon: BarChart3,
            match: ['analytics', 'achievements', 'learning-path', 'daily-challenge', 'review-vocabulary'],
          },
        ].map((item) => {
          const Icon = item.icon;
          const active = item.match.includes(activeRoute);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-[11px] font-medium ${
                active
                  ? 'text-[#243B53] dark:text-[#66B2AF] font-semibold'
                  : 'text-[#718096] dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <PersonalAssistantDrawer />
    </div>
  );
}
