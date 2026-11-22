import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  Flame,
  NotebookPen,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';
import type {
  DashboardResponse,
  DocumentSummaryDto,
  InsightPointDto,
  ProjectSummaryDto,
} from '../types/models';

interface DashboardHomeProps {
  dashboard: DashboardResponse | null;
  projects: ProjectSummaryDto[];
  recentDocuments: DocumentSummaryDto[];
  uploading: boolean;
  onTriggerUpload: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenLecture: (documentId: string) => void;
  onJumpToInsight: (insight: InsightPointDto) => Promise<void>;
}

const HEATMAP_COLORS_LIGHT = ['#ece7dd', '#c7e8d2', '#7bc99a', '#2e9e5e', '#15703d'];
const HEATMAP_COLORS_DARK = ['#25221f', '#193b29', '#1e5b3a', '#258752', '#34d399'];

export function DashboardHome({
  dashboard,
  projects,
  recentDocuments,
  uploading,
  onTriggerUpload,
  onOpenProject,
  onOpenLecture,
  onJumpToInsight,
}: DashboardHomeProps) {
  const initials = (dashboard?.displayName ?? 'ST')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  // Group 84 days into 12 weekly columns (7 rows each)
  const weeks: typeof dashboard extends null ? never : NonNullable<typeof dashboard>['heatmap'][] = [];
  if (dashboard?.heatmap) {
    for (let i = 0; i < dashboard.heatmap.length; i += 7) {
      weeks.push(dashboard.heatmap.slice(i, i + 7));
    }
  }

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const palette = isDark ? HEATMAP_COLORS_DARK : HEATMAP_COLORS_LIGHT;

  return (
    <div className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-14 py-9">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Student Profile & Independence Header Card */}
        <section
          className="rounded-3xl border p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-start sm:items-center gap-5">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center font-editorial text-2xl font-semibold shrink-0 border"
              style={{
                backgroundColor: 'var(--accent-soft)',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent)',
              }}
            >
              {initials || 'S'}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-editorial text-3xl font-medium tracking-tight">
                  {dashboard?.displayName ?? 'Student Studio'}
                </h1>
                <span
                  className="font-mono-tech text-[11px] px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--ink-secondary)',
                  }}
                >
                  {dashboard?.preferredLanguage?.toUpperCase() ?? 'AR'} / EN
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--ink-secondary)' }}>
                {dashboard?.email} · Studying since{' '}
                {dashboard ? new Date(dashboard.memberSince).toLocaleDateString() : 'today'}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: 'var(--warm-soft)', color: 'var(--warm)' }}
                >
                  <Flame className="h-3.5 w-3.5" />
                  {dashboard?.currentStreakDays ?? 0} day streak
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: 'var(--sage-soft)', color: 'var(--sage)' }}
                >
                  <Target className="h-3.5 w-3.5" />
                  {dashboard?.independenceScorePercent ?? 0}% Independence Index
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={uploading}
              onClick={onTriggerUpload}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium text-white cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Importing...' : 'Import Lecture PDF'}
            </button>
            {recentDocuments[0] && (
              <button
                type="button"
                onClick={() => onOpenLecture(recentDocuments[0].id)}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--ink-primary)',
                }}
              >
                Continue Reading
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </section>

        {/* Stats Strip */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {[
            { label: 'Courses', value: dashboard?.totalCourses ?? projects.length, icon: BookOpen, color: 'var(--accent)' },
            { label: 'Lectures', value: dashboard?.totalLectures ?? 0, icon: Sparkles, color: 'var(--accent)' },
            { label: 'Saved Notes', value: dashboard?.totalNotes ?? 0, icon: NotebookPen, color: 'var(--warm)' },
            { label: 'Active Recalls', value: dashboard?.totalRecallSessions ?? 0, icon: Brain, color: 'var(--sage)' },
            { label: 'Quiz Attempts', value: dashboard?.totalQuizAttempts ?? 0, icon: Award, color: 'var(--sage)' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border p-4"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--ink-muted)' }}>
                    {stat.label}
                  </span>
                  <Icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
                </div>
                <div className="font-editorial text-3xl font-medium">{stat.value}</div>
              </div>
            );
          })}
        </section>

        {/* Study Consistency Heatmap */}
        <section
          className="rounded-3xl border p-6 space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-editorial text-xl font-medium">Study Consistency Heatmap</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                Last 12 weeks across lecture imports, saved notes, active recall sessions, and quizzes
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-muted)' }}>
              <span>Less</span>
              {palette.map((hex, idx) => (
                <span
                  key={idx}
                  className="h-3 w-3 rounded-[3px]"
                  style={{ backgroundColor: hex }}
                />
              ))}
              <span>More</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="inline-flex gap-1.5">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1.5">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date}: ${day.count} study activity points`}
                      className="h-4 w-4 sm:h-4.5 sm:w-4.5 rounded-[4px] transition-transform hover:scale-110"
                      style={{ backgroundColor: palette[Math.min(4, Math.max(0, day.level))] }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Strong Points vs Weak Points */}
        <section className="grid lg:grid-cols-2 gap-6">
          {/* Strong Points */}
          <div
            className="rounded-3xl border p-6 space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: 'var(--sage)' }} />
                <h2 className="font-editorial text-xl font-medium">Strong Points</h2>
              </div>
              <span
                className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'var(--sage-soft)', color: 'var(--sage)' }}
              >
                Mastered & Recalled
              </span>
            </div>

            {!dashboard || dashboard.strongPoints.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed p-6 text-center text-xs"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-muted)' }}
              >
                Complete an Active Recall session or score well on a Lecture Quiz to build your
                strong points list.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dashboard.strongPoints.map((pt, idx) => (
                  <button
                    key={`${pt.documentId}-${idx}`}
                    type="button"
                    onClick={() => void onJumpToInsight(pt)}
                    className="w-full text-left rounded-2xl border p-4 transition cursor-pointer hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold truncate" dir="auto">
                        {pt.title}
                      </span>
                      <span
                        className="font-mono-tech text-xs font-semibold shrink-0"
                        style={{ color: 'var(--sage)' }}
                      >
                        {pt.scorePercent}%
                      </span>
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-secondary)' }}>
                      {pt.courseName} · {pt.reason}
                    </div>
                    <div
                      className="mt-2.5 h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-hover)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pt.scorePercent}%`, backgroundColor: 'var(--sage)' }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Weak Points / Needs Review */}
          <div
            className="rounded-3xl border p-6 space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" style={{ color: 'var(--warm)' }} />
                <h2 className="font-editorial text-xl font-medium">Weak Points & Review Queue</h2>
              </div>
              <span
                className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'var(--warm-soft)', color: 'var(--warm)' }}
              >
                Focus Next
              </span>
            </div>

            {!dashboard || dashboard.weakPoints.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed p-6 text-center text-xs"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-muted)' }}
              >
                No weak points flagged yet. Upload lectures and test yourself in Techniques to spot
                gaps automatically.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dashboard.weakPoints.map((pt, idx) => (
                  <div
                    key={`${pt.documentId}-${pt.chunkId}-${idx}`}
                    className="rounded-2xl border p-4 flex items-center justify-between gap-3"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate" dir="auto">
                        {pt.title}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-secondary)' }}>
                        {pt.courseName} · {pt.reason}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void onJumpToInsight(pt)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium text-white cursor-pointer"
                      style={{ backgroundColor: 'var(--warm)' }}
                    >
                      Review
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Courses Quick Directory */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
              Your Courses
            </h2>
            <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              Click any course to enter its Lecture Studio
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenProject(p.id)}
                className="text-left rounded-2xl border p-5 transition cursor-pointer hover:shadow-sm flex flex-col justify-between gap-4"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div>
                  {p.courseCode && (
                    <span
                      className="font-mono-tech text-[10px] px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                      {p.courseCode}
                    </span>
                  )}
                  <h3 className="font-editorial text-xl font-medium mt-2">{p.name}</h3>
                  {p.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--ink-secondary)' }}>
                      {p.description}
                    </p>
                  )}
                </div>

                <div
                  className="pt-3 border-t flex items-center justify-between text-[11px]"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--ink-muted)' }}
                >
                  <span>{p.documentCount} lectures</span>
                  <span>{p.noteCount} notes</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
