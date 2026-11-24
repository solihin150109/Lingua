import React, { useMemo, useState } from 'react';
import { Check, RefreshCw, Volume2, X } from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { sortReviewQueue } from '../../lib/spacedRepetition';
import { EmptyState, PageHeader } from '../ui/ToastAndPrimitives';

export function VocabularyReviewView() {
  const { vocabulary, sentences, recordVocabReview, speakText, setActiveRoute } = useLingua();
  const queue = useMemo(() => sortReviewQueue(vocabulary), [vocabulary]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);

  const current = queue[index % Math.max(1, queue.length)];
  const currentSentences = current ? sentences.filter((s) => s.vocabId === current.id) : [];

  const handleGrade = async (wasCorrect: boolean) => {
    if (!current) return;
    await recordVocabReview(current.id, wasCorrect);
    setRevealed(false);
    setSessionDone((c) => c + 1);
    setIndex((i) => (i + 1 < queue.length ? i + 1 : 0));
  };

  if (queue.length === 0) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<RefreshCw className="w-5 h-5" />}
          title="No vocabulary to review yet"
          description="Add words in Vocabulary first so the spaced repetition engine can schedule your daily reviews."
          action={
            <button
              type="button"
              onClick={() => setActiveRoute('vocabulary')}
              className="px-4 py-2 rounded-lg bg-[#243B53] text-white text-xs font-semibold"
            >
              Open Vocabulary
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Spaced Repetition Review"
        subtitle={`Words with frequent mistakes appear sooner · Reviewed this session: ${sessionDone}`}
        action={
          <span className="text-xs font-mono tabular-nums text-[#718096]">
            Card {(index % queue.length) + 1} / {queue.length}
          </span>
        }
      />

      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-8 space-y-6">
        <div className="flex items-center justify-between text-xs text-[#718096]">
          <span>
            {current.category} · {current.masteryStatus}
          </span>
          <span className="font-mono tabular-nums">Errors: {current.errorCount}</span>
        </div>

        <div className="text-center py-6 space-y-3">
          <div className="text-3xl sm:text-4xl font-semibold text-[#243447] dark:text-white capitalize">
            {current.word}
          </div>
          <div className="text-sm font-mono text-[#718096]">{current.ipa || '/.../'}</div>
          <button
            type="button"
            onClick={() => speakText(current.word)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243B53] dark:text-slate-200 hover:bg-[#E6F0ED] transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#3C8D8A]" />
            <span>Listen</span>
          </button>
        </div>

        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="w-full py-3 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-sm font-semibold transition-colors"
          >
            Reveal Meaning &amp; Example
          </button>
        ) : (
          <div className="space-y-5 pt-4 border-t border-[#E4E8EE] dark:border-[#263344]">
            <div>
              <div className="text-xs text-[#718096]">Indonesian Meaning</div>
              <div className="text-lg font-semibold text-[#243447] dark:text-white mt-0.5">
                {current.meaningId}
              </div>
            </div>
            {currentSentences[0] && (
              <div className="p-3.5 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-sm flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-[#3C8D8A]">
                    {currentSentences[0].tense}
                  </div>
                  <div className="font-medium text-[#243447] dark:text-white">
                    {currentSentences[0].sentence}
                  </div>
                  <div className="text-xs text-[#718096]">{currentSentences[0].translationId}</div>
                </div>
                <button
                  type="button"
                  onClick={() => speakText(currentSentences[0].sentence)}
                  aria-label="Listen to example sentence"
                  className="p-1.5 rounded-md text-[#3C8D8A] shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleGrade(false)}
                className="py-2.5 px-4 rounded-lg border border-[#F5C6C6] dark:border-[#D65A5A]/40 bg-[#FDF2F2] dark:bg-[#D65A5A]/15 text-[#9E3535] dark:text-rose-200 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                <span>Need More Practice</span>
              </button>
              <button
                type="button"
                onClick={() => handleGrade(true)}
                className="py-2.5 px-4 rounded-lg bg-[#39856A] hover:bg-[#2F6F58] text-white text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Got It</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
