import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Heart,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { findDuplicateVocabulary } from '../../lib/aiMemory';
import { validateVocabularyInput } from '../../lib/spacedRepetition';
import type {
  MasteryStatus,
  VocabCategory,
  VocabularyItem,
  VocabularySentence,
} from '../../types/lingua';
import { ConfirmModal, EmptyState, PageHeader, useToast } from '../ui/ToastAndPrimitives';

type DetailTab =
  | 'Overview'
  | 'Example Sentences'
  | 'Grammar'
  | 'Pronunciation'
  | 'Related Words'
  | 'Practice';

type PracticeMode =
  | 'Guess Meaning'
  | 'English to Indonesian'
  | 'Indonesian to English'
  | 'Fill in the Blank'
  | 'Arrange the Words'
  | 'Complete the Sentence'
  | 'Create Your Own Sentence';

interface VocabAssistResult {
  title: string;
  explanation: string;
  examples: { english: string; indonesian: string; note: string }[];
}

export function VocabularyView() {
  const {
    profile,
    vocabulary,
    sentences,
    globalSearch,
    focusedVocabId,
    setFocusedVocabId,
    addVocabularyWithAI,
    toggleFavoriteVocab,
    deleteVocabulary,
    recordVocabReview,
    speakText,
    setActiveRoute,
  } = useLingua();
  const { showToast } = useToast();

  const [localSearch, setLocalSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<VocabularyItem | null>(null);
  const [masteryFilter, setMasteryFilter] = useState<'All' | MasteryStatus | 'Favorites'>('All');
  const [categoryFilter, setCategoryFilter] = useState<'all' | VocabCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(
    focusedVocabId || vocabulary[0]?.id || null
  );
  const [activeTab, setActiveTab] = useState<DetailTab>('Overview');
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<VocabularyItem | null>(null);

  const [assistLoading, setAssistLoading] = useState<string | null>(null);
  const [assistResult, setAssistResult] = useState<VocabAssistResult | null>(null);

  useEffect(() => {
    if (focusedVocabId) {
      setSelectedId(focusedVocabId);
      setActiveTab('Practice');
      setFocusedVocabId(null);
    }
  }, [focusedVocabId, setFocusedVocabId]);

  const liveDuplicate = useMemo(
    () => (newWord.trim() ? findDuplicateVocabulary(vocabulary, newWord) || null : null),
    [newWord, vocabulary]
  );

  const filteredVocab = useMemo(() => {
    const q = (localSearch || globalSearch).trim().toLowerCase();
    return vocabulary.filter((item) => {
      if (masteryFilter === 'Favorites' && !item.isFavorite) return false;
      if (
        masteryFilter !== 'All' &&
        masteryFilter !== 'Favorites' &&
        item.masteryStatus !== masteryFilter
      ) {
        return false;
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      if (q && !item.word.toLowerCase().includes(q) && !item.meaningId.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [categoryFilter, globalSearch, localSearch, masteryFilter, vocabulary]);

  const selectedVocab: VocabularyItem | undefined =
    vocabulary.find((v) => v.id === selectedId) || filteredVocab[0];

  const selectedSentences: VocabularySentence[] = useMemo(
    () => (selectedVocab ? sentences.filter((s) => s.vocabId === selectedVocab.id) : []),
    [selectedVocab, sentences]
  );

  useEffect(() => {
    setAssistResult(null);
  }, [selectedVocab?.id]);

  const handleOpenExisting = (existing: VocabularyItem) => {
    setSelectedId(existing.id);
    setActiveTab('Overview');
    setDuplicateTarget(null);
    setFormError(null);
    setNewWord('');
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setDuplicateTarget(null);
    const check = validateVocabularyInput(newWord);
    if (!check.valid) {
      setFormError(check.error || 'Invalid vocabulary input.');
      return;
    }

    const dup = findDuplicateVocabulary(vocabulary, check.cleanWord);
    if (dup) {
      setDuplicateTarget(dup);
      return;
    }

    setAdding(true);
    try {
      const created = await addVocabularyWithAI(check.cleanWord);
      setNewWord('');
      setSelectedId(created.id);
      setActiveTab('Overview');
      showToast(
        `Added "${created.word}"`,
        'success',
        'Complete 14-point linguistic pack and example sentences generated.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate vocabulary material.';
      if (msg.startsWith('DUPLICATE_WORD:')) {
        const [, dupId] = msg.split(':');
        const found = vocabulary.find((v) => v.id === dupId) || dup || null;
        setDuplicateTarget(found);
      } else {
        setFormError(msg);
        showToast('Could not generate vocabulary', 'error', msg);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleAssistAction = async (
    action: 'explain' | 'more_examples' | 'simpler' | 'advanced'
  ) => {
    if (!selectedVocab || assistLoading) return;
    setAssistLoading(action);
    try {
      const res = await fetch('/api/ai/vocabulary/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: selectedVocab.word,
          meaningId: selectedVocab.meaningId,
          category: selectedVocab.category,
          level: profile?.level || 'B1-B2',
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI assist failed.');
      setAssistResult(data);
    } catch (err) {
      showToast(
        'AI vocabulary helper unavailable',
        'error',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setAssistLoading(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteItem) return;
    const word = confirmDeleteItem.word;
    const id = confirmDeleteItem.id;
    setConfirmDeleteItem(null);
    await deleteVocabulary(id);
    showToast(`Removed "${word}"`, 'info');
  };

  const shownDuplicate = duplicateTarget || liveDuplicate;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vocabulary"
        subtitle="Add any English word or phrase to generate IPA, Indonesian meaning, collocations, phrasal verbs, natural examples, and dialogues."
        action={
          <button
            type="button"
            onClick={() => setActiveRoute('review-vocabulary')}
            className="px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] flex items-center gap-2 whitespace-nowrap transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#3C8D8A]" />
            <span>Spaced Repetition Review</span>
          </button>
        }
      />

      {/* Add Vocabulary & Filter Toolbar */}
      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
        <form onSubmit={handleAddWord} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="new-vocab-word" className="sr-only">
              Add English Vocabulary Word
            </label>
            <input
              id="new-vocab-word"
              type="text"
              autoComplete="off"
              value={newWord}
              onChange={(e) => {
                setNewWord(e.target.value);
                setDuplicateTarget(null);
              }}
              placeholder='Add a new English word or phrase (e.g. "collaborate", "resilient", "figure out")'
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm text-[#243447] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40 focus:border-[#3C8D8A]"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2.5 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>{adding ? 'Generating...' : 'Add Vocabulary'}</span>
          </button>
        </form>

        {shownDuplicate && (
          <div
            role="status"
            className="p-3 rounded-lg bg-[#FDF6E7] dark:bg-[#D69E36]/15 border border-[#EFE0BC] dark:border-[#D69E36]/30 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7A5615] dark:text-amber-200"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong className="capitalize">"{shownDuplicate.word}"</strong> is already in your
                vocabulary library ({shownDuplicate.masteryStatus}).
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleOpenExisting(shownDuplicate)}
              className="px-3 py-1 rounded-md bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] font-semibold text-[#243B53] dark:text-white hover:bg-[#E6F0ED] transition-colors"
            >
              Open Existing Word
            </button>
          </div>
        )}

        {formError && (
          <p className="text-xs text-[#D65A5A]" role="alert">
            {formError}
          </p>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-[#E4E8EE] dark:border-[#263344]">
          {/* Mastery Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', 'New', 'Learning', 'Familiar', 'Mastered', 'Favorites'] as const).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMasteryFilter(tab)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    masteryFilter === tab
                      ? 'bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] font-semibold'
                      : 'text-[#718096] dark:text-slate-400 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {/* Search & Category Select */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-[#A0AEC0] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Filter words..."
                aria-label="Filter vocabulary list"
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-xs focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40"
              />
            </div>
            <select
              aria-label="Filter by part of speech"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | VocabCategory)}
              className="px-2.5 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-xs font-medium text-[#243447] dark:text-slate-200"
            >
              <option value="all">All Categories</option>
              <option value="noun">Noun</option>
              <option value="verb">Verb</option>
              <option value="adjective">Adjective</option>
              <option value="adverb">Adverb</option>
              <option value="preposition">Preposition</option>
              <option value="phrase">Phrase</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master-Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Word Table / List */}
        <div className="lg:col-span-4 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] flex items-center justify-between text-[11px] font-semibold text-[#718096]">
            <span>WORD LIST ({filteredVocab.length})</span>
            <span>MASTERY</span>
          </div>
          <div className="divide-y divide-[#E4E8EE] dark:divide-[#263344] max-h-[640px] overflow-y-auto">
            {filteredVocab.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <BookOpen className="w-6 h-6 text-[#A0AEC0] mx-auto" />
                <p className="text-sm font-medium text-[#243447] dark:text-white">
                  No matching words
                </p>
                <p className="text-xs text-[#718096]">
                  Add a new English word above or clear your filters.
                </p>
              </div>
            ) : (
              filteredVocab.map((item) => {
                const active = selectedVocab?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`px-4 py-3 flex items-center justify-between gap-2 transition-colors ${
                      active
                        ? 'bg-[#E6F0ED]/60 dark:bg-[#3C8D8A]/15'
                        : 'hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="font-semibold text-sm text-[#243447] dark:text-white capitalize truncate">
                        {item.word}
                      </div>
                      <div className="text-xs text-[#718096] dark:text-slate-400 truncate mt-0.5">
                        {item.meaningId} · {item.category}
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-medium text-[#486581] dark:text-slate-300">
                        {item.masteryStatus}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleFavoriteVocab(item.id)}
                        aria-label={
                          item.isFavorite
                            ? `Remove ${item.word} from favorites`
                            : `Favorite ${item.word}`
                        }
                        className={`p-1 rounded-md transition-colors ${
                          item.isFavorite
                            ? 'text-[#D65A5A]'
                            : 'text-[#A0AEC0] hover:text-[#486581]'
                        }`}
                      >
                        <Heart
                          className="w-3.5 h-3.5"
                          fill={item.isFavorite ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Workspace */}
        <div className="lg:col-span-8 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-5">
          {!selectedVocab ? (
            <EmptyState
              icon={<BookOpen className="w-5 h-5" />}
              title="Select a vocabulary word"
              description="Choose any word from your list to inspect its pronunciation, collocations, grammar notes, natural sentences, and interactive practice."
            />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E8EE] dark:border-[#263344]">
                <div>
                  <div className="text-xs font-mono text-[#718096]">
                    {selectedVocab.category} · {selectedVocab.ipa || '/.../'} ·{' '}
                    {selectedVocab.masteryStatus}
                  </div>
                  <h2 className="text-2xl font-semibold text-[#243447] dark:text-white capitalize mt-1">
                    {selectedVocab.word}
                  </h2>
                  <p className="text-sm text-[#486581] dark:text-slate-300 mt-0.5">
                    {selectedVocab.meaningId}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => speakText(selectedVocab.word, 'American')}
                    className="px-3 py-1.5 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] hover:bg-[#E6F0ED] text-xs font-semibold text-[#243447] dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#3C8D8A]" />
                    <span>US</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => speakText(selectedVocab.word, 'British')}
                    className="px-3 py-1.5 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] hover:bg-[#E6F0ED] text-xs font-semibold text-[#243447] dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#3C8D8A]" />
                    <span>UK</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteItem(selectedVocab)}
                    aria-label={`Delete ${selectedVocab.word}`}
                    className="p-2 rounded-lg text-[#A0AEC0] hover:text-[#D65A5A] hover:bg-[#FDF2F2] dark:hover:bg-[#D65A5A]/15 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Interactive AI Vocabulary Intelligence Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { key: 'explain', label: 'Explain with AI' },
                    { key: 'more_examples', label: 'More Examples' },
                    { key: 'simpler', label: 'Make It Simpler' },
                    { key: 'advanced', label: 'Advanced Usage' },
                  ] as const
                ).map((btn) => (
                  <button
                    key={btn.key}
                    type="button"
                    disabled={Boolean(assistLoading)}
                    onClick={() => handleAssistAction(btn.key)}
                    className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] hover:bg-[#E6F0ED] dark:hover:bg-[#3C8D8A]/20 text-xs font-semibold text-[#243B53] dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    {assistLoading === btn.key ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#3C8D8A]" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-[#3C8D8A]" />
                    )}
                    <span>{btn.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveTab('Practice')}
                  className="px-3 py-1.5 rounded-lg bg-[#3C8D8A] hover:bg-[#317572] text-white text-xs font-semibold transition-colors"
                >
                  Practice This Word
                </button>
              </div>

              {assistResult && (
                <div className="p-4 rounded-xl bg-[#E6F0ED]/60 dark:bg-[#3C8D8A]/15 border border-[#C3DED6] dark:border-[#3C8D8A]/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#243B53] dark:text-white">
                      {assistResult.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAssistResult(null)}
                      aria-label="Close AI vocabulary note"
                      className="p-1 text-[#718096] hover:text-[#243447]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[#243447] dark:text-slate-200 leading-relaxed">
                    {assistResult.explanation}
                  </p>
                  {assistResult.examples?.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {assistResult.examples.map((ex, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-white/80 dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] flex items-start justify-between gap-2"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-[#243447] dark:text-white">
                              {ex.english}
                            </div>
                            <div className="text-[#718096]">{ex.indonesian}</div>
                            {ex.note && <div className="text-[11px] text-[#3C8D8A]">{ex.note}</div>}
                          </div>
                          <button
                            type="button"
                            onClick={() => speakText(ex.english)}
                            aria-label={`Listen to ${ex.english}`}
                            className="p-1.5 rounded-md text-[#3C8D8A] shrink-0"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Clean Segmented Tabs */}
              <div className="flex flex-wrap gap-1 border-b border-[#E4E8EE] dark:border-[#263344] pb-2">
                {(
                  [
                    'Overview',
                    'Example Sentences',
                    'Grammar',
                    'Pronunciation',
                    'Related Words',
                    'Practice',
                  ] as DetailTab[]
                ).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-[#243B53] text-white font-semibold'
                        : 'text-[#718096] dark:text-slate-400 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'Overview' && (
                <div className="space-y-5 text-sm">
                  {selectedVocab.commonUsage && (
                    <div>
                      <h3 className="text-xs font-semibold text-[#718096] mb-1">Common Usage</h3>
                      <p className="text-[#243447] dark:text-slate-200 leading-relaxed">
                        {selectedVocab.commonUsage}
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-[#718096] mb-1">
                      Grammar &amp; Usage Note
                    </h3>
                    <p className="text-[#243447] dark:text-slate-200 leading-relaxed">
                      {selectedVocab.grammarExplanation}
                    </p>
                  </div>

                  {selectedVocab.commonMistakes && selectedVocab.commonMistakes.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#FDF2F2]/60 dark:bg-[#D65A5A]/10 border border-[#F5C6C6] dark:border-[#D65A5A]/30 space-y-1.5 text-xs">
                      <div className="font-semibold text-[#9E3535] dark:text-rose-300">
                        Common Mistakes to Avoid
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-[#486581] dark:text-slate-200">
                        {selectedVocab.commonMistakes.map((cm, idx) => (
                          <li key={idx}>{cm}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedVocab.dailyConversations &&
                    selectedVocab.dailyConversations.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-[#718096]">
                          Daily Conversation Examples
                        </h3>
                        <div className="space-y-2">
                          {selectedVocab.dailyConversations.map((dc, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] flex items-start justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="font-semibold text-[#243447] dark:text-white">
                                  <span className="text-[#3C8D8A]">{dc.speaker}: </span>
                                  {dc.line}
                                </div>
                                <div className="text-[#718096]">{dc.translationId}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => speakText(dc.line)}
                                aria-label={`Listen to ${dc.line}`}
                                className="p-1.5 rounded-md text-[#3C8D8A] shrink-0"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344]">
                      <div className="text-xs text-[#718096]">Reviews Completed</div>
                      <div className="text-lg font-mono tabular-nums font-semibold mt-1">
                        {selectedVocab.reviewCount}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344]">
                      <div className="text-xs text-[#718096]">Mistake Count</div>
                      <div className="text-lg font-mono tabular-nums font-semibold mt-1">
                        {selectedVocab.errorCount}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344]">
                      <div className="text-xs text-[#718096]">Example Sentences</div>
                      <div className="text-lg font-mono tabular-nums font-semibold mt-1">
                        {selectedSentences.length}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Example Sentences' && (
                <div className="space-y-4">
                  {selectedSentences.length === 0 ? (
                    <p className="text-xs text-[#718096]">
                      No sentences generated for this word yet.
                    </p>
                  ) : (
                    selectedSentences.map((s) => (
                      <div
                        key={s.id}
                        className="p-4 rounded-xl border border-[#E4E8EE] dark:border-[#263344] space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold text-[#3C8D8A]">{s.tense}</div>
                            <div className="text-base font-semibold text-[#243447] dark:text-white mt-0.5">
                              {s.sentence}
                            </div>
                            <div className="text-xs text-[#718096] dark:text-slate-400 mt-0.5">
                              {s.translationId}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => speakText(s.sentence)}
                            aria-label={`Listen to sentence: ${s.sentence}`}
                            className="p-2 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-[#3C8D8A] shrink-0"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] space-y-1.5 text-xs">
                          <div>
                            <span className="font-semibold">Pattern:</span>{' '}
                            <span className="font-mono text-[#243B53] dark:text-[#66B2AF]">
                              {s.formula}
                            </span>
                          </div>
                          <div className="text-[#486581] dark:text-slate-300">
                            <span className="font-semibold">Subject:</span> {s.subject} ·{' '}
                            <span className="font-semibold">Verb:</span> {s.verb} ·{' '}
                            <span className="font-semibold">Object/Complement:</span>{' '}
                            {s.objectComplement}
                          </div>
                          <div className="text-[#486581] dark:text-slate-300">
                            <span className="font-semibold">Why used:</span> {s.structureReason}
                          </div>
                          <div className="text-[#486581] dark:text-slate-300">
                            <span className="font-semibold">Daily conversation:</span> {s.dailyUsage}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#486581] dark:text-slate-300">
                          <div>
                            <span className="font-semibold text-[#243447] dark:text-white">(+) </span>
                            {s.affirmative}
                          </div>
                          <div>
                            <span className="font-semibold text-[#243447] dark:text-white">(-) </span>
                            {s.negative}
                          </div>
                          <div>
                            <span className="font-semibold text-[#243447] dark:text-white">(?) </span>
                            {s.interrogative}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'Grammar' && (
                <div className="space-y-4 text-sm">
                  <p className="text-[#243447] dark:text-slate-200 leading-relaxed">
                    {selectedVocab.grammarExplanation}
                  </p>
                  {selectedVocab.commonMistakes && selectedVocab.commonMistakes.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[#FDF2F2]/60 dark:bg-[#D65A5A]/10 border border-[#F5C6C6] dark:border-[#D65A5A]/30 text-xs space-y-1">
                      <div className="font-semibold text-[#9E3535] dark:text-rose-300">
                        Common Pitfalls
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-[#486581] dark:text-slate-200">
                        {selectedVocab.commonMistakes.map((m, idx) => (
                          <li key={idx}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[#718096]">
                      Natural Structure Formulas
                    </div>
                    {selectedSentences.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 border-b border-[#E4E8EE] dark:border-[#263344] text-xs"
                      >
                        <span className="font-semibold text-[#243447] dark:text-white">
                          {s.tense}
                        </span>
                        <span className="font-mono text-[#3C8D8A]">{s.formula}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'Pronunciation' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-1.5">
                    <div className="text-xs text-[#718096]">Phonetic Transcription (IPA)</div>
                    <div className="text-2xl font-mono font-semibold text-[#243B53] dark:text-white">
                      {selectedVocab.ipa || '/.../'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => speakText(selectedVocab.word, 'American')}
                      className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold flex items-center gap-2"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Play American English</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => speakText(selectedVocab.word, 'British')}
                      className="px-4 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 flex items-center gap-2 hover:bg-[#F7F8FA]"
                    >
                      <Volume2 className="w-4 h-4 text-[#3C8D8A]" />
                      <span>Play British English</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'Related Words' && (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-2">
                      <div className="text-xs font-semibold text-[#718096]">Synonyms</div>
                      <div className="text-[#243447] dark:text-slate-200">
                        {selectedVocab.synonyms.length
                          ? selectedVocab.synonyms.join(' · ')
                          : 'None listed'}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-2">
                      <div className="text-xs font-semibold text-[#718096]">Antonyms</div>
                      <div className="text-[#243447] dark:text-slate-200">
                        {selectedVocab.antonyms.length
                          ? selectedVocab.antonyms.join(' · ')
                          : 'None listed'}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-2">
                      <div className="text-xs font-semibold text-[#718096]">Related Family</div>
                      <div className="text-[#243447] dark:text-slate-200">
                        {selectedVocab.relatedWords.length
                          ? selectedVocab.relatedWords.join(' · ')
                          : 'None listed'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-2">
                      <div className="text-xs font-semibold text-[#718096]">Common Collocations</div>
                      <div className="text-[#243447] dark:text-slate-200">
                        {selectedVocab.collocations?.length
                          ? selectedVocab.collocations.join(' · ')
                          : 'None listed'}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-2">
                      <div className="text-xs font-semibold text-[#718096]">
                        Relevant Phrasal Verbs
                      </div>
                      <div className="text-[#243447] dark:text-slate-200">
                        {selectedVocab.phrasalVerbs?.length
                          ? selectedVocab.phrasalVerbs.join(' · ')
                          : 'Not commonly used as a phrasal verb'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Practice' && (
                <VocabularyPracticeBox
                  vocab={selectedVocab}
                  sentences={selectedSentences}
                  allVocabulary={vocabulary}
                  onResult={(ok) => recordVocabReview(selectedVocab.id, ok)}
                />
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirmDeleteItem)}
        title={`Delete "${confirmDeleteItem?.word}"?`}
        description="This removes the word and its generated example sentences from your personal vocabulary list."
        confirmLabel="Delete Word"
        destructive
        onCancel={() => setConfirmDeleteItem(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function VocabularyPracticeBox({
  vocab,
  sentences,
  allVocabulary,
  onResult,
}: {
  vocab: VocabularyItem;
  sentences: VocabularySentence[];
  allVocabulary: VocabularyItem[];
  onResult: (wasCorrect: boolean) => Promise<void>;
}) {
  const [mode, setMode] = useState<PracticeMode>('Guess Meaning');
  const [userInput, setUserInput] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [arrangedWords, setArrangedWords] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    explanationId: string;
    correctedSentence?: string;
    naturalAlternative?: string;
  } | null>(null);

  const sampleSentence = sentences[0]?.sentence || `I use ${vocab.word} every day.`;
  const sampleTranslation = sentences[0]?.translationId || vocab.meaningId;

  const distractors = useMemo(() => {
    const others = allVocabulary
      .filter((v) => v.id !== vocab.id)
      .slice(0, 3)
      .map((v) => v.meaningId);
    const pool = [...others, 'menyelesaikan tugas', 'memahami konsep', 'mengatur jadwal'];
    return [vocab.meaningId, ...pool.slice(0, 3)].sort();
  }, [allVocabulary, vocab]);

  const scrambledTokens = useMemo(() => {
    const tokens = sampleSentence.replace(/[.?!]/g, '').split(/\s+/);
    return [...tokens].sort((a, b) => a.localeCompare(b));
  }, [sampleSentence]);

  const resetState = (nextMode: PracticeMode) => {
    setMode(nextMode);
    setUserInput('');
    setSelectedChoice(null);
    setArrangedWords([]);
    setFeedback(null);
  };

  const handleCheckLocalChoice = async (choice: string) => {
    setSelectedChoice(choice);
    const ok = choice.toLowerCase() === vocab.meaningId.toLowerCase();
    setFeedback({
      isCorrect: ok,
      explanationId: ok
        ? `Benar! "${vocab.word}" berarti "${vocab.meaningId}".`
        : `Kurang tepat. Arti yang benar untuk "${vocab.word}" adalah "${vocab.meaningId}".`,
    });
    await onResult(ok);
  };

  const handleEvaluateWithAI = async (e: React.FormEvent) => {
    e.preventDefault();
    const answerText =
      mode === 'Arrange the Words' ? arrangedWords.join(' ') : userInput.trim();
    if (!answerText) return;

    setChecking(true);
    try {
      const promptDesc =
        mode === 'English to Indonesian'
          ? `Translate "${sampleSentence}" to Indonesian.`
          : mode === 'Indonesian to English'
          ? `Translate "${sampleTranslation}" into natural English using "${vocab.word}".`
          : mode === 'Fill in the Blank'
          ? `Fill in the blank: ${sampleSentence.replace(new RegExp(vocab.word, 'i'), '_____')}`
          : mode === 'Arrange the Words'
          ? `Arrange words into a valid English sentence matching: ${sampleSentence}`
          : mode === 'Complete the Sentence'
          ? `Complete a sentence starting with "Today I want to ${vocab.word}..."`
          : `Create your own original English sentence using "${vocab.word}".`;

      const res = await fetch('/api/ai/vocabulary/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: vocab.word,
          meaningId: vocab.meaningId,
          mode,
          prompt: promptDesc,
          userAnswer: answerText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not evaluate answer.');
      setFeedback(data);
      await onResult(Boolean(data.isCorrect));
    } catch (err) {
      setFeedback({
        isCorrect: false,
        explanationId: err instanceof Error ? err.message : 'Evaluation failed.',
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            'Guess Meaning',
            'English to Indonesian',
            'Indonesian to English',
            'Fill in the Blank',
            'Arrange the Words',
            'Complete the Sentence',
            'Create Your Own Sentence',
          ] as PracticeMode[]
        ).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => resetState(m)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              mode === m
                ? 'border-[#3C8D8A] bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] font-semibold'
                : 'border-[#E4E8EE] dark:border-[#263344] text-[#718096] dark:text-slate-300'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'Guess Meaning' ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[#243447] dark:text-white">
            What is the Indonesian meaning of <span className="font-semibold">"{vocab.word}"</span>?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {distractors.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleCheckLocalChoice(opt)}
                className={`p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                  selectedChoice === opt
                    ? 'border-[#3C8D8A] bg-[#E6F0ED]/60 dark:bg-[#3C8D8A]/15'
                    : 'border-[#E4E8EE] dark:border-[#263344] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleEvaluateWithAI} className="space-y-3">
          <div className="text-sm font-medium text-[#243447] dark:text-white">
            {mode === 'English to Indonesian' && `Translate into Indonesian: "${sampleSentence}"`}
            {mode === 'Indonesian to English' &&
              `Translate into English using "${vocab.word}": "${sampleTranslation}"`}
            {mode === 'Fill in the Blank' &&
              `Fill in the blank: "${sampleSentence.replace(new RegExp(vocab.word, 'i'), '_____')}"`}
            {mode === 'Arrange the Words' &&
              'Click words in order to form a natural English sentence:'}
            {mode === 'Complete the Sentence' &&
              `Complete this sentence naturally: "Right now, I am trying to ${vocab.word} ..."`}
            {mode === 'Create Your Own Sentence' &&
              `Write an original sentence using "${vocab.word}":`}
          </div>

          {mode === 'Arrange the Words' ? (
            <div className="space-y-3">
              <div className="p-3 min-h-[44px] rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] flex flex-wrap gap-2">
                {arrangedWords.length === 0 ? (
                  <span className="text-xs text-[#A0AEC0]">Select words below...</span>
                ) : (
                  arrangedWords.map((w, idx) => (
                    <button
                      key={`${w}-${idx}`}
                      type="button"
                      onClick={() =>
                        setArrangedWords((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="px-2.5 py-1 rounded-md bg-[#243B53] text-white text-xs font-medium"
                    >
                      {w}
                    </button>
                  ))
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {scrambledTokens.map((tok, idx) => (
                  <button
                    key={`${tok}-${idx}`}
                    type="button"
                    onClick={() => setArrangedWords((prev) => [...prev, tok])}
                    className="px-2.5 py-1 rounded-md border border-[#E4E8EE] dark:border-[#263344] text-xs font-medium hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]"
                  >
                    {tok}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your answer..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm"
            />
          )}

          <button
            type="submit"
            disabled={checking}
            className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-xs font-semibold"
          >
            {checking ? 'Checking with AI...' : 'Check Answer'}
          </button>
        </form>
      )}

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-1.5 ${
            feedback.isCorrect
              ? 'bg-[#E6F0ED]/60 dark:bg-[#39856A]/20 border-[#C3DED6] dark:border-[#39856A]/40 text-[#285E4B] dark:text-emerald-200'
              : 'bg-[#FDF6E7] dark:bg-[#D69E36]/15 border-[#EFE0BC] dark:border-[#D69E36]/30 text-[#7A5615] dark:text-amber-200'
          }`}
        >
          <div className="font-semibold">
            {feedback.isCorrect ? 'Correct' : 'Keep refining'}
          </div>
          <p>{feedback.explanationId}</p>
          {feedback.correctedSentence && (
            <p>
              <span className="font-semibold">Suggested:</span> {feedback.correctedSentence}
            </p>
          )}
          {feedback.naturalAlternative && (
            <p>
              <span className="font-semibold">Natural alternative:</span>{' '}
              {feedback.naturalAlternative}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
