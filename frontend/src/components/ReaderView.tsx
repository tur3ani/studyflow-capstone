import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Check,
  Copy,
  ExternalLink,
  FileSearch,
  GripVertical,
  Highlighter,
  Loader2,
  Maximize2,
  Minimize2,
  NotebookPen,
  PenLine,
  Plus,
  Save,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { useAiPreferences } from '../context/AiPreferencesContext';
import type {
  DocumentChunkDto,
  DocumentDetailDto,
  ExplainChunkRequest,
  ExplainChunkResponse,
  StudyNoteDto,
  StudySessionDto,
} from '../types/models';

export type ReaderSplitMode = 'none' | 'notes' | 'pdf';

interface GlossaryEntry {
  term: string;
  definition?: string;
  chunkId: string;
  pageNumber: number;
  fromAi?: boolean;
}

interface FloatingSelection {
  text: string;
  chunk: DocumentChunkDto;
  x: number;
  y: number;
}

type InlineManualKind = 'Manual' | 'StoryMode' | 'GlossaryTerm';

interface ReaderViewProps {
  document: DocumentDetailDto | null;
  notes: StudyNoteDto[];
  sessions: StudySessionDto[];
  selectedChunkId: string | null;
  highlightedChunkId: string | null;
  splitMode: ReaderSplitMode;
  pdfViewPage: number;
  zenMode: boolean;
  onToggleZen: () => void;
  onSelectChunk: (chunk: DocumentChunkDto) => void;
  onChangeSplitMode: (mode: ReaderSplitMode, page?: number) => void;
  onOpenPdfAtPage: (pageNumber: number) => void;
  onTriggerUpload: () => void;
  onSaveNote: (payload: {
    chunk: DocumentChunkDto;
    title: string;
    contentMarkdown: string;
    sourcePageNumber: number;
    language: string;
    sourceType?: string;
  }) => Promise<void>;
  onUpdateNote: (noteId: string, title: string, content: string, version: number) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onJumpToChunk: (chunkId: string, openPdfPage?: number) => void;
  onNotify: (message: string) => void;
}

