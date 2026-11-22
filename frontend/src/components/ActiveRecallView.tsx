import { useMemo, useState } from 'react';
import { ArrowRight, Brain, CheckCircle2, Eye, Sparkles } from 'lucide-react';
import type { DocumentDetailDto, StudySessionDto } from '../types/models';

interface ActiveRecallViewProps {
  projectId: string | null;
  document: DocumentDetailDto | null;
  sessions: StudySessionDto[];
  onCreateSession: (goal: string, selectedChunkIds: string[]) => Promise<StudySessionDto>;
  onSaveRecall: (sessionId: string, recallText: string) => Promise<StudySessionDto>;
  onJumpToChunkInReader: (chunkId: string) => void;
}

export function ActiveRecallView({
  projectId,
  document,
  sessions,
  onCreateSession,
  onSaveRecall,
  onJumpToChunkInReader,
}: ActiveRecallViewProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [goal, setGoal] = useState('Explain key concepts in my own words without checking notes');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<StudySessionDto | null>(null);
  const [recallText, setRecallText] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedChunks = useMemo(() => {
    if (!document) return [];
    const targetIds = activeSession?.selectedChunkIds.length
      ? activeSession.selectedChunkIds
      : selectedIds;
    if (targetIds.length === 0) return document.chunks.slice(0, 4);
    return document.chunks.filter((c) => targetIds.includes(c.id));
  }, [document, activeSession, selectedIds]);

  const toggleChunk = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (!projectId || !document) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <Brain className="h-8 w-8 mb-3" style={{ color: 'var(--sage)' }} />
        <h2 className="font-editorial text-2xl font-medium">Pick a lecture to start Active Recall</h2>
        <p className="text-xs mt-2 max-w-md" style={{ color: 'var(--ink-secondary)' }}>
          Select a lecture from the left library first, then practice recalling its main ideas
          independently before revealing AI guidance.
        </p>
      </div>
    );
  }

  const handleStartRecall = async () => {
    setBusy(true);
    try {
      const ids = selectedIds.length > 0 ? selectedIds : document.chunks.slice(0, 4).map((c) => c.id);
      const created = await onCreateSession(goal, ids);
      setActiveSession(created);
      setRecallText(created.recallText ?? '');
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitRecall = async () => {
    if (!activeSession || !recallText.trim()) return;
    setBusy(true);
    try {
      const updated = await onSaveRecall(activeSession.id, recallText.trim());
      setActiveSession(updated);
      setStep(3);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-14 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header + 3-Step Indicator */}
        <header className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div
                className="text-xs font-medium uppercase tracking-widest mb-1"
                style={{ color: 'var(--sage)' }}
              >
                3-Step Active Recall · Guided → Independent
              </div>
              <h1 className="font-editorial text-3xl font-medium" dir="auto">
                {document.title}
              </h1>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {[
                { n: 1 as const, label: '1. Scope' },
                { n: 2 as const, label: '2. Recall Board' },
                { n: 3 as const, label: '3. Compare Source' },
              ].map((s) => (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => {
                    if (s.n === 1 || activeSession) setStep(s.n);
                  }}
                  className="px-3 py-1.5 rounded-full border text-xs font-medium transition cursor-pointer"
                  style={
                    step === s.n
                      ? {
                          backgroundColor: 'var(--sage-soft)',
                          borderColor: 'var(--sage-border)',
                          color: 'var(--sage)',
                        }
                      : {
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--ink-muted)',
                        }
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Step 1: Select Scope */}
        {step === 1 && (
          <section
            className="rounded-3xl border p-6 sm:p-8 space-y-6"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div>
              <label className="block text-xs font-semibold mb-2">Today's Study Goal</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--ink-primary)',
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">
                  Choose passages to test yourself on (or leave blank for first 4)
                </span>
                <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                  {selectedIds.length} selected
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {document.chunks.map((c) => {
                  const checked = selectedIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleChunk(c.id)}
                      className="text-left rounded-xl border p-3 transition cursor-pointer"
                      style={{
                        backgroundColor: checked ? 'var(--sage-soft)' : 'var(--bg-canvas)',
                        borderColor: checked ? 'var(--sage-border)' : 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono-tech" style={{ color: 'var(--ink-muted)' }}>
                          Page {c.pageNumber} · #{c.chunkIndex}
                        </span>
                        {checked && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--sage)' }} />}
                      </div>
                      <div className="text-xs font-medium line-clamp-2" dir="auto">
                        {c.heading || c.content}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleStartRecall()}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--sage)' }}
              >
                {busy ? 'Starting session...' : 'Open Closed-Book Recall Board'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* Step 2: Closed-Book Recall Board */}
        {step === 2 && (
          <section
            className="rounded-3xl border p-6 sm:p-8 space-y-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-editorial text-2xl font-medium">
                  Write what you remember — before checking the lecture
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--ink-secondary)' }}>
                  Your original wording is saved separately in PostgreSQL so you can always see what
                  you recalled independently vs. what AI helped you fill in later.
                </p>
              </div>
              <span
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'var(--sage-soft)', color: 'var(--sage)' }}
              >
                {selectedChunks.length} passages in scope
              </span>
            </div>

            <textarea
              rows={10}
              dir="auto"
              value={recallText}
              onChange={(e) => setRecallText(e.target.value)}
              placeholder="Example: Elasticity means scaling servers up when traffic increases and scaling down when demand drops..."
              className="w-full rounded-2xl border p-4 text-sm leading-relaxed focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--ink-primary)',
              }}
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs cursor-pointer"
                style={{ color: 'var(--ink-muted)' }}
              >
                ← Change scope
              </button>

              <button
                type="button"
                disabled={busy || !recallText.trim()}
                onClick={() => void handleSubmitRecall()}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Eye className="h-4 w-4" />
                {busy ? 'Saving recall...' : 'Save Recall & Compare with Source'}
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Side-by-Side Source Verification */}
        {step === 3 && (
          <section className="grid lg:grid-cols-2 gap-5">
            <div
              className="rounded-3xl border p-6 space-y-3"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--sage-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--sage-soft)', color: 'var(--sage)' }}
                >
                  Your Independent Recall (Saved)
                </span>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[11px] underline cursor-pointer"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  Edit
                </button>
              </div>
              <p dir="auto" className="text-sm leading-relaxed whitespace-pre-wrap pt-2">
                {activeSession?.recallText || recallText}
              </p>
            </div>

            <div
              className="rounded-3xl border p-6 space-y-4"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="text-xs font-semibold" style={{ color: 'var(--ink-secondary)' }}>
                Original Source Passages ({selectedChunks.length})
              </div>
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {selectedChunks.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border p-4 space-y-2"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono-tech" style={{ color: 'var(--ink-muted)' }}>
                        Page {c.pageNumber} · Chunk #{c.chunkIndex}
                      </span>
                      <button
                        type="button"
                        onClick={() => onJumpToChunkInReader(c.id)}
                        className="inline-flex items-center gap-1 font-medium cursor-pointer"
                        style={{ color: 'var(--accent)' }}
                      >
                        <Sparkles className="h-3 w-3" />
                        Explain gap in Reader
                      </button>
                    </div>
                    <p dir="auto" className="text-xs leading-relaxed whitespace-pre-wrap">
                      {c.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recent Recall History */}
        {sessions.length > 0 && (
          <section className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
              Recent Recall History ({sessions.length})
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {sessions.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActiveSession(s);
                    setRecallText(s.recallText ?? '');
                    setStep(s.recallText ? 3 : 2);
                  }}
                  className="text-left rounded-2xl border p-4 transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-medium" style={{ color: 'var(--sage)' }}>
                      {s.recallText ? 'Recall Recorded' : 'In Progress'}
                    </span>
                    <span style={{ color: 'var(--ink-muted)' }}>
                      {new Date(s.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs font-medium truncate">
                    {s.goal || '3-Step Study Session'}
                  </div>
                  {s.recallText && (
                    <p
                      dir="auto"
                      className="text-[11px] line-clamp-2 mt-1.5"
                      style={{ color: 'var(--ink-secondary)' }}
                    >
                      {s.recallText}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
