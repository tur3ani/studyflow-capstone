import { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  HelpCircle,
  Layers,
  Loader2,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { api } from '../api/client';
import type {
  DocumentDetailDto,
  QuizQuestionDto,
  StudyNoteDto,
  StudySessionDto,
} from '../types/models';
import { ActiveRecallView } from './ActiveRecallView';

type TechniqueKind = 'recall' | 'quizzes' | 'mindmap' | 'flashcards';

interface TechniquesViewProps {
  projectId: string | null;
  document: DocumentDetailDto | null;
  notes: StudyNoteDto[];
  sessions: StudySessionDto[];
  onCreateSession: (goal: string, selectedChunkIds: string[]) => Promise<StudySessionDto>;
  onSaveRecall: (sessionId: string, recallText: string) => Promise<StudySessionDto>;
  onJumpToChunkInReader: (chunkId: string, pageNumber?: number) => void;
  onQuizAttemptSaved: () => void;
}

export function TechniquesView({
  projectId,
  document: doc,
  notes,
  sessions,
  onCreateSession,
  onSaveRecall,
  onJumpToChunkInReader,
  onQuizAttemptSaved,
}: TechniquesViewProps) {
  const [activeTechnique, setActiveTechnique] = useState<TechniqueKind>('recall');

  // --- Quizzes State ---
  const [questions, setQuestions] = useState<QuizQuestionDto[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // --- Mind Map State ---
  const [selectedMapChunkId, setSelectedMapChunkId] = useState<string | null>(null);

  // --- Flashcards State ---
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [masteredCardIds, setMasteredCardIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!doc) {
      setQuestions([]);
      return;
    }
    setSelectedMapChunkId(doc.chunks[0]?.id ?? null);
    setCardIndex(0);
    setFlipped(false);

    setLoadingQuiz(true);
    api
      .getDocumentQuiz(doc.id)
      .then((list) => setQuestions(list))
      .catch(() => setQuestions([]))
      .finally(() => setLoadingQuiz(false));
  }, [doc?.id]);

  // Build Flashcard Deck from Saved Notes (first) + Key Lecture Passages
  const flashcardDeck = useMemo(() => {
    const docNotes = notes.filter((n) => !doc || n.documentId === doc.id);
    const fromNotes = docNotes.map((n) => ({
      id: `note-${n.id}`,
      front: n.title,
      back: n.contentMarkdown,
      pageNumber: n.sourcePageNumber ?? 1,
      chunkId: n.chunkId ?? null,
      origin: 'Your Note',
      isRtl: n.language === 'ar',
    }));

    const fromChunks = (doc?.chunks ?? [])
      .filter((c) => !c.needsOcr)
      .slice(0, 8)
      .map((c) => ({
        id: `chunk-${c.id}`,
        front: c.heading || `Explain Page ${c.pageNumber} · Passage #${c.chunkIndex}`,
        back: c.content,
        pageNumber: c.pageNumber,
        chunkId: c.id,
        origin: `Lecture p.${c.pageNumber}`,
        isRtl: false,
      }));

    return fromNotes.length > 0 ? [...fromNotes, ...fromChunks.slice(0, 4)] : fromChunks;
  }, [notes, doc]);

  // Build Mind Map grouped by Page
  const mindMapGroups = useMemo(() => {
    if (!doc) return [];
    const byPage = new Map<number, typeof doc.chunks>();
    for (const c of doc.chunks) {
      const list = byPage.get(c.pageNumber) ?? [];
      list.push(c);
      byPage.set(c.pageNumber, list);
    }
    return Array.from(byPage.entries()).sort((a, b) => a[0] - b[0]);
  }, [doc]);

  const handleGenerateQuiz = async () => {
    if (!doc) return;
    setGeneratingQuiz(true);
    try {
      const created = await api.generateDocumentQuiz(doc.id, 4);
      setQuestions((prev) => [...created, ...prev]);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleSubmitAnswer = async (q: QuizQuestionDto) => {
    const answer = answers[q.id]?.trim();
    if (!answer) return;
    setSubmittingId(q.id);
    try {
      const res = await api.submitQuizAttempt(q.id, answer);
      setQuestions((prev) =>
        prev.map((item) => (item.id === q.id ? { ...item, latestAttempt: res.attempt } : item))
      );
      onQuizAttemptSaved();
    } finally {
      setSubmittingId(null);
    }
  };

  const techniqueTabs: { id: TechniqueKind; label: string; icon: typeof Brain; desc: string }[] = [
    { id: 'recall', label: 'Active Recall', icon: Brain, desc: '3-step closed-book memory' },
    { id: 'quizzes', label: 'Quizzes', icon: HelpCircle, desc: 'Source-grounded MCQ & written' },
    { id: 'mindmap', label: 'Mind Map', icon: GitBranch, desc: 'Visual lecture concept tree' },
    { id: 'flashcards', label: 'Flashcards', icon: Layers, desc: 'Flip-deck from notes & slides' },
  ];

  const currentCard = flashcardDeck[cardIndex] ?? null;
  const selectedMapChunk = doc?.chunks.find((c) => c.id === selectedMapChunkId) ?? doc?.chunks[0] ?? null;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Sub-navigation bar inside Techniques */}
      <div
        className="px-6 py-3 border-b flex items-center justify-center gap-2 flex-wrap"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {techniqueTabs.map((t) => {
          const Icon = t.icon;
          const active = activeTechnique === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTechnique(t.id)}
              className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition cursor-pointer"
              style={
                active
                  ? {
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--accent-border)',
                      color: 'var(--ink-primary)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }
                  : {
                      backgroundColor: 'transparent',
                      borderColor: 'transparent',
                      color: 'var(--ink-secondary)',
                    }
              }
            >
              <Icon
                className="h-3.5 w-3.5"
                style={{ color: active ? 'var(--accent)' : 'var(--ink-muted)' }}
              />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Technique 1: Active Recall */}
      {activeTechnique === 'recall' && (
        <ActiveRecallView
          projectId={projectId}
          document={doc}
          sessions={sessions}
          onCreateSession={onCreateSession}
          onSaveRecall={onSaveRecall}
          onJumpToChunkInReader={(chunkId) => onJumpToChunkInReader(chunkId)}
        />
      )}

      {/* Technique 2: Interactive Quizzes (PostgreSQL persisted) */}
      {activeTechnique === 'quizzes' && (
        <div className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-14 py-9">
          <div className="max-w-4xl mx-auto space-y-6">
            {!doc ? (
              <div className="py-16 text-center text-xs" style={{ color: 'var(--ink-muted)' }}>
                Select a lecture from the sidebar to generate quizzes.
              </div>
            ) : (
              <>
                <header className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--accent)' }}>
                      Source-Grounded Quizzes
                    </div>
                    <h2 className="font-editorial text-3xl font-medium" dir="auto">
                      {doc.title}
                    </h2>
                    <p className="text-xs mt-1" style={{ color: 'var(--ink-secondary)' }}>
                      Attempts are saved in PostgreSQL and automatically update your Strong & Weak
                      Points on the Home Dashboard.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={generatingQuiz}
                    onClick={() => void handleGenerateQuiz()}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium text-white cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {generatingQuiz ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {generatingQuiz ? 'Generating...' : 'Generate New Quiz'}
                  </button>
                </header>

                {loadingQuiz ? (
                  <div className="py-12 text-center text-xs" style={{ color: 'var(--ink-muted)' }}>
                    Loading quiz questions...
                  </div>
                ) : questions.length === 0 ? (
                  <div
                    className="rounded-3xl border border-dashed p-12 text-center space-y-3"
                    style={{ borderColor: 'var(--border-strong)', backgroundColor: 'var(--bg-surface)' }}
                  >
                    <HelpCircle className="h-8 w-8 mx-auto" style={{ color: 'var(--accent)' }} />
                    <div className="font-editorial text-xl font-medium">No quiz questions yet</div>
                    <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--ink-secondary)' }}>
                      Generate a mix of multiple-choice and short written recall questions grounded
                      in this lecture's passages.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, idx) => {
                      const attempt = q.latestAttempt;
                      const currentVal = answers[q.id] ?? attempt?.submittedAnswer ?? '';

                      return (
                        <div
                          key={q.id}
                          className="rounded-3xl border p-6 space-y-4"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-mono-tech" style={{ color: 'var(--ink-muted)' }}>
                              Q{idx + 1} · {q.questionType.toUpperCase()} · Page {q.pageNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => onJumpToChunkInReader(q.chunkId, q.pageNumber)}
                              className="inline-flex items-center gap-1 font-medium cursor-pointer"
                              style={{ color: 'var(--accent)' }}
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Source p.{q.pageNumber}
                            </button>
                          </div>

                          <div className="text-sm font-medium leading-relaxed" dir="auto">
                            {q.prompt}
                          </div>

                          {q.questionType === 'mcq' ? (
                            <div className="space-y-2">
                              {q.options.map((opt) => {
                                const selected = currentVal === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                    className="w-full text-left rounded-xl border px-4 py-3 text-xs leading-relaxed transition cursor-pointer"
                                    style={{
                                      backgroundColor: selected ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                                      borderColor: selected ? 'var(--accent-border)' : 'var(--border-subtle)',
                                      color: 'var(--ink-primary)',
                                    }}
                                  >
                                    <span dir="auto">{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <textarea
                              rows={4}
                              dir="auto"
                              value={currentVal}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                              }
                              placeholder="Write your explanation in Arabic or English..."
                              className="w-full rounded-xl border p-3.5 text-xs leading-relaxed focus:outline-none"
                              style={{
                                backgroundColor: 'var(--bg-canvas)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--ink-primary)',
                              }}
                            />
                          )}

                          <div className="flex items-center justify-between gap-3 pt-1">
                            <button
                              type="button"
                              disabled={submittingId === q.id || !currentVal.trim()}
                              onClick={() => void handleSubmitAnswer(q)}
                              className="rounded-xl px-4 py-2 text-xs font-medium text-white cursor-pointer disabled:opacity-45"
                              style={{ backgroundColor: 'var(--accent)' }}
                            >
                              {submittingId === q.id ? 'Checking...' : attempt ? 'Submit New Attempt' : 'Check Answer'}
                            </button>

                            {attempt && (
                              <span
                                className="inline-flex items-center gap-1.5 text-xs font-medium"
                                style={{
                                  color: attempt.isCorrect ? 'var(--sage)' : 'var(--warm)',
                                }}
                              >
                                {attempt.isCorrect ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                Score: {attempt.score ?? 0}%
                              </span>
                            )}
                          </div>

                          {attempt?.feedbackText && (
                            <div
                              className="rounded-2xl border p-3.5 text-xs leading-relaxed"
                              style={{
                                backgroundColor: attempt.isCorrect ? 'var(--sage-soft)' : 'var(--warm-soft)',
                                borderColor: attempt.isCorrect ? 'var(--sage-border)' : 'var(--warm-border)',
                                color: 'var(--ink-primary)',
                              }}
                            >
                              {attempt.feedbackText}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Technique 3: Interactive Concept Mind Map */}
      {activeTechnique === 'mindmap' && (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {!doc ? (
            <div className="flex-1 flex items-center justify-center text-xs" style={{ color: 'var(--ink-muted)' }}>
              Select a lecture from the sidebar to explore its concept mind map.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto p-8 lg:p-12">
                <div className="max-w-4xl mx-auto">
                  {/* Root Node */}
                  <div className="flex justify-center mb-8">
                    <div
                      className="rounded-2xl border-2 px-6 py-3.5 shadow-sm text-center max-w-md"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--accent)',
                      }}
                    >
                      <div className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                        Central Lecture Concept
                      </div>
                      <div className="font-editorial text-xl font-medium mt-0.5" dir="auto">
                        {doc.title}
                      </div>
                    </div>
                  </div>

                  {/* Page Branches & Chunk Leaf Nodes */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {mindMapGroups.map(([pageNumber, chunks]) => (
                      <div
                        key={pageNumber}
                        className="rounded-3xl border p-5 space-y-3 relative"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="font-mono-tech text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                          >
                            Branch · Page {pageNumber}
                          </span>
                          <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                            {chunks.length} nodes
                          </span>
                        </div>

                        <div className="space-y-2 pl-3 border-l-2" style={{ borderColor: 'var(--border-strong)' }}>
                          {chunks.map((c) => {
                            const selected = selectedMapChunk?.id === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setSelectedMapChunkId(c.id)}
                                className="w-full text-left rounded-xl border px-3.5 py-2.5 transition cursor-pointer"
                                style={{
                                  backgroundColor: selected ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                                  borderColor: selected ? 'var(--accent-border)' : 'var(--border-subtle)',
                                }}
                              >
                                <div className="text-xs font-medium line-clamp-1" dir="auto">
                                  {c.heading || `Passage #${c.chunkIndex}`}
                                </div>
                                <div
                                  className="text-[11px] line-clamp-1 mt-0.5"
                                  dir="auto"
                                  style={{ color: 'var(--ink-muted)' }}
                                >
                                  {c.content}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Node Inspector */}
              {selectedMapChunk && (
                <aside
                  className="w-80 shrink-0 border-l p-5 overflow-y-auto space-y-4"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="font-mono-tech text-[11px]" style={{ color: 'var(--accent)' }}>
                    Page {selectedMapChunk.pageNumber} · Node #{selectedMapChunk.chunkIndex}
                  </div>
                  <h3 className="font-editorial text-xl font-medium" dir="auto">
                    {selectedMapChunk.heading || `Passage #${selectedMapChunk.chunkIndex}`}
                  </h3>
                  <p dir="auto" className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ink-secondary)' }}>
                    {selectedMapChunk.content}
                  </p>
                  <button
                    type="button"
                    onClick={() => onJumpToChunkInReader(selectedMapChunk.id, selectedMapChunk.pageNumber)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Read & Explain
                  </button>
                </aside>
              )}
            </>
          )}
        </div>
      )}

      {/* Technique 4: Interactive Flashcards */}
      {activeTechnique === 'flashcards' && (
        <div className="flex-1 overflow-y-auto px-6 py-10 flex flex-col items-center justify-center">
          {!currentCard ? (
            <div className="text-center text-xs" style={{ color: 'var(--ink-muted)' }}>
              Import a lecture or save notes to build your flashcard deck automatically.
            </div>
          ) : (
            <div className="w-full max-w-xl space-y-5">
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--ink-muted)' }}>
                <span>
                  Card {cardIndex + 1} of {flashcardDeck.length} · {currentCard.origin}
                </span>
                <span>{masteredCardIds.size} mastered this session</span>
              </div>

              <div
                onClick={() => setFlipped((v) => !v)}
                className="min-h-[290px] rounded-3xl border p-8 flex flex-col justify-between cursor-pointer transition shadow-sm"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: flipped ? 'var(--accent-border)' : 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className="font-mono-tech px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: flipped ? 'var(--sage-soft)' : 'var(--accent-soft)',
                      color: flipped ? 'var(--sage)' : 'var(--accent)',
                    }}
                  >
                    {flipped ? 'Answer / Explanation' : 'Prompt — Click to Flip'}
                  </span>
                  <span className="font-mono-tech" style={{ color: 'var(--ink-muted)' }}>
                    Page {currentCard.pageNumber}
                  </span>
                </div>

                <div
                  dir={currentCard.isRtl ? 'rtl' : 'auto'}
                  className={
                    flipped
                      ? 'text-sm leading-relaxed whitespace-pre-wrap my-6 max-h-56 overflow-y-auto'
                      : 'font-editorial text-2xl font-medium text-center my-8'
                  }
                >
                  {flipped ? currentCard.back : currentCard.front}
                </div>

                <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                  <span className="inline-flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />
                    Tap card to flip
                  </span>
                  {currentCard.chunkId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onJumpToChunkInReader(currentCard.chunkId!, currentCard.pageNumber);
                      }}
                      className="underline font-medium cursor-pointer"
                      style={{ color: 'var(--accent)' }}
                    >
                      Check Source p.{currentCard.pageNumber}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFlipped(false);
                    setCardIndex((i) => (i - 1 + flashcardDeck.length) % flashcardDeck.length);
                  }}
                  className="rounded-xl border px-4 py-2 text-xs font-medium cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  ← Previous
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMasteredCardIds((prev) => new Set(prev).add(currentCard.id));
                    setFlipped(false);
                    setCardIndex((i) => (i + 1) % flashcardDeck.length);
                  }}
                  className="rounded-xl px-5 py-2 text-xs font-medium text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--sage)' }}
                >
                  Got It · Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
