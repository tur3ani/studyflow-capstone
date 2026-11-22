import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Brain,
  FileText,
  Maximize2,
  Moon,
  NotebookPen,
  PanelRight,
  Search,
  Sun,
  Upload,
} from 'lucide-react';
import type { DocumentDetailDto, DocumentSummaryDto, ProjectSummaryDto, StudyNoteDto } from '../types/models';

export interface CommandItem {
  id: string;
  group: 'Actions' | 'Lectures' | 'Passages' | 'Notes' | 'Courses';
  label: string;
  subtitle?: string;
  icon: 'action' | 'lecture' | 'passage' | 'note' | 'course' | 'theme' | 'zen' | 'pdf' | 'recall' | 'upload';
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  zenMode: boolean;
  projects: ProjectSummaryDto[];
  documents: DocumentSummaryDto[];
  activeDocument: DocumentDetailDto | null;
  notes: StudyNoteDto[];
  onToggleTheme: () => void;
  onToggleZen: () => void;
  onToggleSplitPdf: () => void;
  onToggleSplitNotes: () => void;
  onOpenDashboard: () => void;
  onSwitchMode: (mode: 'reader' | 'notes' | 'techniques') => void;
  onTriggerUpload: () => void;
  onSelectProject: (projectId: string) => void;
  onSelectDocument: (documentId: string) => void;
  onJumpToChunk: (chunkId: string) => void;
  onOpenNote: (note: StudyNoteDto) => void;
}

export function CommandPalette({
  open,
  onClose,
  theme,
  zenMode,
  projects,
  documents,
  activeDocument,
  notes,
  onToggleTheme,
  onToggleZen,
  onToggleSplitPdf,
  onToggleSplitNotes,
  onOpenDashboard,
  onSwitchMode,
  onTriggerUpload,
  onSelectProject,
  onSelectDocument,
  onJumpToChunk,
  onOpenNote,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      {
        id: 'act-home',
        group: 'Actions',
        label: 'Go to Main Dashboard',
        subtitle: 'Profile, heatmap, strong points & weak points',
        icon: 'action',
        onSelect: () => onOpenDashboard(),
      },
      {
        id: 'act-upload',
        group: 'Actions',
        label: 'Upload Lecture PDF',
        subtitle: 'Import a new PDF, TXT, or MD file into this course',
        icon: 'upload',
        onSelect: () => onTriggerUpload(),
      },
      {
        id: 'act-split-notes',
        group: 'Actions',
        label: 'Split View: Read & Explain + Notes',
        subtitle: 'Open live notes alongside the lecture reader',
        icon: 'note',
        onSelect: () => onToggleSplitNotes(),
      },
      {
        id: 'act-pdf',
        group: 'Actions',
        label: 'Split View: Read & Explain + Original PDF',
        subtitle: 'View original PDF starting at current passage page',
        icon: 'pdf',
        onSelect: () => onToggleSplitPdf(),
      },
      {
        id: 'act-tech',
        group: 'Actions',
        label: 'Open Techniques Studio',
        subtitle: 'Active Recall, Quizzes, Mind Map & Flashcards',
        icon: 'recall',
        onSelect: () => onSwitchMode('techniques'),
      },
      {
        id: 'act-zen',
        group: 'Actions',
        label: zenMode ? 'Exit Zen Focus Mode' : 'Enter Zen Focus Reading Mode',
        subtitle: 'Distraction-free warm reading desk',
        icon: 'zen',
        onSelect: () => onToggleZen(),
      },
      {
        id: 'act-theme',
        group: 'Actions',
        label: theme === 'light' ? 'Switch to Warm Obsidian Dark Mode' : 'Switch to Warm Paper Light Mode',
        subtitle: 'Change studio appearance',
        icon: 'theme',
        onSelect: () => onToggleTheme(),
      },
    ];

    for (const p of projects) {
      list.push({
        id: `proj-${p.id}`,
        group: 'Courses',
        label: p.courseCode ? `${p.courseCode} · ${p.name}` : p.name,
        subtitle: `${p.documentCount} lectures · ${p.noteCount} notes`,
        icon: 'course',
        onSelect: () => onSelectProject(p.id),
      });
    }

    for (const d of documents) {
      list.push({
        id: `doc-${d.id}`,
        group: 'Lectures',
        label: d.title,
        subtitle: `${d.pageCount} pages · ${d.chunkCount} chunks`,
        icon: 'lecture',
        onSelect: () => onSelectDocument(d.id),
      });
    }

    if (activeDocument) {
      for (const c of activeDocument.chunks.slice(0, 40)) {
        list.push({
          id: `chunk-${c.id}`,
          group: 'Passages',
          label: `Page ${c.pageNumber} · ${c.heading || `Passage #${c.chunkIndex}`}`,
          subtitle: c.content.slice(0, 90),
          icon: 'passage',
          onSelect: () => onJumpToChunk(c.id),
        });
      }
    }

    for (const n of notes) {
      list.push({
        id: `note-${n.id}`,
        group: 'Notes',
        label: n.title,
        subtitle: n.sourcePageNumber
          ? `${n.documentTitle ?? 'Lecture'} · Page ${n.sourcePageNumber}`
          : n.contentMarkdown.slice(0, 80),
        icon: 'note',
        onSelect: () => onOpenNote(n),
      });
    }

    return list;
  }, [
    theme,
    zenMode,
    projects,
    documents,
    activeDocument,
    notes,
    onToggleTheme,
    onToggleZen,
    onToggleSplitPdf,
    onToggleSplitNotes,
    onOpenDashboard,
    onSwitchMode,
    onTriggerUpload,
    onSelectProject,
    onSelectDocument,
    onJumpToChunk,
    onOpenNote,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 14);
    return items
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
          item.group.toLowerCase().includes(q)
      )
      .slice(0, 18);
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  const renderIcon = (kind: CommandItem['icon']) => {
    const cls = 'h-4 w-4 shrink-0';
    switch (kind) {
      case 'upload':
        return <Upload className={cls} />;
      case 'zen':
        return <Maximize2 className={cls} />;
      case 'pdf':
        return <PanelRight className={cls} />;
      case 'recall':
        return <Brain className={cls} />;
      case 'theme':
        return theme === 'light' ? <Moon className={cls} /> : <Sun className={cls} />;
      case 'lecture':
        return <FileText className={cls} />;
      case 'note':
        return <NotebookPen className={cls} />;
      default:
        return <BookOpen className={cls} />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter' && filtered[selectedIndex]) {
                e.preventDefault();
                filtered[selectedIndex].onSelect();
                onClose();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="Jump to a lecture, passage, note, or studio command..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--ink-primary)' }}
          />
          <kbd
            className="font-mono-tech text-[10px] px-1.5 py-0.5 rounded border"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--ink-muted)',
            }}
          >
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs" style={{ color: 'var(--ink-muted)' }}>
              No matching lectures, notes, or commands.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const active = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--bg-hover)' : 'transparent',
                    color: 'var(--ink-primary)',
                  }}
                >
                  <span style={{ color: active ? 'var(--accent)' : 'var(--ink-muted)' }}>
                    {renderIcon(item.icon)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate" dir="auto">
                      {item.label}
                    </div>
                    {item.subtitle && (
                      <div
                        className="text-[11px] truncate mt-0.5"
                        dir="auto"
                        style={{ color: 'var(--ink-muted)' }}
                      >
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--ink-muted)',
                    }}
                  >
                    {item.group}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
