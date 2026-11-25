import { useState, type DragEvent, type FormEvent } from 'react';
import {
  FileText,
  FolderPlus,
  Home,
  LogOut,
  Moon,
  PanelLeftClose,
  RefreshCw,
  Search,
  Settings,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { DocumentSummaryDto, HealthResponse, ProjectSummaryDto, UserDto } from '../types/models';
import { BrandMark } from './BrandMark';
import { StudyModePicker } from './StudyModePicker';

const COURSE_DOTS = ['#8052ff', '#ffb829', '#15846e', '#38bdf8', '#e879f9'];

interface SidebarProps {
  user: UserDto;
  health: HealthResponse | null;
  activeView: 'dashboard' | 'settings' | 'course';
  projects: ProjectSummaryDto[];
  selectedProjectId: string | null;
  documents: DocumentSummaryDto[];
  selectedDocumentId: string | null;
  uploading: boolean;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
  onTriggerUpload: () => void;
  onCollapse: () => void;
  onOpenCommandPalette: () => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string, courseCode: string) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  onSelectDocument: (documentId: string) => void;
  onReprocessDocument: (documentId: string) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onLogout: () => void;
}

export function Sidebar({
  user,
  health,
  activeView,
  projects,
  selectedProjectId,
  documents,
  selectedDocumentId,
  uploading,
  onOpenDashboard,
  onOpenSettings,
  onTriggerUpload,
  onCollapse,
  onOpenCommandPalette,
  onSelectProject,
  onCreateProject,
  onUploadFile,
  onSelectDocument,
  onReprocessDocument,
  onDeleteDocument,
  onLogout,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const inCourseView = activeView === 'course';

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setCreating(true);
    try {
      await onCreateProject(projectName.trim(), courseCode.trim());
      setProjectName('');
      setCourseCode('');
      setShowNewProject(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await onUploadFile(file);
    }
  };

  return (
    <aside
      className="w-72 shrink-0 border-r flex flex-col h-screen select-none"
      style={{
        backgroundColor: 'var(--bg-sidebar)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 h-14 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <button
          type="button"
          onClick={onOpenDashboard}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition"
        >
          <BrandMark size={24} />
          <span className="text-sm font-semibold tracking-tight">StudyFlow</span>
        </button>

        <button
          type="button"
          onClick={onCollapse}
          title="Collapse sidebar"
          className="p-1.5 rounded-lg transition cursor-pointer hover:opacity-80"
          style={{ color: 'var(--ink-muted)' }}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Primary Workspace Nav: Home Dashboard, Settings, Search */}
      <div className="px-3 pt-3 pb-2 space-y-1">
        <button
          type="button"
          onClick={onOpenDashboard}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
          style={{
            backgroundColor: activeView === 'dashboard' ? 'var(--bg-surface)' : 'transparent',
            color: activeView === 'dashboard' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
            border: activeView === 'dashboard' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            boxShadow: activeView === 'dashboard' ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
          }}
        >
          <Home
            className="h-3.5 w-3.5"
            style={{ color: activeView === 'dashboard' ? 'var(--accent)' : 'var(--ink-muted)' }}
          />
          <span>Home Dashboard</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
          style={{
            backgroundColor: activeView === 'settings' ? 'var(--bg-surface)' : 'transparent',
            color: activeView === 'settings' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
            border: activeView === 'settings' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            boxShadow: activeView === 'settings' ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
          }}
        >
          <Settings
            className="h-3.5 w-3.5"
            style={{ color: activeView === 'settings' ? 'var(--accent)' : 'var(--ink-muted)' }}
          />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition cursor-pointer mt-1"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--ink-muted)',
          }}
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            Search & Jump...
          </span>
          <kbd
            className="font-mono-tech text-[10px] px-1.5 py-0.5 rounded border"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Courses Section — expands cleanly when on Home Dashboard / Settings */}
      <div
        className={`px-3 py-2.5 border-t ${inCourseView ? 'border-b' : 'flex-1 overflow-y-auto'}`}
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between px-1.5 mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
            Courses
          </span>
          <button
            type="button"
            onClick={() => setShowNewProject((v) => !v)}
            title="New course"
            className="p-1 rounded-md transition cursor-pointer hover:opacity-80"
            style={{ color: 'var(--ink-secondary)' }}
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>

        {showNewProject && (
          <form
            onSubmit={handleCreate}
            className="mb-2.5 p-2.5 rounded-xl border space-y-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <input
              type="text"
              required
              placeholder="Course name (e.g. Algorithms)"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--ink-primary)',
              }}
            />
            <input
              type="text"
              placeholder="Code (optional, e.g. CS302)"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              className="w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--ink-primary)',
              }}
            />
            <div className="flex gap-1.5">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white cursor-pointer"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {creating ? 'Adding...' : 'Add Course'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewProject(false)}
                className="rounded-lg px-2.5 py-1.5 text-xs cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--ink-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className={`space-y-1 ${inCourseView ? 'max-h-36 overflow-y-auto' : ''}`}>
          {projects.map((p, i) => {
            const active = inCourseView && p.id === selectedProjectId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProject(p.id)}
                className="w-full text-left px-2.5 py-2 rounded-xl text-xs transition cursor-pointer flex items-center gap-2.5"
                style={{
                  backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                  border: active ? '1px solid var(--border-subtle)' : '1px solid transparent',
                }}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: COURSE_DOTS[i % COURSE_DOTS.length] }}
                />
                <span className="truncate font-medium flex-1">
                  {p.courseCode ? `${p.courseCode} · ` : ''}
                  {p.name}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                  {p.documentCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lecture Sources — ONLY shown when inside a Course (hidden on Home Dashboard & Settings) */}
      {inCourseView && (
        <div
          className="flex-1 overflow-y-auto p-3 flex flex-col"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => void handleDrop(e)}
        >
          <div className="flex items-center justify-between px-1.5 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
              Lecture Sources
            </span>
            <button
              type="button"
              disabled={!selectedProjectId || uploading}
              onClick={onTriggerUpload}
              className="btn-iris inline-flex items-center gap-1 px-3 py-1 text-[10px] uppercase cursor-pointer disabled:opacity-50"
            >
              <Upload className="h-3 w-3" />
              {uploading ? 'Importing...' : 'Import'}
            </button>
          </div>

          {dragOver && (
            <div
              className="mb-2 rounded-xl border-2 border-dashed p-3 text-center text-xs font-medium"
              style={{
                borderColor: 'var(--accent)',
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent)',
              }}
            >
              Drop PDF here to import
            </div>
          )}

          {documents.length === 0 ? (
            <button
              type="button"
              disabled={!selectedProjectId || uploading}
              onClick={onTriggerUpload}
              className="mt-2 rounded-2xl border border-dashed p-5 text-center transition cursor-pointer"
              style={{
                borderColor: 'var(--border-strong)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <FileText className="h-5 w-5 mx-auto mb-2" style={{ color: 'var(--ink-muted)' }} />
              <div className="text-xs font-medium">Drop a lecture PDF</div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--ink-muted)' }}>
                Splits into page-linked chunks automatically
              </p>
            </button>
          ) : (
            <div className="space-y-1">
              {documents.map((doc) => {
                const active = doc.id === selectedDocumentId;
                return (
                  <div
                    key={doc.id}
                    onClick={() => onSelectDocument(doc.id)}
                    className="group rounded-xl px-2.5 py-2 transition cursor-pointer flex items-start gap-2.5"
                    style={{
                      backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                      border: active ? '1px solid var(--border-subtle)' : '1px solid transparent',
                    }}
                  >
                    <FileText
                      className="h-4 w-4 mt-0.5 shrink-0"
                      style={{ color: active ? 'var(--accent)' : 'var(--ink-muted)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate" dir="auto">
                        {doc.title}
                      </div>
                      <div className="text-[10px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--ink-muted)' }}>
                        <span>{doc.pageCount}p</span>
                        <span>·</span>
                        <span>{doc.chunkCount} chunks</span>
                        {doc.status === 'Failed' && (
                          <span style={{ color: 'var(--danger)' }}>· Failed</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                      {doc.status === 'Failed' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onReprocessDocument(doc.id);
                          }}
                          title="Retry extraction"
                          className="p-1 rounded hover:opacity-80 cursor-pointer"
                          style={{ color: 'var(--warm)' }}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onDeleteDocument(doc.id);
                        }}
                        title="Delete lecture"
                        className="p-1 rounded hover:opacity-80 cursor-pointer"
                        style={{ color: 'var(--ink-muted)' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer: Interactive Study Mode Profile Picker (3 Defaults + Custom) + Theme + Profile */}
      <div className="p-3 border-t space-y-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <StudyModePicker aiProviderMode={health?.aiProviderMode} />

          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="p-2 rounded-xl border transition cursor-pointer shrink-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--ink-secondary)',
            }}
          >
            {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="flex items-center justify-between px-1 pt-0.5">
          <button
            type="button"
            onClick={onOpenSettings}
            className="min-w-0 text-left cursor-pointer hover:opacity-80 transition"
          >
            <div className="text-xs font-medium truncate">{user.displayName}</div>
            <div className="text-[11px] truncate" style={{ color: 'var(--ink-muted)' }}>
              {user.email}
            </div>
          </button>
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            className="p-1.5 rounded-lg transition cursor-pointer hover:opacity-80"
            style={{ color: 'var(--ink-muted)' }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