export function ReaderView({
  document: doc,
  notes,
  sessions,
  selectedChunkId,
  highlightedChunkId,
  splitMode,
  pdfViewPage,
  zenMode,
  onToggleZen,
  onSelectChunk,
  onChangeSplitMode,
  onOpenPdfAtPage,
  onTriggerUpload,
  onSaveNote,
  onUpdateNote,
  onDeleteNote,
  onJumpToChunk,
  onNotify,
}: ReaderViewProps) {
  const { canUseAiExplain } = useAiPreferences();

  const [selectedPageFilter, setSelectedPageFilter] = useState<number | 'all'>('all');

  // Cached PDF Blob per document + fresh object URL per page jump so PDF ALWAYS starts on pressed page
  const pdfBlobRef = useRef<{ docId: string; blob: Blob } | null>(null);
  const [pdfIframeSrc, setPdfIframeSrc] = useState<string | null>(null);
  const [pdfRenderNonce, setPdfRenderNonce] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Resizable right split pane width
  const [splitPercent, setSplitPercent] = useState(44);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // --- NON-AI INLINE ANNOTATION COMPOSER (Manual Note / 1-Line Summary / Glossary Term) ---
  const [manualComposeChunkId, setManualComposeChunkId] = useState<string | null>(null);
  const [manualKind, setManualKind] = useState<InlineManualKind>('Manual');
  const [manualTitle, setManualTitle] = useState('');
  const [manualBody, setManualBody] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  // --- OPTIONAL AI EXPLANATION DRAWER (Only active if user opted into AI Explanations) ---
  const [activeExplainChunkId, setActiveExplainChunkId] = useState<string | null>(null);
  const [explainLanguage, setExplainLanguage] = useState<'ar' | 'en'>('ar');
  const [explainMode, setExplainMode] = useState<ExplainChunkRequest['mode']>('explain_concept');
  const [explainTerm, setExplainTerm] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [explanationResult, setExplanationResult] = useState<ExplainChunkResponse | null>(null);
  const [aiGlossary, setAiGlossary] = useState<GlossaryEntry[]>([]);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [justSavedAi, setJustSavedAi] = useState(false);

  // Split Notes Pane quick-create & inline edit state
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickBody, setQuickBody] = useState('');
  const [savingQuickNote, setSavingQuickNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteBody, setEditNoteBody] = useState('');
  const [notesFilter, setNotesFilter] = useState<'all' | 'highlights' | 'glossary'>('all');

  // Floating text-selection popover
  const [floatingSel, setFloatingSel] = useState<FloatingSelection | null>(null);

  const chunkRefs = useRef<Record<string, HTMLElement | null>>({});

  // Close AI explanation panel immediately if user opts out of AI mid-session
  useEffect(() => {
    if (!canUseAiExplain) {
      setActiveExplainChunkId(null);
      setExplanationResult(null);
    }
  }, [canUseAiExplain]);

  useEffect(() => {
    setSelectedPageFilter('all');
    setManualComposeChunkId(null);
    setActiveExplainChunkId(null);
    setExplanationResult(null);
    setFloatingSel(null);
    pdfBlobRef.current = null;
    setPdfIframeSrc(null);
  }, [doc?.id]);

  // Smooth scroll when jumping from a note, mind map, or Ctrl+K
  useEffect(() => {
    if (!highlightedChunkId) return;
    setSelectedPageFilter('all');
    const t = setTimeout(() => {
      chunkRefs.current[highlightedChunkId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 90);
    return () => clearTimeout(t);
  }, [highlightedChunkId, doc?.id]);

  // Load PDF blob once per document and generate a fresh object URL with #page=N every time pdfViewPage changes
  useEffect(() => {
    if (!doc || splitMode !== 'pdf') return;

    if (!doc.originalFileName.toLowerCase().endsWith('.pdf')) {
      setPdfError('Original embedded preview is only available for PDF files.');
      setPdfIframeSrc(null);
      return;
    }

    let cancelled = false;
    let createdObjectUrl: string | null = null;

    const openAtPage = (blob: Blob) => {
      createdObjectUrl = URL.createObjectURL(blob);
      const targetPage = Math.max(1, pdfViewPage);
      setPdfIframeSrc(`${createdObjectUrl}#page=${targetPage}&view=FitH`);
      setPdfRenderNonce((n) => n + 1);
      setPdfError(null);
    };

    if (pdfBlobRef.current && pdfBlobRef.current.docId === doc.id) {
      openAtPage(pdfBlobRef.current.blob);
    } else {
      setPdfLoading(true);
      setPdfError(null);
      api
        .fetchDocumentBlob(doc.id)
        .then((blob) => {
          if (cancelled) return;
          pdfBlobRef.current = { docId: doc.id, blob };
          openAtPage(blob);
        })
        .catch((err) => {
          if (!cancelled) {
            setPdfError(err instanceof Error ? err.message : 'Failed to load original PDF');
          }
        })
        .finally(() => {
          if (!cancelled) setPdfLoading(false);
        });
    }

    return () => {
      cancelled = true;
      if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
    };
  }, [doc?.id, doc?.originalFileName, splitMode, pdfViewPage]);

  // Drag-to-resize split pane
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const fromRight = rect.right - e.clientX;
      setSplitPercent(Math.min(64, Math.max(28, (fromRight / rect.width) * 100)));
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-selection-toolbar="true"]')) {
        setFloatingSel(null);
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, []);

  // --- Non-AI Actions ---
  const openManualComposer = (
    chunk: DocumentChunkDto,
    kind: InlineManualKind = 'Manual',
    prefillTermOrQuote?: string
  ) => {
    onSelectChunk(chunk);
    setActiveExplainChunkId(null);
    setManualComposeChunkId(chunk.id);
    setManualKind(kind);
    setFloatingSel(null);

    if (kind === 'GlossaryTerm') {
      setManualTitle(prefillTermOrQuote ?? '');
      setManualBody('');
    } else if (kind === 'StoryMode') {
      setManualTitle(`1-Line Summary · Page ${chunk.pageNumber}`);
      setManualBody('');
    } else {
      setManualTitle(
        prefillTermOrQuote
          ? `${prefillTermOrQuote.slice(0, 48)} (p.${chunk.pageNumber})`
          : `${chunk.heading || `Page ${chunk.pageNumber}`} — Note`
      );
      setManualBody(prefillTermOrQuote ? `> "${prefillTermOrQuote}"\n\n` : '');
    }
  };

  const handleQuickHighlight = async (chunk: DocumentChunkDto, selectedQuote?: string) => {
    setFloatingSel(null);
    const quoteText = selectedQuote?.trim() || chunk.content.slice(0, 260).trim();
    const title = selectedQuote
      ? `Highlight: ${selectedQuote.slice(0, 48)}`
      : `Highlight · ${chunk.heading || `Page ${chunk.pageNumber}`}`;

    await onSaveNote({
      chunk,
      title,
      contentMarkdown: `> ${quoteText}`,
      sourcePageNumber: chunk.pageNumber,
      language: /[\u0600-\u06FF]/.test(quoteText) ? 'ar' : 'en',
      sourceType: 'Highlight',
    });
  };

  // --- Optional AI Explanation Action ---
  const runExplain = useCallback(
    async (
      chunk: DocumentChunkDto,
      lang: 'ar' | 'en',
      mode: ExplainChunkRequest['mode'],
      term?: string
    ) => {
      onSelectChunk(chunk);
      setManualComposeChunkId(null);
      setActiveExplainChunkId(chunk.id);
      setExplainLanguage(lang);
      setExplainMode(mode);
      setExplainTerm(term ?? '');
      setExplaining(true);
      setJustSavedAi(false);
      setFloatingSel(null);

      try {
        const res = await api.explainChunk(chunk.id, {
          targetLanguage: lang,
          mode,
          selectedTerm: term?.trim() || undefined,
        });
        setExplanationResult(res);
        setDraftTitle(res.suggestedNoteTitle);
        setDraftContent(res.explanation);

        if (res.keyTerms.length > 0) {
          setAiGlossary((prev) => {
            const existing = new Set(prev.map((g) => g.term.toLowerCase()));
            const additions: GlossaryEntry[] = [];
            for (const t of res.keyTerms) {
              if (!existing.has(t.toLowerCase())) {
                existing.add(t.toLowerCase());
                additions.push({
                  term: t,
                  chunkId: chunk.id,
                  pageNumber: chunk.pageNumber,
                  fromAi: true,
                });
              }
            }
            return [...additions, ...prev].slice(0, 12);
          });
        }
      } catch (err) {
        onNotify(err instanceof Error ? err.message : 'Optional AI explanation failed.');
      } finally {
        setExplaining(false);
      }
    },
    [onSelectChunk, onNotify]
  );

  const activeChunk = useMemo(
    () => doc?.chunks.find((c) => c.id === selectedChunkId) ?? doc?.chunks[0] ?? null,
    [doc, selectedChunkId]
  );

  const docNotes = useMemo(
    () => notes.filter((n) => !doc || n.documentId === doc.id),
    [notes, doc]
  );

  const filteredSplitNotes = useMemo(() => {
    if (notesFilter === 'highlights') return docNotes.filter((n) => n.sourceType === 'Highlight');
    if (notesFilter === 'glossary') return docNotes.filter((n) => n.sourceType === 'GlossaryTerm');
    return docNotes;
  }, [docNotes, notesFilter]);

  const highlightedChunkIds = useMemo(
    () =>
      new Set(
        docNotes
          .filter((n) => n.sourceType === 'Highlight' && n.chunkId)
          .map((n) => n.chunkId!)
      ),
    [docNotes]
  );

  const notedChunkIds = useMemo(
    () =>
      new Set(
        docNotes
          .filter((n) => n.sourceType !== 'Highlight' && n.chunkId)
          .map((n) => n.chunkId!)
      ),
    [docNotes]
  );

  // Glossary Ribbon combines persisted student-authored GlossaryTerm notes (100% Non-AI) + optional AI terms
  const glossaryEntries = useMemo<GlossaryEntry[]>(() => {
    const manualTerms: GlossaryEntry[] = docNotes
      .filter((n) => n.sourceType === 'GlossaryTerm' && n.chunkId)
      .map((n) => ({
        term: n.title,
        definition: n.contentMarkdown,
        chunkId: n.chunkId!,
        pageNumber: n.sourcePageNumber ?? 1,
        fromAi: false,
      }));

    if (!canUseAiExplain) return manualTerms;

    const seen = new Set(manualTerms.map((g) => g.term.toLowerCase()));
    const combined = [...manualTerms];
    for (const item of aiGlossary) {
      if (!seen.has(item.term.toLowerCase())) {
        seen.add(item.term.toLowerCase());
        combined.push(item);
      }
    }
    return combined;
  }, [docNotes, aiGlossary, canUseAiExplain]);

  const recalledChunkIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      if (s.documentId === doc?.id && s.recallText?.trim()) {
        for (const id of s.selectedChunkIds) set.add(id);
      }
    }
    return set;
  }, [sessions, doc?.id]);

  const availablePages = useMemo(() => {
    if (!doc) return [];
    return Array.from(new Set(doc.chunks.map((c) => c.pageNumber))).sort((a, b) => a - b);
  }, [doc]);

  const visibleChunks = useMemo(() => {
    if (!doc) return [];
    return selectedPageFilter === 'all'
      ? doc.chunks
      : doc.chunks.filter((c) => c.pageNumber === selectedPageFilter);
  }, [doc, selectedPageFilter]);

  const studyStats = useMemo(() => {
    const total = doc?.chunks.length ?? 0;
    const highlighted = highlightedChunkIds.size;
    const noted = notedChunkIds.size;
    const recalled = recalledChunkIds.size;
    const touched = new Set([...highlightedChunkIds, ...notedChunkIds, ...recalledChunkIds]).size;
    return {
      total,
      highlighted,
      noted,
      recalled,
      pct: total > 0 ? Math.round((touched / total) * 100) : 0,
    };
  }, [doc?.chunks.length, highlightedChunkIds, notedChunkIds, recalledChunkIds]);

  const handlePassageMouseUp = (chunk: DocumentChunkDto) => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!sel || !text || text.length < 2 || text.length > 140) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    setFloatingSel({
      text,
      chunk,
      x: Math.min(window.innerWidth - 260, Math.max(24, rect.left + rect.width / 2)),
      y: Math.max(64, rect.top - 50),
    });
  };

  if (!doc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <div
          className="h-14 w-14 rounded-2xl border flex items-center justify-center mb-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--accent)',
          }}
        >
          <FileSearch className="h-6 w-6" />
        </div>
        <h2 className="font-editorial text-2xl font-medium">No lecture open yet</h2>
        <p className="text-xs mt-2 max-w-md leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
          Import a PDF lecture or pick one from the sidebar to read, highlight, build your own
          glossary & margin notes, and compare directly with the original PDF.
        </p>
        <button
          type="button"
          onClick={onTriggerUpload}
          className="mt-5 rounded-xl px-4 py-2 text-xs font-medium text-white cursor-pointer"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Import Lecture PDF
        </button>
      </div>
    );
  }

  const currentContextPage =
    selectedPageFilter !== 'all' ? selectedPageFilter : (activeChunk?.pageNumber ?? 1);

  return (
    <div ref={splitContainerRef} className="flex-1 flex min-h-0 overflow-hidden relative">
      {/* Floating Text-Selection Toolbar: Non-AI Study Actions First + Optional Ask AI */}
      {floatingSel && (
        <div
          data-selection-toolbar="true"
          className="fixed z-40 -translate-x-1/2 flex items-center gap-0.5 rounded-full border px-2 py-1.5 shadow-xl"
          style={{
            left: `${floatingSel.x}px`,
            top: `${floatingSel.y}px`,
            backgroundColor: 'var(--ink-primary)',
            color: 'var(--bg-canvas)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <button
            type="button"
            onClick={() => void handleQuickHighlight(floatingSel.chunk, floatingSel.text)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium hover:opacity-85 cursor-pointer"
          >
            <Highlighter className="h-3 w-3" style={{ color: '#f59e0b' }} />
            Highlight
          </button>

          <span className="opacity-25">|</span>

          <button
            type="button"
            onClick={() => openManualComposer(floatingSel.chunk, 'Manual', floatingSel.text)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium hover:opacity-85 cursor-pointer"
          >
            <PenLine className="h-3 w-3" />
            Note
          </button>

          <span className="opacity-25">|</span>

          <button
            type="button"
            onClick={() => openManualComposer(floatingSel.chunk, 'GlossaryTerm', floatingSel.text)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium hover:opacity-85 cursor-pointer"
          >
            <Tag className="h-3 w-3" />
            Define
          </button>

          {canUseAiExplain && (
            <>
              <span className="opacity-25">|</span>
              <button
                type="button"
                onClick={() =>
                  void runExplain(floatingSel.chunk, 'ar', 'explain_term', floatingSel.text)
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium hover:opacity-85 cursor-pointer"
                style={{ color: '#93c5fd' }}
              >
                <Sparkles className="h-3 w-3" />
                Ask AI
              </button>
            </>
          )}

          <span className="opacity-25">|</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(floatingSel.text);
              setFloatingSel(null);
              onNotify('Copied quote to clipboard');
            }}
            className="p-1.5 rounded-full hover:opacity-85 cursor-pointer"
            title="Copy selected text"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Zen Mode Floating Exit */}
      {zenMode && (
        <button
          type="button"
          onClick={onToggleZen}
          className="fixed top-4 right-5 z-40 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-md cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
            color: 'var(--ink-primary)',
          }}
        >
          <Minimize2 className="h-3.5 w-3.5" />
          Exit Zen Desk
        </button>
      )}

      {/* Primary Reading Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!zenMode && (
          <div
            className="px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-3"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* Non-AI Study Progress Meter */}
            <div className="flex items-center gap-3 text-[11px]">
              <span className="font-medium" style={{ color: 'var(--ink-secondary)' }}>
                Study Progress
              </span>
              <div
                className="w-20 h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-hover)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(4, studyStats.pct)}%`,
                    backgroundColor: studyStats.recalled > 0 ? 'var(--sage)' : 'var(--accent)',
                  }}
                />
              </div>
              <div className="hidden xl:flex items-center gap-2" style={{ color: 'var(--ink-muted)' }}>
                <span>{studyStats.highlighted} Highlights</span>
                <span>·</span>
                <span>{studyStats.noted} Notes</span>
                <span>·</span>
                <span>{studyStats.recalled} Recalled</span>
              </div>
            </div>

            {/* Right Controls: Page filter + 3-way Split Switcher (Single / Split Notes / PDF p.N) + Zen */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedPageFilter}
                onChange={(e) =>
                  setSelectedPageFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="rounded-lg border px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--ink-primary)',
                }}
              >
                <option value="all">All Pages ({doc.pageCount})</option>
                {availablePages.map((p) => (
                  <option key={p} value={p}>
                    Page {p}
                  </option>
                ))}
              </select>

              <div
                className="inline-flex items-center rounded-xl border p-0.5 text-xs"
                style={{
                  backgroundColor: 'var(--bg-sidebar)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => onChangeSplitMode('none')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer"
                  style={
                    splitMode === 'none'
                      ? { backgroundColor: 'var(--bg-surface)', color: 'var(--ink-primary)' }
                      : { color: 'var(--ink-muted)' }
                  }
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSplitMode(splitMode === 'notes' ? 'none' : 'notes')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer"
                  style={
                    splitMode === 'notes'
                      ? { backgroundColor: 'var(--bg-surface)', color: 'var(--accent)' }
                      : { color: 'var(--ink-secondary)' }
                  }
                >
                  <NotebookPen className="h-3 w-3" />
                  Split Notes ({docNotes.length})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    splitMode === 'pdf'
                      ? onChangeSplitMode('none')
                      : onOpenPdfAtPage(currentContextPage)
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer"
                  style={
                    splitMode === 'pdf'
                      ? { backgroundColor: 'var(--bg-surface)', color: 'var(--accent)' }
                      : { color: 'var(--ink-secondary)' }
                  }
                >
                  <FileSearch className="h-3 w-3" />
                  PDF p.{splitMode === 'pdf' ? pdfViewPage : currentContextPage}
                </button>
              </div>

              <button
                type="button"
                onClick={onToggleZen}
                title="Zen Focus Mode"
                className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--ink-secondary)',
                }}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Zen
              </button>
            </div>
          </div>
        )}

        {/* Editorial Document Flow */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-12 py-9">
          <article className="max-w-[740px] mx-auto">
            <header className="mb-8 pb-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--ink-muted)' }}>
                <span>{doc.originalFileName}</span>
                <span>·</span>
                <span>{doc.pageCount} pages</span>
                <span>·</span>
                <span>{doc.chunks.length} passages</span>
              </div>
              <h1 className="font-editorial text-3xl sm:text-4xl font-medium leading-tight" dir="auto">
                {doc.title}
              </h1>

              {/* Persisted Student Glossary Ribbon (Non-AI First) */}
              {glossaryEntries.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium mr-1"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    <Tag className="h-3 w-3" />
                    Glossary:
                  </span>
                  {glossaryEntries.map((item) => (
                    <button
                      key={`${item.term}-${item.chunkId}`}
                      type="button"
                      title={item.definition || `Jump to Page ${item.pageNumber}`}
                      onClick={() =>
                        chunkRefs.current[item.chunkId]?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                        })
                      }
                      className="font-mono-tech text-[11px] px-2 py-0.5 rounded-md border transition cursor-pointer hover:opacity-80"
                      style={{
                        backgroundColor: item.fromAi ? 'var(--accent-soft)' : 'var(--sage-soft)',
                        borderColor: item.fromAi ? 'var(--accent-border)' : 'var(--sage-border)',
                        color: item.fromAi ? 'var(--accent)' : 'var(--sage)',
                      }}
                    >
                      {item.term} · p.{item.pageNumber}
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-4 text-xs" style={{ color: 'var(--ink-muted)' }}>
                Select any text to <strong>Highlight</strong>, <strong>Add Note</strong>, or{' '}
                <strong>Define Term</strong> in your own words
                {canUseAiExplain ? ' — or use optional Ask AI when you want a second perspective.' : '.'}
              </p>
            </header>

            {doc.status === 'Failed' && (
              <div
                className="mb-6 rounded-2xl border p-4 text-xs flex items-start gap-2.5"
                style={{
                  backgroundColor: 'var(--danger-soft)',
                  borderColor: 'var(--danger)',
                  color: 'var(--danger)',
                }}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Extraction failed</div>
                  <p className="mt-1 opacity-90">{doc.errorMessage}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {visibleChunks.map((chunk, idx) => {
                const prevPage = idx > 0 ? visibleChunks[idx - 1].pageNumber : null;
                const showPageDivider = prevPage !== chunk.pageNumber;
                const isHighlightedTarget = chunk.id === highlightedChunkId;
                const isSelected = chunk.id === selectedChunkId;
                const isManualOpen = manualComposeChunkId === chunk.id;
                const isExplainOpen = canUseAiExplain && activeExplainChunkId === chunk.id;

                const isRecalled = recalledChunkIds.has(chunk.id);
                const isNoted = notedChunkIds.has(chunk.id);
                const hasHighlight = highlightedChunkIds.has(chunk.id);

                const stageDotColor = isRecalled
                  ? 'var(--sage)'
                  : isNoted
                    ? 'var(--accent)'
                    : hasHighlight
                      ? 'var(--warm)'
                      : 'var(--border-strong)';

                const stageLabel = isRecalled
                  ? 'Recalled'
                  : isNoted
                    ? 'Noted'
                    : hasHighlight
                      ? 'Highlighted'
                      : null;

                return (
                  <div key={chunk.id}>
                    {showPageDivider && (
                      <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                        <button
                          type="button"
                          onClick={() => onOpenPdfAtPage(chunk.pageNumber)}
                          title={`Open original PDF starting at Page ${chunk.pageNumber}`}
                          className="font-mono-tech text-[11px] px-2.5 py-0.5 rounded-full border transition cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--ink-muted)',
                          }}
                        >
                          Page {chunk.pageNumber} · Open PDF
                        </button>
                        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                      </div>
                    )}

                    <section
                      ref={(el) => {
                        chunkRefs.current[chunk.id] = el;
                      }}
                      onClick={() => onSelectChunk(chunk)}
                      onMouseUp={() => handlePassageMouseUp(chunk)}
                      className={`group relative rounded-2xl px-5 py-4 border transition ${
                        isHighlightedTarget ? 'citation-pulse' : ''
                      }`}
                      style={{
                        backgroundColor:
                          isHighlightedTarget || isManualOpen || isExplainOpen || isSelected
                            ? 'var(--bg-surface)'
                            : hasHighlight
                              ? 'var(--warm-soft)'
                              : 'transparent',
                        borderColor: isHighlightedTarget
                          ? 'var(--warm)'
                          : isManualOpen || isExplainOpen || isSelected
                            ? 'var(--border-strong)'
                            : hasHighlight
                              ? 'var(--warm-border)'
                              : 'transparent',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 min-h-[24px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: stageDotColor }}
                          />
                          {chunk.heading && (
                            <h3
                              className="text-xs font-semibold truncate"
                              dir="auto"
                              style={{ color: 'var(--ink-secondary)' }}
                            >
                              {chunk.heading}
                            </h3>
                          )}
                          {stageLabel && (
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: 'var(--bg-elevated)',
                                color: stageDotColor,
                              }}
                            >
                              {stageLabel}
                            </span>
                          )}
                          {chunk.needsOcr && (
                            <span
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'var(--warm-soft)', color: 'var(--warm)' }}
                            >
                              Image Page
                            </span>
                          )}
                        </div>

                        {/* Whisper-quiet Hover Actions: Non-AI Primary + Optional AI */}
                        <div
                          className={`flex items-center gap-1 transition-opacity ${
                            isManualOpen || isExplainOpen || isSelected
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openManualComposer(chunk, 'Manual');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-white cursor-pointer"
                            style={{ backgroundColor: 'var(--accent)' }}
                          >
                            <PenLine className="h-3 w-3" />
                            Add Note
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleQuickHighlight(chunk);
                            }}
                            title="Highlight this passage"
                            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium cursor-pointer"
                            style={{
                              backgroundColor: 'var(--bg-elevated)',
                              borderColor: 'var(--border-subtle)',
                              color: hasHighlight ? 'var(--warm)' : 'var(--ink-secondary)',
                            }}
                          >
                            <Highlighter className="h-3 w-3" />
                            {hasHighlight ? 'Marked' : 'Highlight'}
                          </button>

                          {canUseAiExplain && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void runExplain(chunk, 'ar', 'explain_concept');
                              }}
                              title="Optional AI explanation"
                              className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium cursor-pointer"
                              style={{
                                backgroundColor: 'var(--accent-soft)',
                                borderColor: 'var(--accent-border)',
                                color: 'var(--accent)',
                              }}
                            >
                              <Sparkles className="h-3 w-3" />
                              Ask AI
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectChunk(chunk);
                              onOpenPdfAtPage(chunk.pageNumber);
                            }}
                            title={`Open original PDF directly at Page ${chunk.pageNumber}`}
                            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] cursor-pointer"
                            style={{
                              backgroundColor: 'var(--bg-elevated)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--ink-muted)',
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                            p.{chunk.pageNumber}
                          </button>
                        </div>
                      </div>

                      <p
                        dir="auto"
                        className="text-[15px] leading-[1.82] whitespace-pre-wrap select-text"
                        style={{ color: 'var(--ink-primary)' }}
                      >
                        {chunk.content}
                      </p>

                      {/* PRIMARY NON-AI INLINE ANNOTATION COMPOSER */}
                      {isManualOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-5 rounded-2xl border p-4 sm:p-5 space-y-3"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-strong)',
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {(
                                [
                                  ['Manual', 'Margin Note'],
                                  ['StoryMode', '1-Line Summary'],
                                  ['GlossaryTerm', 'Glossary Term'],
                                ] as const
                              ).map(([kind, label]) => (
                                <button
                                  key={kind}
                                  type="button"
                                  onClick={() => setManualKind(kind)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer"
                                  style={
                                    manualKind === kind
                                      ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                                      : {
                                          backgroundColor: 'var(--bg-surface)',
                                          color: 'var(--ink-secondary)',
                                        }
                                  }
                                >
                                  {label}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => setManualComposeChunkId(null)}
                              className="p-1 rounded-lg cursor-pointer"
                              style={{ color: 'var(--ink-muted)' }}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <input
                            type="text"
                            dir="auto"
                            value={manualTitle}
                            onChange={(e) => setManualTitle(e.target.value)}
                            placeholder={
                              manualKind === 'GlossaryTerm'
                                ? 'Technical term (e.g. Elasticity)'
                                : 'Note title...'
                            }
                            className="w-full rounded-xl border px-3 py-2 text-xs font-semibold focus:outline-none"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--ink-primary)',
                            }}
                          />

                          <textarea
                            rows={manualKind === 'StoryMode' ? 2 : 5}
                            dir="auto"
                            value={manualBody}
                            onChange={(e) => setManualBody(e.target.value)}
                            placeholder={
                              manualKind === 'GlossaryTerm'
                                ? 'Write your definition in Arabic or English...'
                                : manualKind === 'StoryMode'
                                  ? 'Summarize this paragraph in one clear sentence...'
                                  : 'Write your own explanation, takeaways, or exam cues...'
                            }
                            className="w-full rounded-xl border p-3 text-xs leading-relaxed focus:outline-none resize-y"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--ink-primary)',
                            }}
                          />

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                              Anchored to Page {chunk.pageNumber} · Chunk #{chunk.chunkIndex}
                            </span>

                            <button
                              type="button"
                              disabled={savingManual || !manualTitle.trim() || !manualBody.trim()}
                              onClick={async () => {
                                setSavingManual(true);
                                try {
                                  await onSaveNote({
                                    chunk,
                                    title: manualTitle.trim(),
                                    contentMarkdown: manualBody.trim(),
                                    sourcePageNumber: chunk.pageNumber,
                                    language: /[\u0600-\u06FF]/.test(manualBody) ? 'ar' : 'en',
                                    sourceType: manualKind,
                                  });
                                  setManualComposeChunkId(null);
                                  setManualBody('');
                                } finally {
                                  setSavingManual(false);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium text-white cursor-pointer disabled:opacity-45"
                              style={{ backgroundColor: 'var(--sage)' }}
                            >
                              <Bookmark className="h-3.5 w-3.5" />
                              {savingManual
                                ? 'Saving...'
                                : manualKind === 'GlossaryTerm'
                                  ? 'Save to Glossary & Notes'
                                  : 'Save Note'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* OPTIONAL AI EXPLANATION CARD (Rendered ONLY when user opted into AI Explanations) */}
                      {isExplainOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-5 rounded-2xl border p-4 sm:p-5 space-y-3.5"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--accent-border)',
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider mr-1"
                                style={{ color: 'var(--accent)' }}
                              >
                                <Sparkles className="h-3 w-3" />
                                Optional AI
                              </span>
                              {(
                                [
                                  ['explain_concept', 'Concept'],
                                  ['explain_term', 'Term'],
                                  ['example', 'Example'],
                                  ['story_mode', 'Story 1-Line'],
                                ] as const
                              ).map(([modeKey, label]) => (
                                <button
                                  key={modeKey}
                                  type="button"
                                  onClick={() =>
                                    void runExplain(chunk, explainLanguage, modeKey, explainTerm)
                                  }
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer"
                                  style={
                                    explainMode === modeKey
                                      ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                                      : {
                                          backgroundColor: 'var(--bg-surface)',
                                          color: 'var(--ink-secondary)',
                                        }
                                  }
                                >
                                  {label}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  void runExplain(
                                    chunk,
                                    explainLanguage === 'ar' ? 'en' : 'ar',
                                    explainMode,
                                    explainTerm
                                  )
                                }
                                className="px-2 py-1 rounded-lg border text-[11px] font-medium cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--bg-surface)',
                                  borderColor: 'var(--border-subtle)',
                                  color: 'var(--ink-primary)',
                                }}
                              >
                                {explainLanguage === 'ar' ? 'Switch to EN' : 'التبديل للعربية'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveExplainChunkId(null)}
                                className="p-1 rounded-lg cursor-pointer"
                                style={{ color: 'var(--ink-muted)' }}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {explaining ? (
                            <div
                              className="py-8 flex items-center justify-center gap-2 text-xs"
                              style={{ color: 'var(--ink-secondary)' }}
                            >
                              <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} />
                              Generating optional AI explanation for Page {chunk.pageNumber}...
                            </div>
                          ) : (
                            explanationResult && (
                              <div className="space-y-3">
                                {explanationResult.keyTerms.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {explanationResult.keyTerms.map((term) => (
                                      <span
                                        key={term}
                                        className="font-mono-tech text-[11px] px-2 py-0.5 rounded-md border"
                                        style={{
                                          backgroundColor: 'var(--accent-soft)',
                                          borderColor: 'var(--accent-border)',
                                          color: 'var(--accent)',
                                        }}
                                      >
                                        {term}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <input
                                  type="text"
                                  dir={explanationResult.targetLanguage === 'ar' ? 'rtl' : 'ltr'}
                                  value={draftTitle}
                                  onChange={(e) => {
                                    setDraftTitle(e.target.value);
                                    setJustSavedAi(false);
                                  }}
                                  className="w-full rounded-xl border px-3 py-2 text-xs font-semibold focus:outline-none"
                                  style={{
                                    backgroundColor: 'var(--bg-surface)',
                                    borderColor: 'var(--border-subtle)',
                                    color: 'var(--ink-primary)',
                                  }}
                                />

                                <textarea
                                  rows={7}
                                  dir={explanationResult.targetLanguage === 'ar' ? 'rtl' : 'ltr'}
                                  value={draftContent}
                                  onChange={(e) => {
                                    setDraftContent(e.target.value);
                                    setJustSavedAi(false);
                                  }}
                                  className="w-full rounded-xl border p-3 text-xs leading-relaxed focus:outline-none resize-y"
                                  style={{
                                    backgroundColor: 'var(--bg-surface)',
                                    borderColor: 'var(--border-subtle)',
                                    color: 'var(--ink-primary)',
                                  }}
                                />

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                  <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                                    Edit into your own words before keeping
                                  </span>

                                  <button
                                    type="button"
                                    disabled={savingDraft}
                                    onClick={async () => {
                                      setSavingDraft(true);
                                      try {
                                        await onSaveNote({
                                          chunk,
                                          title: draftTitle.trim() || explanationResult.suggestedNoteTitle,
                                          contentMarkdown: draftContent,
                                          sourcePageNumber: explanationResult.sourcePageNumber,
                                          language: explanationResult.targetLanguage,
                                          sourceType: 'AiExplanationEdited',
                                        });
                                        setJustSavedAi(true);
                                      } finally {
                                        setSavingDraft(false);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium text-white transition cursor-pointer disabled:opacity-50"
                                    style={{
                                      backgroundColor: justSavedAi ? 'var(--sage)' : 'var(--accent)',
                                    }}
                                  >
                                    {justSavedAi ? (
                                      <>
                                        <Check className="h-3.5 w-3.5" />
                                        Saved to Notes
                                      </>
                                    ) : (
                                      <>
                                        <BookmarkCheck className="h-3.5 w-3.5" />
                                        {savingDraft ? 'Saving...' : 'Keep in Notes'}
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </section>
                  </div>
                );
              })}
            </div>
          </article>
        </div>
      </div>

      {/* Resizable Divider + Right Split Pane (Notes OR Original PDF) */}
      {splitMode !== 'none' && (
        <>
          <div
            onMouseDown={() => {
              draggingRef.current = true;
              document.body.style.cursor = 'col-resize';
            }}
            title="Drag to resize split pane"
            className="w-2 shrink-0 flex items-center justify-center cursor-col-resize border-x transition hover:opacity-100 opacity-70"
            style={{
              backgroundColor: 'var(--bg-sidebar)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--ink-muted)',
            }}
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* SPLIT MODE A: LIVE NOTES PANEL ALONGSIDE STUDY READER */}
          {splitMode === 'notes' && (
            <section
              className="shrink-0 flex flex-col overflow-hidden"
              style={{
                width: `${splitPercent}%`,
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div
                className="px-4 py-2.5 border-b flex items-center justify-between gap-2"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <NotebookPen className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                  <span>Lecture Notes ({docNotes.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickNote((v) => !v);
                      setQuickTitle(
                        activeChunk
                          ? `${activeChunk.heading || `Page ${activeChunk.pageNumber}`} — Note`
                          : 'Study Note'
                      );
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <Plus className="h-3 w-3" />
                    New Note
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeSplitMode('none')}
                    className="p-1 rounded-lg cursor-pointer"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Filter strip for All / Highlights / Glossary */}
              <div
                className="px-4 py-2 border-b flex items-center gap-1.5"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
              >
                {(
                  [
                    ['all', 'All'],
                    ['highlights', 'Highlights'],
                    ['glossary', 'Glossary'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setNotesFilter(k)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer"
                    style={
                      notesFilter === k
                        ? { backgroundColor: 'var(--bg-surface)', color: 'var(--ink-primary)' }
                        : { color: 'var(--ink-muted)' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {showQuickNote && activeChunk && (
                  <div
                    className="rounded-2xl border p-3.5 space-y-2.5"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--accent-border)',
                    }}
                  >
                    <div className="text-[11px] font-mono-tech" style={{ color: 'var(--accent)' }}>
                      Anchored to Page {activeChunk.pageNumber} · Chunk #{activeChunk.chunkIndex}
                    </div>
                    <input
                      type="text"
                      dir="auto"
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      placeholder="Note title..."
                      className="w-full rounded-xl border px-3 py-1.5 text-xs font-medium focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--ink-primary)',
                      }}
                    />
                    <textarea
                      rows={4}
                      dir="auto"
                      value={quickBody}
                      onChange={(e) => setQuickBody(e.target.value)}
                      placeholder="Write your takeaway in Arabic or English..."
                      className="w-full rounded-xl border p-2.5 text-xs leading-relaxed focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--ink-primary)',
                      }}
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowQuickNote(false)}
                        className="rounded-lg px-3 py-1.5 text-[11px] cursor-pointer"
                        style={{ color: 'var(--ink-muted)' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingQuickNote || !quickTitle.trim() || !quickBody.trim()}
                        onClick={async () => {
                          setSavingQuickNote(true);
                          try {
                            await onSaveNote({
                              chunk: activeChunk,
                              title: quickTitle.trim(),
                              contentMarkdown: quickBody.trim(),
                              sourcePageNumber: activeChunk.pageNumber,
                              language: /[\u0600-\u06FF]/.test(quickBody) ? 'ar' : 'en',
                              sourceType: 'Manual',
                            });
                            setQuickBody('');
                            setShowQuickNote(false);
                          } finally {
                            setSavingQuickNote(false);
                          }
                        }}
                        className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-white cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: 'var(--sage)' }}
                      >
                        {savingQuickNote ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                  </div>
                )}

                {filteredSplitNotes.length === 0 ? (
                  <div
                    className="rounded-2xl border border-dashed p-6 text-center text-xs mt-4"
                    style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-muted)' }}
                  >
                    No entries here yet. Highlight text, click <strong>Add Note</strong> on any
                    passage, or click <strong>New Note</strong> above.
                  </div>
                ) : (
                  filteredSplitNotes.map((note) => {
                    const isEditing = editingNoteId === note.id;
                    return (
                      <div
                        key={note.id}
                        className="rounded-2xl border p-3.5 space-y-2"
                        style={{
                          backgroundColor: 'var(--bg-canvas)',
                          borderColor:
                            note.sourceType === 'Highlight'
                              ? 'var(--warm-border)'
                              : 'var(--border-subtle)',
                        }}
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              dir={note.language === 'ar' ? 'rtl' : 'auto'}
                              value={editNoteTitle}
                              onChange={(e) => setEditNoteTitle(e.target.value)}
                              className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--ink-primary)',
                              }}
                            />
                            <textarea
                              rows={6}
                              dir={note.language === 'ar' ? 'rtl' : 'auto'}
                              value={editNoteBody}
                              onChange={(e) => setEditNoteBody(e.target.value)}
                              className="w-full rounded-lg border p-2.5 text-xs leading-relaxed focus:outline-none"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--ink-primary)',
                              }}
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingNoteId(null)}
                                className="px-2.5 py-1 text-[11px] cursor-pointer"
                                style={{ color: 'var(--ink-muted)' }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await onUpdateNote(
                                    note.id,
                                    editNoteTitle.trim(),
                                    editNoteBody,
                                    note.version
                                  );
                                  setEditingNoteId(null);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-[11px] font-medium text-white cursor-pointer"
                                style={{ backgroundColor: 'var(--accent)' }}
                              >
                                <Save className="h-3 w-3" />
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditNoteTitle(note.title);
                                  setEditNoteBody(note.contentMarkdown);
                                }}
                                dir={note.language === 'ar' ? 'rtl' : 'auto'}
                                className="text-left text-xs font-semibold flex-1 cursor-pointer hover:underline"
                              >
                                {note.title}
                              </button>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                                style={{
                                  backgroundColor: 'var(--bg-elevated)',
                                  color: 'var(--ink-muted)',
                                }}
                              >
                                {note.sourceType === 'Highlight'
                                  ? 'Highlight'
                                  : note.sourceType === 'GlossaryTerm'
                                    ? 'Glossary'
                                    : note.sourceType === 'StoryMode'
                                      ? 'Summary'
                                      : 'Note'}
                              </span>
                              <button
                                type="button"
                                onClick={() => void onDeleteNote(note.id)}
                                className="p-1 rounded cursor-pointer opacity-60 hover:opacity-100"
                                style={{ color: 'var(--ink-muted)' }}
                                title="Delete note"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                            <p
                              dir={note.language === 'ar' ? 'rtl' : 'auto'}
                              className="text-xs leading-relaxed whitespace-pre-wrap"
                              style={{ color: 'var(--ink-secondary)' }}
                            >
                              {note.contentMarkdown}
                            </p>

                            <div
                              className="pt-2 border-t flex items-center justify-between text-[11px]"
                              style={{ borderColor: 'var(--border-subtle)' }}
                            >
                              {note.chunkId ? (
                                <button
                                  type="button"
                                  onClick={() => onJumpToChunk(note.chunkId!)}
                                  className="inline-flex items-center gap-1 font-medium cursor-pointer"
                                  style={{ color: 'var(--accent)' }}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Page {note.sourcePageNumber ?? 1}
                                  {note.chunkIndex ? ` · #${note.chunkIndex}` : ''}
                                </button>
                              ) : (
                                <span style={{ color: 'var(--ink-muted)' }}>General</span>
                              )}

                              {note.sourcePageNumber && (
                                <button
                                  type="button"
                                  onClick={() => onOpenPdfAtPage(note.sourcePageNumber!)}
                                  className="font-mono-tech text-[10px] underline cursor-pointer"
                                  style={{ color: 'var(--ink-muted)' }}
                                >
                                  PDF p.{note.sourcePageNumber}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {/* SPLIT MODE B: ORIGINAL PDF AT EXACT PRESSED PAGE */}
          {splitMode === 'pdf' && (
            <section
              className="shrink-0 flex flex-col"
              style={{
                width: `${splitPercent}%`,
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div
                className="px-4 py-2.5 border-b flex items-center justify-between gap-2 text-xs"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Original PDF</span>
                  <span
                    className="font-mono-tech text-[11px] px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    Page {pdfViewPage} / {doc.pageCount}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pdfViewPage <= 1}
                    onClick={() => onOpenPdfAtPage(Math.max(1, pdfViewPage - 1))}
                    className="px-2 py-0.5 rounded border text-[11px] cursor-pointer disabled:opacity-40"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={pdfViewPage >= doc.pageCount}
                    onClick={() => onOpenPdfAtPage(Math.min(doc.pageCount, pdfViewPage + 1))}
                    className="px-2 py-0.5 rounded border text-[11px] cursor-pointer disabled:opacity-40"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeSplitMode('none')}
                    className="p-1 rounded-lg cursor-pointer ml-1"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 relative" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                {pdfLoading && (
                  <div
                    className="absolute inset-0 flex items-center justify-center text-xs gap-2"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening Page {pdfViewPage}...
                  </div>
                )}
                {pdfError && (
                  <div className="p-6 text-xs" style={{ color: 'var(--warm)' }}>
                    {pdfError}
                  </div>
                )}
                {pdfIframeSrc && !pdfError && (
                  <iframe
                    key={`${doc.id}-p${pdfViewPage}-${pdfRenderNonce}`}
                    src={pdfIframeSrc}
                    title={`${doc.title} — Page ${pdfViewPage}`}
                    className="w-full h-full border-0"
                  />
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
