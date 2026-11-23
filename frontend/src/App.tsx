import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Compass,
  Home,
  Moon,
  NotebookPen,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { api } from './api/client';
import { AuthPage } from './components/AuthPage';
import { CommandPalette } from './components/CommandPalette';
import { DashboardHome } from './components/DashboardHome';
import { NotesView } from './components/NotesView';
import { ReaderView, type ReaderSplitMode } from './components/ReaderView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { TechniquesView } from './components/TechniquesView';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import type {
  DashboardResponse,
  DocumentChunkDto,
  DocumentDetailDto,
  DocumentSummaryDto,
  HealthResponse,
  InsightPointDto,
  ProjectSummaryDto,
  StudyNoteDto,
  StudySessionDto,
  UpdateProfileRequest,
} from './types/models';

type AppView = 'dashboard' | 'settings' | 'course';
type LectureTab = 'reader' | 'notes' | 'techniques';

export default function App() {
  const { user, loading: authLoading, updateProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);

  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [documents, setDocuments] = useState<DocumentSummaryDto[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetailDto | null>(null);
  const [uploading, setUploading] = useState(false);

  const [notes, setNotes] = useState<StudyNoteDto[]>([]);
  const [sessions, setSessions] = useState<StudySessionDto[]>([]);

  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [lectureTab, setLectureTab] = useState<LectureTab>('reader');

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<ReaderSplitMode>('none');
  const [pdfViewPage, setPdfViewPage] = useState<number>(1);
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    setToast({ text, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Global keyboard shortcuts: Ctrl/Cmd+K for Command Palette, Escape for Zen Mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === 'Escape' && !paletteOpen && zenMode) {
        setZenMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paletteOpen, zenMode]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const data = await api.getDashboard();
      setDashboard(data);
    } catch {
      // Ignore silent refresh failures
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    const list = await api.listProjects();
    setProjects(list);
    setSelectedProjectId((current) => {
      if (current && list.some((p) => p.id === current)) return current;
      return list[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setDashboard(null);
      setProjects([]);
      setSelectedProjectId(null);
      setDocuments([]);
      setSelectedDocument(null);
      setNotes([]);
      setSessions([]);
      return;
    }

    refreshProjects().catch((err) =>
      notify(err instanceof Error ? err.message : 'Failed to load courses.', 'error')
    );
    void refreshDashboard();
  }, [user, refreshProjects, refreshDashboard, notify]);

  const loadProjectData = useCallback(async (projectId: string) => {
    const [docs, projectNotes, projectSessions] = await Promise.all([
      api.listDocuments(projectId),
      api.listNotes(projectId),
      api.listSessions(projectId),
    ]);
    setDocuments(docs);
    setNotes(projectNotes);
    setSessions(projectSessions);

    if (docs.length > 0) {
      const detail = await api.getDocument(docs[0].id);
      setSelectedDocument(detail);
      setSelectedChunkId(detail.chunks[0]?.id ?? null);
    } else {
      setSelectedDocument(null);
      setSelectedChunkId(null);
    }
    setSplitMode('none');
    setPdfViewPage(1);
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    loadProjectData(selectedProjectId).catch((err) =>
      notify(err instanceof Error ? err.message : 'Failed to load course data.', 'error')
    );
  }, [selectedProjectId, loadProjectData, notify]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm"
        style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--ink-muted)' }}
      >
        Opening your study studio...
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleSaveProfile = async (payload: UpdateProfileRequest) => {
    await updateProfile(payload);
    await refreshDashboard();
    notify('Profile & daily goal saved');
  };

  const handleUpdateDailyGoal = async (goalPoints: number) => {
    await updateProfile({
      displayName: user.displayName,
      preferredLanguage: user.preferredLanguage,
      dailyGoalPoints: goalPoints,
    });
    await refreshDashboard();
    notify(`Daily study goal updated to ${goalPoints} pts/day`);
  };

  const handleCreateProject = async (name: string, courseCode: string) => {
    const created = await api.createProject({ name, courseCode: courseCode || undefined });
    setProjects((prev) => [created, ...prev]);
    setSelectedProjectId(created.id);
    setActiveView('course');
    setLectureTab('reader');
    await refreshDashboard();
    notify(`Created course "${created.name}"`);
  };

  const handleUploadFile = async (file: File) => {
    if (!selectedProjectId) return;
    setUploading(true);
    try {
      const detail = await api.uploadDocument(selectedProjectId, file);
      const updatedDocs = await api.listDocuments(selectedProjectId);
      setDocuments(updatedDocs);
      setSelectedDocument(detail);
      setSelectedChunkId(detail.chunks[0]?.id ?? null);
      setSplitMode('none');
      setPdfViewPage(1);
      setActiveView('course');
      setLectureTab('reader');
      await Promise.all([refreshProjects(), refreshDashboard()]);
      notify(`Imported "${detail.title}" (${detail.chunks.length} passages)`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectDocument = async (documentId: string) => {
    try {
      const detail = await api.getDocument(documentId);
      setSelectedDocument(detail);
      setSelectedChunkId(detail.chunks[0]?.id ?? null);
      setHighlightedChunkId(null);
      setSplitMode('none');
      setPdfViewPage(1);
      setActiveView('course');
      setLectureTab('reader');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not open lecture.', 'error');
    }
  };

  const handleReprocessDocument = async (documentId: string) => {
    if (!selectedProjectId) return;
    try {
      const detail = await api.reprocessDocument(documentId);
      setDocuments(await api.listDocuments(selectedProjectId));
      setSelectedDocument(detail);
      setSelectedChunkId(detail.chunks[0]?.id ?? null);
      await refreshDashboard();
      notify(`Reprocessed "${detail.title}"`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Reprocessing failed.', 'error');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedProjectId) return;
    await api.deleteDocument(documentId);
    const updatedDocs = await api.listDocuments(selectedProjectId);
    setDocuments(updatedDocs);
    if (selectedDocument?.id === documentId) {
      if (updatedDocs.length > 0) {
        const nextDetail = await api.getDocument(updatedDocs[0].id);
        setSelectedDocument(nextDetail);
        setSelectedChunkId(nextDetail.chunks[0]?.id ?? null);
      } else {
        setSelectedDocument(null);
        setSelectedChunkId(null);
      }
      setSplitMode('none');
    }
    await Promise.all([refreshProjects(), refreshDashboard()]);
    notify('Lecture removed');
  };

  const handleSaveNote = async (payload: {
    chunk: DocumentChunkDto;
    title: string;
    contentMarkdown: string;
    sourcePageNumber: number;
    language: string;
    sourceType?: string;
  }) => {
    if (!selectedProjectId) return;
    const created = await api.createNote({
      projectId: selectedProjectId,
      documentId: payload.chunk.documentId,
      chunkId: payload.chunk.id,
      title: payload.title,
      contentMarkdown: payload.contentMarkdown,
      sourcePageNumber: payload.sourcePageNumber,
      language: payload.language,
      sourceType: payload.sourceType ?? 'Manual',
    });
    setNotes((prev) => [created, ...prev]);
    await Promise.all([refreshProjects(), refreshDashboard()]);
    const label =
      payload.sourceType === 'Highlight'
        ? `Highlighted on Page ${payload.sourcePageNumber}`
        : payload.sourceType === 'GlossaryTerm'
          ? `Added "${created.title}" to Glossary & Flashcards`
          : `Saved "${created.title}" (Page ${payload.sourcePageNumber})`;
    notify(label);
  };

  const handleUpdateNote = async (
    noteId: string,
    title: string,
    contentMarkdown: string,
    expectedVersion: number
  ) => {
    const updated = await api.updateNote(noteId, { title, contentMarkdown, expectedVersion });
    setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
    await refreshDashboard();
    notify('Note saved');
  };

  const handleDeleteNote = async (noteId: string) => {
    await api.deleteNote(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    await Promise.all([refreshProjects(), refreshDashboard()]);
    notify('Note deleted');
  };

  const handleJumpToNoteSource = async (note: StudyNoteDto, openPdf: boolean) => {
    if (!note.documentId) return;

    let targetDoc = selectedDocument;
    if (!targetDoc || targetDoc.id !== note.documentId) {
      targetDoc = await api.getDocument(note.documentId);
      setSelectedDocument(targetDoc);
    }

    if (note.chunkId) {
      setSelectedChunkId(note.chunkId);
      setHighlightedChunkId(note.chunkId);
    }

    if (openPdf) {
      setPdfViewPage(note.sourcePageNumber ?? 1);
      setSplitMode('pdf');
    }

    setActiveView('course');
    setLectureTab('reader');
  };

  const handleJumpToInsight = async (insight: InsightPointDto) => {
    if (insight.projectId !== selectedProjectId) {
      setSelectedProjectId(insight.projectId);
    }
    if (insight.documentId) {
      const detail = await api.getDocument(insight.documentId);
      setSelectedDocument(detail);
      const targetChunkId = insight.chunkId ?? detail.chunks[0]?.id ?? null;
      setSelectedChunkId(targetChunkId);
      setHighlightedChunkId(targetChunkId);
      setPdfViewPage(insight.pageNumber ?? 1);
    }
    setActiveView('course');
    setLectureTab('reader');
  };

  const handleCreateSession = async (goal: string, selectedChunkIds: string[]) => {
    if (!selectedProjectId || !selectedDocument) {
      throw new Error('Select a lecture first.');
    }
    const created = await api.createSession({
      projectId: selectedProjectId,
      documentId: selectedDocument.id,
      mode: '3_steps',
      goal,
      selectedChunkIds,
    });
    setSessions((prev) => [created, ...prev]);
    await refreshDashboard();
    return created;
  };

  const handleSaveRecall = async (sessionId: string, recallText: string) => {
    const updated = await api.saveSessionRecall(sessionId, recallText);
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));
    await refreshDashboard();
    notify('Independent recall saved (+3 heatmap pts)');
    return updated;
  };

  const openPdfAtPage = (page: number) => {
    setPdfViewPage(Math.max(1, page));
    setSplitMode('pdf');
  };

  const lectureTabs: { id: LectureTab; label: string; icon: typeof BookOpen; badge?: number }[] = [
    { id: 'reader', label: 'Study Reader', icon: BookOpen },
    { id: 'notes', label: 'Notes', icon: NotebookPen, badge: notes.length },
    { id: 'techniques', label: 'Techniques', icon: Compass },
  ];

  return (
    <div
      className="h-screen w-screen overflow-hidden flex relative"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--ink-primary)' }}
    >
      {/* Always-mounted file input so upload works from anywhere */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleUploadFile(file);
            e.target.value = '';
          }
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 z-50 rounded-xl border px-4 py-2.5 text-xs font-medium shadow-lg flex items-center gap-2.5"
          style={
            toast.tone === 'error'
              ? {
                  backgroundColor: 'var(--danger-soft)',
                  borderColor: 'var(--danger)',
                  color: 'var(--danger)',
                }
              : {
                  backgroundColor: 'var(--ink-primary)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--bg-canvas)',
                }
          }
        >
          <span>{toast.text}</span>
        </div>
      )}

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        theme={theme}
        zenMode={zenMode}
        projects={projects}
        documents={documents}
        activeDocument={selectedDocument}
        notes={notes}
        onToggleTheme={toggleTheme}
        onToggleZen={() => {
          setActiveView('course');
          setLectureTab('reader');
          setZenMode((v) => !v);
        }}
        onToggleSplitNotes={() => {
          setActiveView('course');
          setLectureTab('reader');
          setSplitMode((m) => (m === 'notes' ? 'none' : 'notes'));
        }}
        onToggleSplitPdf={() => {
          setActiveView('course');
          setLectureTab('reader');
          if (splitMode === 'pdf') {
            setSplitMode('none');
          } else {
            const activeChunk = selectedDocument?.chunks.find((c) => c.id === selectedChunkId);
            openPdfAtPage(activeChunk?.pageNumber ?? 1);
          }
        }}
        onOpenDashboard={() => {
          setZenMode(false);
          setActiveView('dashboard');
          void refreshDashboard();
        }}
        onSwitchMode={(tab) => {
          setActiveView('course');
          setLectureTab(tab);
        }}
        onTriggerUpload={() => fileInputRef.current?.click()}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setActiveView('course');
          setLectureTab('reader');
        }}
        onSelectDocument={(id) => void handleSelectDocument(id)}
        onJumpToChunk={(chunkId) => {
          setActiveView('course');
          setLectureTab('reader');
          setSelectedChunkId(chunkId);
          setHighlightedChunkId(chunkId);
        }}
        onOpenNote={(note) => {
          setFocusedNoteId(note.id);
          setActiveView('course');
          setLectureTab('notes');
        }}
      />

      {/* Collapsible Sidebar (Courses ONLY on Home Dashboard / Settings; Lecture Sources appear inside a Course) */}
      {sidebarOpen && !zenMode && (
        <Sidebar
          user={user}
          health={health}
          activeView={activeView}
          projects={projects}
          selectedProjectId={selectedProjectId}
          documents={documents}
          selectedDocumentId={activeView === 'course' ? (selectedDocument?.id ?? null) : null}
          uploading={uploading}
          onOpenDashboard={() => {
            setActiveView('dashboard');
            void refreshDashboard();
          }}
          onOpenSettings={() => setActiveView('settings')}
          onTriggerUpload={() => fileInputRef.current?.click()}
          onCollapse={() => setSidebarOpen(false)}
          onOpenCommandPalette={() => setPaletteOpen(true)}
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            setActiveView('course');
            setLectureTab('reader');
          }}
          onCreateProject={handleCreateProject}
          onUploadFile={handleUploadFile}
          onSelectDocument={(id) => void handleSelectDocument(id)}
          onReprocessDocument={handleReprocessDocument}
          onDeleteDocument={handleDeleteDocument}
          onLogout={logout}
        />
      )}

      {/* Main Studio Shell */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {!zenMode && (
          <header
            className="h-14 shrink-0 px-4 border-b flex items-center justify-between gap-4"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* Left: Sidebar expand + Context Breadcrumb */}
            <div className="flex items-center gap-2.5 min-w-0">
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  title="Open sidebar"
                  className="p-1.5 rounded-lg border transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--ink-secondary)',
                  }}
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              )}

              {activeView === 'dashboard' && (
                <span className="inline-flex items-center gap-2 text-xs font-semibold">
                  <Home className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                  Home Dashboard
                </span>
              )}

              {activeView === 'settings' && (
                <span className="inline-flex items-center gap-2 text-xs font-semibold">
                  <Settings className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                  Settings
                </span>
              )}

              {activeView === 'course' && (
                <div className="flex items-center gap-1.5 text-xs min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('dashboard');
                      void refreshDashboard();
                    }}
                    className="hover:underline cursor-pointer shrink-0"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    Home
                  </button>
                  <span style={{ color: 'var(--ink-muted)' }}>/</span>
                  <span className="font-medium truncate hidden md:inline" style={{ color: 'var(--ink-secondary)' }}>
                    {activeProject?.courseCode ? `${activeProject.courseCode} · ` : ''}
                    {activeProject?.name ?? 'Course'}
                  </span>
                </div>
              )}
            </div>

            {/* Center: Lecture Studio Tabs ONLY when inside a Course */}
            {activeView === 'course' && (
              <nav
                className="flex items-center rounded-2xl p-1 border"
                style={{
                  backgroundColor: 'var(--bg-sidebar)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {lectureTabs.map((t) => {
                  const Icon = t.icon;
                  const active = lectureTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setLectureTab(t.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer"
                      style={
                        active
                          ? {
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--ink-primary)',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                            }
                          : { color: 'var(--ink-secondary)' }
                      }
                    >
                      <Icon
                        className="h-3.5 w-3.5"
                        style={{ color: active ? 'var(--accent)' : 'var(--ink-muted)' }}
                      />
                      <span>{t.label}</span>
                      {typeof t.badge === 'number' && t.badge > 0 && (
                        <span
                          className="font-mono-tech text-[10px] px-1.5 rounded-full"
                          style={{
                            backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-hover)',
                            color: active ? 'var(--accent)' : 'var(--ink-muted)',
                          }}
                        >
                          {t.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            )}

            {/* Right: Clean Command Palette + Theme (when collapsed) — Mode lives in Sidebar */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                title="Command Palette (Ctrl+K)"
                className="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--ink-muted)',
                }}
              >
                <Search className="h-3.5 w-3.5" />
                <kbd className="font-mono-tech text-[10px] hidden sm:inline">Ctrl K</kbd>
              </button>

              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  title="Toggle theme"
                  className="p-2 rounded-xl border cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--ink-secondary)',
                  }}
                >
                  {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </header>
        )}

        {/* Active Viewport */}
        {activeView === 'dashboard' && (
          <DashboardHome
            dashboard={dashboard}
            onUpdateDailyGoal={handleUpdateDailyGoal}
            onOpenSettings={() => setActiveView('settings')}
            onJumpToInsight={handleJumpToInsight}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView user={user} onSaveProfile={handleSaveProfile} />
        )}

        {activeView === 'course' && (
          <>
            {lectureTab === 'reader' && (
              <ReaderView
                document={selectedDocument}
                notes={notes}
                sessions={sessions}
                selectedChunkId={selectedChunkId}
                highlightedChunkId={highlightedChunkId}
                splitMode={splitMode}
                pdfViewPage={pdfViewPage}
                zenMode={zenMode}
                onToggleZen={() => setZenMode((v) => !v)}
                onSelectChunk={(chunk) => {
                  setSelectedChunkId(chunk.id);
                  setHighlightedChunkId(null);
                }}
                onChangeSplitMode={(nextMode, page) => {
                  if (page) setPdfViewPage(page);
                  setSplitMode(nextMode);
                }}
                onOpenPdfAtPage={openPdfAtPage}
                onTriggerUpload={() => fileInputRef.current?.click()}
                onSaveNote={handleSaveNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onJumpToChunk={(chunkId, openPdfPage) => {
                  setSelectedChunkId(chunkId);
                  setHighlightedChunkId(chunkId);
                  if (openPdfPage) openPdfAtPage(openPdfPage);
                }}
                onNotify={(msg) => notify(msg)}
              />
            )}

            {lectureTab === 'notes' && (
              <NotesView
                notes={notes}
                activeDocumentId={selectedDocument?.id ?? null}
                initialSelectedNoteId={focusedNoteId}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onJumpToSource={handleJumpToNoteSource}
                onOpenSplitWithReader={() => {
                  setLectureTab('reader');
                  setSplitMode('notes');
                }}
              />
            )}

            {lectureTab === 'techniques' && (
              <TechniquesView
                projectId={selectedProjectId}
                document={selectedDocument}
                notes={notes}
                sessions={sessions}
                onCreateSession={handleCreateSession}
                onSaveRecall={handleSaveRecall}
                onSaveManualFlashcard={({ chunk, front, back }) =>
                  handleSaveNote({
                    chunk,
                    title: front,
                    contentMarkdown: back,
                    sourcePageNumber: chunk.pageNumber,
                    language: /[\u0600-\u06FF]/.test(back) ? 'ar' : 'en',
                    sourceType: 'GlossaryTerm',
                  })
                }
                onJumpToChunkInReader={(chunkId, pageNumber) => {
                  setSelectedChunkId(chunkId);
                  setHighlightedChunkId(chunkId);
                  if (pageNumber) setPdfViewPage(pageNumber);
                  setLectureTab('reader');
                }}
                onQuizAttemptSaved={() => void refreshDashboard()}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
