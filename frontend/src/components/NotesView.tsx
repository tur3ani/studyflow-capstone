import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Columns2,
  ExternalLink,
  FileSearch,
  NotebookPen,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import type { StudyNoteDto } from '../types/models';

interface NotesViewProps {
  notes: StudyNoteDto[];
  activeDocumentId: string | null;
  initialSelectedNoteId?: string | null;
  onUpdateNote: (noteId: string, title: string, content: string, version: number) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onJumpToSource: (note: StudyNoteDto, openPdf: boolean) => Promise<void>;
  onOpenSplitWithReader: () => void;
}

export function NotesView({
  notes,
  activeDocumentId,
  initialSelectedNoteId,
  onUpdateNote,
  onDeleteNote,
  onJumpToSource,
  onOpenSplitWithReader,
}: NotesViewProps) {
  const [query, setQuery] = useState('');
  const [onlyCurrentDoc, setOnlyCurrentDoc] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    initialSelectedNoteId ?? notes[0]?.id ?? null
  );

  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (initialSelectedNoteId) {
      setSelectedNoteId(initialSelectedNoteId);
    }
  }, [initialSelectedNoteId]);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (onlyCurrentDoc && activeDocumentId && n.documentId !== activeDocumentId) {
        return false;
      }
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.contentMarkdown.toLowerCase().includes(q) ||
        (n.documentTitle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [notes, query, onlyCurrentDoc, activeDocumentId]);

  const selectedNote = useMemo(
    () => filteredNotes.find((n) => n.id === selectedNoteId) ?? filteredNotes[0] ?? null,
    [filteredNotes, selectedNoteId]
  );

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.contentMarkdown);
      setSavedToast(false);
    }
  }, [selectedNote?.id, selectedNote?.version]);

  const isDirty =
    selectedNote !== null &&
    (editTitle !== selectedNote.title || editContent !== selectedNote.contentMarkdown);

  const handleSave = async () => {
    if (!selectedNote || !editTitle.trim()) return;
    setSaving(true);
    try {
      await onUpdateNote(selectedNote.id, editTitle.trim(), editContent, selectedNote.version);
      setSavedToast(true);
    } finally {
      setSaving(false);
    }
  };

  if (notes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <NotebookPen className="h-8 w-8 mb-3" style={{ color: 'var(--warm)' }} />
        <h2 className="font-editorial text-2xl font-medium">Your notebook is empty</h2>
        <p className="text-xs mt-2 max-w-md leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
          Open any lecture in <strong>Read & Explain</strong>, clarify a paragraph in Arabic or
          English, refine it in your own words, and click <strong>Keep in Notes</strong>. Every note
          stays anchored to its exact source page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Left Master List */}
      <aside
        className="w-80 shrink-0 border-r flex flex-col"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="p-3 border-b space-y-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
          <div
            className="flex items-center gap-2 rounded-xl border px-3 py-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--ink-muted)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter notes..."
              className="flex-1 bg-transparent text-xs focus:outline-none"
              style={{ color: 'var(--ink-primary)' }}
            />
          </div>

          {activeDocumentId && (
            <div className="flex items-center justify-between gap-2 px-1">
              <label
                className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none"
                style={{ color: 'var(--ink-secondary)' }}
              >
                <input
                  type="checkbox"
                  checked={onlyCurrentDoc}
                  onChange={(e) => setOnlyCurrentDoc(e.target.checked)}
                />
                Active lecture only
              </label>
              <button
                type="button"
                onClick={onOpenSplitWithReader}
                className="inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                <Columns2 className="h-3 w-3" />
                Split w/ Reader
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.map((note) => {
            const active = selectedNote?.id === note.id;
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => setSelectedNoteId(note.id)}
                className="w-full text-left rounded-xl p-3 transition cursor-pointer"
                style={{
                  backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                  border: active ? '1px solid var(--border-strong)' : '1px solid transparent',
                }}
              >
                <div
                  dir={note.language === 'ar' ? 'rtl' : 'ltr'}
                  className="text-xs font-semibold truncate"
                >
                  {note.title}
                </div>
                <p
                  dir={note.language === 'ar' ? 'rtl' : 'ltr'}
                  className="text-[11px] line-clamp-2 mt-1 leading-relaxed"
                  style={{ color: 'var(--ink-secondary)' }}
                >
                  {note.contentMarkdown}
                </p>
                <div
                  className="mt-2 flex items-center justify-between text-[10px]"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  <span className="truncate max-w-[160px]">
                    {note.documentTitle ?? 'General Note'}
                  </span>
                  {note.sourcePageNumber && (
                    <span className="font-mono-tech shrink-0">p.{note.sourcePageNumber}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right Distraction-Free Editorial Note Editor */}
      {selectedNote ? (
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto px-8 lg:px-14 py-8">
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {/* Bi-directional Source Citation Anchor Chip */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {selectedNote.documentId ? (
                <div
                  className="inline-flex flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    borderColor: 'var(--accent-border)',
                    color: 'var(--accent)',
                  }}
                >
                  <span className="font-medium truncate max-w-[220px]" dir="auto">
                    {selectedNote.documentTitle ?? 'Lecture'}
                  </span>
                  <span className="font-mono-tech text-[11px]">
                    Page {selectedNote.sourcePageNumber ?? 1}
                    {selectedNote.chunkIndex ? ` · #${selectedNote.chunkIndex}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => void onJumpToSource(selectedNote, false)}
                    className="inline-flex items-center gap-1 underline font-medium cursor-pointer ml-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Jump to Passage
                  </button>
                  <button
                    type="button"
                    onClick={() => void onJumpToSource(selectedNote, true)}
                    className="inline-flex items-center gap-1 underline font-medium cursor-pointer"
                  >
                    <FileSearch className="h-3 w-3" />
                    Open PDF
                  </button>
                </div>
              ) : (
                <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                  Standalone Note
                </span>
              )}

              <div className="flex items-center gap-2">
                <span
                  className="font-mono-tech text-[11px] px-2 py-1 rounded-lg"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--ink-muted)',
                  }}
                >
                  v{selectedNote.version}
                </span>

                <button
                  type="button"
                  disabled={!isDirty || saving}
                  onClick={() => void handleSave()}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium text-white transition cursor-pointer disabled:opacity-40"
                  style={{ backgroundColor: savedToast ? 'var(--sage)' : 'var(--accent)' }}
                >
                  {savedToast ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? 'Saving...' : savedToast ? 'Saved' : 'Save Changes'}
                </button>

                <button
                  type="button"
                  onClick={() => void onDeleteNote(selectedNote.id)}
                  title="Delete note"
                  className="p-2 rounded-xl border transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--ink-muted)',
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Editable Editorial Note Title */}
            <input
              type="text"
              dir={selectedNote.language === 'ar' ? 'rtl' : 'ltr'}
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value);
                setSavedToast(false);
              }}
              className="w-full bg-transparent font-editorial text-3xl font-medium focus:outline-none border-b pb-3"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--ink-primary)',
              }}
            />

            {/* Editable Markdown Content */}
            <textarea
              rows={18}
              dir={selectedNote.language === 'ar' ? 'rtl' : 'ltr'}
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                setSavedToast(false);
              }}
              className="w-full bg-transparent text-sm leading-[1.9] focus:outline-none resize-none"
              style={{ color: 'var(--ink-primary)' }}
            />
          </div>
        </main>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs" style={{ color: 'var(--ink-muted)' }}>
          Select a note to read or edit.
        </div>
      )}
    </div>
  );
}
