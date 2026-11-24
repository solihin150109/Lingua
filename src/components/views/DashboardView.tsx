import React from 'react';
import {
  ArrowRight,
  BellRing,
  BookOpen,
  CalendarClock,
  Layers,
  MessageSquare,
  PenTool,
  Users,
  Volume2,
} from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { BASIC_GRAMMAR_STRUCTURES } from '../../lib/curriculum';

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Selamat pagi';
  if (hour < 17) return 'Selamat siang';
  return 'Selamat malam';
}

export function DashboardView() {
  const {
    profile,
    vocabulary,
    sentences,
    studySchedules,
    setActiveRoute,
    navigateToGrammarTopic,
    navigateToSentenceBuilder,
    testScheduleNotification,
    speakText,
  } = useLingua();

  const latestVocab = vocabulary[0];
  const latestWordSentences = latestVocab
    ? sentences.filter((s) => s.vocabId === latestVocab.id)
    : [];
  const activeSchedules = studySchedules.filter((s) => s.enabled);

  return (
    <div className="space-y-6">
      {/* Section 1: Workspace Welcome & 4 Core Pillars */}
      <section className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#718096] dark:text-slate-400">
            <span>Hotel &amp; Restaurant Waiter · Kosakata · 7 Grammar Dasar · Guided Speaking</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#243447] dark:text-white tracking-tight">
            {getTimeGreeting()}, {profile?.displayName || 'Waiter'}.
          </h1>
          <p className="text-sm text-[#718096] dark:text-slate-400 leading-relaxed">
            Kumpulkan kosakata restoran, kuasai 7 grammar dasar, susun kalimat layanan tamu, dan berlatih speaking terstruktur dengan script.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setActiveRoute('vocabulary')}
              className="px-3.5 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Tambah Kosakata</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToSentenceBuilder(latestVocab?.word)}
              className="px-3.5 py-2 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 border border-[#C3DED6] dark:border-[#3C8D8A]/40 text-[#243B53] dark:text-[#E6F0ED] hover:bg-[#D5E6E1] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <PenTool className="w-3.5 h-3.5 text-[#3C8D8A]" />
              <span>Buat Kalimat Bebas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRoute('speaking-community')}
              className="px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#486581] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] inline-flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-[#3C8D8A]" />
              <span>Speaking Dengan Script</span>
            </button>
          </div>
        </div>

        {/* Study Schedule Snapshot */}
        <div className="w-full lg:w-80 shrink-0 bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#243447] dark:text-white flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-[#3C8D8A]" />
              <span>Jadwal Belajar Aktif</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveRoute('schedule')}
              className="font-semibold text-[#3C8D8A] hover:underline"
            >
              Atur Jadwal
            </button>
          </div>
          {activeSchedules.length === 0 ? (
            <p className="text-xs text-[#718096] dark:text-slate-400">
              Belum ada pengingat aktif. Buat jadwal agar notifikasi muncul tepat waktu.
            </p>
          ) : (
            <div className="space-y-1.5">
              {activeSchedules.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#243447] dark:text-white truncate">
                      {item.title}
                    </div>
                    <div className="font-mono text-[11px] text-[#3C8D8A]">{item.timeHHMM}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => testScheduleNotification(item)}
                    className="px-2 py-1 rounded border border-[#E4E8EE] dark:border-[#263344] text-[11px] font-semibold text-[#486581] dark:text-slate-200 hover:bg-[#F7F8FA]"
                  >
                    Tes
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Quick Workspace Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveRoute('vocabulary')}
          className="text-left bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] hover:border-[#3C8D8A] rounded-xl p-5 space-y-1.5 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[#718096] dark:text-slate-400">
            <span>Koleksi Kosakata</span>
            <BookOpen className="w-4 h-4 text-[#3C8D8A]" />
          </div>
          <div className="text-2xl font-semibold text-[#243447] dark:text-white tabular-nums">
            {vocabulary.length} kata
          </div>
          <div className="text-xs text-[#718096] dark:text-slate-400 tabular-nums">
            {sentences.length} contoh kalimat grammar dasar
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveRoute('grammar')}
          className="text-left bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] hover:border-[#3C8D8A] rounded-xl p-5 space-y-1.5 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[#718096] dark:text-slate-400">
            <span>7 Grammar Dasar</span>
            <Layers className="w-4 h-4 text-[#486581] dark:text-slate-300" />
          </div>
          <div className="text-2xl font-semibold text-[#243447] dark:text-white">
            7 Pola Waiter
          </div>
          <div className="text-xs text-[#718096] dark:text-slate-400">
            Present, Continuous, Past, Future, Perfect, Modals, Imperatives
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveRoute('sentence-builder')}
          className="text-left bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] hover:border-[#3C8D8A] rounded-xl p-5 space-y-1.5 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[#718096] dark:text-slate-400">
            <span>Sentence Builder</span>
            <PenTool className="w-4 h-4 text-[#3C8D8A]" />
          </div>
          <div className="text-2xl font-semibold text-[#243447] dark:text-white">
            Bebas Level
          </div>
          <div className="text-xs text-[#718096] dark:text-slate-400">
            Susun kalimat bebas dengan koreksi AI
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveRoute('speaking-community')}
          className="text-left bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] hover:border-[#3C8D8A] rounded-xl p-5 space-y-1.5 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[#718096] dark:text-slate-400">
            <span>Guided Speaking</span>
            <Users className="w-4 h-4 text-[#3C8D8A]" />
          </div>
          <div className="text-2xl font-semibold text-[#243447] dark:text-white">
            Berbasis Script
          </div>
          <div className="text-xs text-[#718096] dark:text-slate-400">
            Percakapan tertata dengan panduan script
          </div>
        </button>
      </section>

      {/* Section 3: 7 Grammar Dasar + Latest Vocabulary Word + Guided Speaking */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: 5 Basic Grammars Quick Builder */}
        <div className="lg:col-span-7 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                7 Grammar Dasar &amp; Latihan Kalimat
              </h2>
              <p className="text-xs text-[#718096] dark:text-slate-400">
                Pola praktis komunikasi waiter di hotel &amp; restoran.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveRoute('grammar')}
              className="text-xs font-semibold text-[#3C8D8A] hover:underline whitespace-nowrap"
            >
              Buka Grammar
            </button>
          </div>

          <div className="divide-y divide-[#E4E8EE] dark:divide-[#263344]">
            {BASIC_GRAMMAR_STRUCTURES.map((g) => (
              <div
                key={g.id}
                className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#243447] dark:text-white">
                      {g.name}
                    </span>
                    <span className="text-[11px] font-medium text-[#3C8D8A]">
                      {g.shortLabel}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#486581] dark:text-slate-300">
                    {g.formula}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigateToGrammarTopic(g.id)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#486581] dark:text-slate-200 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]"
                  >
                    Pelajari
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToSentenceBuilder(latestVocab?.word, g.name)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-xs font-semibold text-[#243B53] dark:text-[#E6F0ED] hover:bg-[#D5E6E1]"
                  >
                    Buat Kalimat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Latest Word + Guided Speaking Shortcuts */}
        <div className="lg:col-span-5 space-y-6">
          {/* Latest Collected Vocabulary */}
          <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                Kosakata Terbaru
              </h2>
              <button
                type="button"
                onClick={() => setActiveRoute('vocabulary')}
                className="text-xs font-semibold text-[#3C8D8A] hover:underline"
              >
                Semua Kosakata
              </button>
            </div>

            {latestVocab ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold text-[#243447] dark:text-white capitalize">
                      {latestVocab.word}
                    </div>
                    <div className="text-xs text-[#718096] font-mono mt-0.5">
                      {latestVocab.ipa || '/.../'} · {latestVocab.category}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakText(latestVocab.word)}
                    aria-label={`Pronounce ${latestVocab.word}`}
                    className="p-2 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-[#243B53] dark:text-slate-200 hover:bg-[#E6F0ED] transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-[#486581] dark:text-slate-300">
                  Arti:{' '}
                  <span className="font-semibold text-[#243447] dark:text-white">
                    {latestVocab.meaningId}
                  </span>
                </p>

                {latestWordSentences.length > 0 && (
                  <div className="p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-1 text-xs">
                    <div className="font-semibold text-[#3C8D8A]">
                      {latestWordSentences[0].tense}
                    </div>
                    <div className="font-medium text-[#243447] dark:text-white">
                      {latestWordSentences[0].sentence}
                    </div>
                    <div className="text-[#718096]">{latestWordSentences[0].translationId}</div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigateToSentenceBuilder(latestVocab.word)}
                  className="w-full py-2 px-3 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] hover:bg-[#E6F0ED] dark:hover:bg-[#3C8D8A]/20 text-xs font-semibold text-[#243B53] dark:text-slate-100 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Latih "{latestVocab.word}" di Sentence Builder</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#718096] leading-relaxed">
                  Tambahkan kosakata pertama untuk membuat kalimat otomatis dalam 7 grammar dasar.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveRoute('vocabulary')}
                  className="px-4 py-2 rounded-lg bg-[#243B53] text-white text-xs font-semibold"
                >
                  Tambah Kosakata
                </button>
              </div>
            )}
          </div>

          {/* Script-Guided Speaking & Roleplay Waiter */}
          <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-3">
            <h2 className="text-base font-semibold text-[#243447] dark:text-white">
              Latihan Speaking Tertata
            </h2>
            <p className="text-xs text-[#718096] dark:text-slate-400">
              Berlatih dialog Waiter &amp; Tamu mengikuti script agar percakapan terarah.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setActiveRoute('speaking-community')}
                className="p-3 rounded-lg border border-[#E4E8EE] dark:border-[#263344] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] text-left space-y-1 transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#243447] dark:text-white">
                  <Users className="w-3.5 h-3.5 text-[#3C8D8A]" />
                  <span>Speaking Partner</span>
                </div>
                <div className="text-[11px] text-[#718096]">Call partner + script Waiter-Tamu</div>
              </button>
              <button
                type="button"
                onClick={() => setActiveRoute('simulator')}
                className="p-3 rounded-lg border border-[#E4E8EE] dark:border-[#263344] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] text-left space-y-1 transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#243447] dark:text-white">
                  <MessageSquare className="w-3.5 h-3.5 text-[#3C8D8A]" />
                  <span>Roleplay Waiter</span>
                </div>
                <div className="text-[11px] text-[#718096]">Simulasi dialog layanan tamu</div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => testScheduleNotification(studySchedules[0])}
              className="w-full py-2 px-3 rounded-lg border border-[#E4E8EE] dark:border-[#263344] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] text-xs font-semibold text-[#486581] dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <BellRing className="w-3.5 h-3.5 text-[#3C8D8A]" />
              <span>Tes Notifikasi Pengingat Belajar</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
