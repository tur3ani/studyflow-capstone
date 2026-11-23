import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  NotebookPen,
  Settings,
  Target,
  TrendingUp,
} from 'lucide-react';
import type {
  DashboardResponse,
  InsightPointDto,
} from '../types/models';

interface DashboardHomeProps {
  dashboard: DashboardResponse | null;
  onUpdateDailyGoal: (goalPoints: number) => Promise<void>;
  onOpenSettings: () => void;
  onJumpToInsight: (insight: InsightPointDto) => Promise<void>;
}

const HEATMAP_COLORS_LIGHT = ['#ece7dd', '#c7e8d2', '#7bc99a', '#2e9e5e', '#15703d'];
const HEATMAP_COLORS_DARK = ['#25221f', '#193b29', '#1e5b3a', '#258752', '#34d399'];

export function DashboardHome({
  dashboard,
  onUpdateDailyGoal,
  onOpenSettings,
  onJumpToInsight,
}: DashboardHomeProps) {
  const [showDetailedWeakPoints, setShowDetailedWeakPoints] = useState(false);
  const [showHeatmapInfo, setShowHeatmapInfo] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState<number>(dashboard?.dailyGoalPoints ?? 6);
  const [savingGoal, setSavingGoal] = useState(false);

  const initials = (dashboard?.displayName ?? 'ST')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  // Group 84 days into 12 weekly columns (7 rows each)
  const weeks = useMemo(() => {
    if (!dashboard?.heatmap) return [];
    const grouped: typeof dashboard.heatmap[] = [];
    for (let i = 0; i < dashboard.heatmap.length; i += 7) {
      grouped.push(dashboard.heatmap.slice(i, i + 7));
    }
    return grouped;
  }, [dashboard?.heatmap]);

  // Group detailed weak points by course for the "Show More" drawer
  const weakPointsByCourse = useMemo(() => {
    const map = new Map<string, InsightPointDto[]>();
    for (const item of dashboard?.detailedWeakPoints ?? []) {
      const list = map.get(item.courseName) ?? [];
      list.push(item);
      map.set(item.courseName, list);
    }
    return Array.from(map.entries());
  }, [dashboard?.detailedWeakPoints]);

  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const palette = isDark ? HEATMAP_COLORS_DARK : HEATMAP_COLORS_LIGHT;

  const dailyGoal = dashboard?.dailyGoalPoints ?? 6;
  const todayPoints = dashboard?.todayPoints ?? 0;
  const todayPct = Math.min(100, Math.round((todayPoints / Math.max(1, dailyGoal)) * 100));

  return (
    <div className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-14 py-9">
      <div className="max-w-5xl mx-auto space-y-7">
        {/* 1. Refined Student Profile & Daily Goal Hero */}
        <section
          className="rounded-3xl border p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
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
                {dashboard?.email} · Select any course from the sidebar to study
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
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
                  {dashboard?.independenceScorePercent ?? 0}% Independence
                </span>
              </div>
            </div>
          </div>

          {/* Right: Today's Goal Progress Summary */}
          <div
            className="rounded-2xl border p-4 min-w-[230px] space-y-2"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium" style={{ color: 'var(--ink-secondary)' }}>
                Today's Goal
              </span>
              <span className="font-mono-tech font-semibold" style={{ color: todayPct >= 100 ? 'var(--sage)' : 'var(--accent)' }}>
                {todayPoints} / {dailyGoal} pts
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-hover)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(todayPoints > 0 ? 8 : 0, todayPct)}%`,
                  backgroundColor: todayPct >= 100 ? 'var(--sage)' : 'var(--accent)',
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--ink-muted)' }}>
              <span>{todayPct >= 100 ? 'Daily goal achieved!' : `${dailyGoal - todayPoints} pts remaining`}</span>
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1 hover:underline cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                <Settings className="h-3 w-3" />
                Settings
              </button>
            </div>
          </div>
        </section>

        {/* 2. Compact Metrics Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {[
            { label: 'Lectures', value: dashboard?.totalLectures ?? 0, icon: BookOpen, color: 'var(--accent)' },
            { label: 'Notes & Highlights', value: dashboard?.totalNotes ?? 0, icon: NotebookPen, color: 'var(--warm)' },
            { label: 'Active Recalls', value: dashboard?.totalRecallSessions ?? 0, icon: Brain, color: 'var(--sage)' },
            { label: 'Quiz Attempts', value: dashboard?.totalQuizAttempts ?? 0, icon: Award, color: 'var(--sage)' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border px-4 py-3.5 flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div>
                  <div className="text-[11px] font-medium" style={{ color: 'var(--ink-muted)' }}>
                    {stat.label}
                  </div>
                  <div className="font-editorial text-2xl font-medium mt-0.5">{stat.value}</div>
                </div>
                <Icon className="h-4 w-4 opacity-80" style={{ color: stat.color }} />
              </div>
            );
          })}
        </section>

        {/* 3. Goal-Scaled Study Consistency Heatmap */}
        <section
          className="rounded-3xl border p-6 space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-xl font-medium">Study Consistency Heatmap</h2>
                <button
                  type="button"
                  onClick={() => setShowHeatmapInfo((v) => !v)}
                  title="How heatmap points work"
                  className="p-1 rounded-full cursor-pointer"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                12 weeks scaled to your daily goal ({dailyGoal} pts/day) ·{' '}
                <strong>{dashboard?.goalMetDays ?? 0}</strong> goal days hit
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {editingGoal ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(Math.max(2, Math.min(50, Number(e.target.value) || 6)))}
                    className="w-16 rounded-lg border px-2 py-1 text-xs font-mono-tech focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-strong)',
                      color: 'var(--ink-primary)',
                    }}
                  />
                  <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                    pts/day
                  </span>
                  <button
                    type="button"
                    disabled={savingGoal}
                    onClick={async () => {
                      setSavingGoal(true);
                      try {
                        await onUpdateDailyGoal(goalDraft);
                        setEditingGoal(false);
                      } finally {
                        setSavingGoal(false);
                      }
                    }}
                    className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {savingGoal ? '...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingGoal(false)}
                    className="text-[11px] px-1.5 cursor-pointer"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setGoalDraft(dailyGoal);
                    setEditingGoal(true);
                  }}
                  className="rounded-xl border px-3 py-1 text-[11px] font-medium transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--ink-secondary)',
                  }}
                >
                  Set Daily Goal
                </button>
              )}

              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                <span>0%</span>
                {palette.map((hex, idx) => (
                  <span key={idx} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: hex }} />
                ))}
                <span>100%</span>
              </div>
            </div>
          </div>

          {showHeatmapInfo && (
            <div
              className="rounded-2xl border p-3.5 text-[11px] leading-relaxed"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--ink-secondary)',
              }}
            >
              <strong>Heatmap Logic:</strong> Closed-book Active Recall earns <strong>+3 pts</strong>,
              saving a Note / Highlight / Glossary Term earns <strong>+2 pts</strong>, importing a
              Lecture earns <strong>+2 pts</strong>, and submitting a Quiz attempt earns{' '}
              <strong>+1 pt</strong>. Square shade reflects % of your daily goal ({dailyGoal} pts),
              turning darkest green when you hit 100%.
            </div>
          )}

          <div className="overflow-x-auto pb-1">
            <div className="inline-flex gap-1.5">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1.5">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date}: ${day.count} / ${dailyGoal} pts${day.goalMet ? ' (Goal Met!)' : ''}`}
                      className="h-4 w-4 sm:h-4.5 sm:w-4.5 rounded-[4px] transition-transform hover:scale-110"
                      style={{ backgroundColor: palette[Math.min(4, Math.max(0, day.level))] }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Two-Column Insights: General Weak Points (with Show More Course Breakdown) + Strong Points */}
        <section className="grid lg:grid-cols-2 gap-6 items-start">
          {/* General Weak Points & Review Overview */}
          <div
            className="rounded-3xl border p-6 space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" style={{ color: 'var(--warm)' }} />
                <h2 className="font-editorial text-xl font-medium">General Weak Points</h2>
              </div>
              <span
                className="text-[10px] font-medium px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--warm-soft)', color: 'var(--warm)' }}
              >
                Cross-Course Summary
              </span>
            </div>

            {!dashboard || dashboard.generalWeakPoints.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed p-6 text-center text-xs"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-muted)' }}
              >
                No general weak points detected yet. As you study, recall, and take quizzes, high-level
                patterns will surface here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dashboard.generalWeakPoints.map((item, idx) => (
                  <div
                    key={`${item.category}-${idx}`}
                    className="rounded-2xl border p-4 space-y-1.5"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-mono-tech text-[10px] uppercase tracking-wider font-semibold"
                        style={{
                          color: item.severity === 'high' ? 'var(--danger)' : 'var(--warm)',
                        }}
                      >
                        {item.category}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--ink-muted)' }}
                      >
                        {item.affectedCount} item{item.affectedCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold">{item.headline}</div>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
                      {item.observation}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Show More button -> reveals Detailed Course-by-Course Weak Points */}
            {dashboard && dashboard.detailedWeakPoints.length > 0 && (
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setShowDetailedWeakPoints((v) => !v)}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--accent)',
                  }}
                >
                  <span>
                    {showDetailedWeakPoints
                      ? 'Hide Detailed Course Weak Points'
                      : `Show More · Detailed Course Weak Points (${dashboard.detailedWeakPoints.length})`}
                  </span>
                  {showDetailedWeakPoints ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Strong Points */}
          <div
            className="rounded-3xl border p-6 space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: 'var(--sage)' }} />
                <h2 className="font-editorial text-xl font-medium">Strong Points</h2>
              </div>
              <span
                className="text-[10px] font-medium px-2.5 py-0.5 rounded-full"
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
                Complete a closed-book Active Recall session or score well on a quiz to see your
                strongest topics here.
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
        </section>

        {/* 5. Expanded Detailed Course Weak Points Panel (Only shown when pressing "Show More") */}
        {showDetailedWeakPoints && weakPointsByCourse.length > 0 && (
          <section
            className="rounded-3xl border p-6 space-y-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--warm-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-editorial text-2xl font-medium">
                  Detailed Course Weak Points & Review Queue
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-secondary)' }}>
                  Grouped by course — jump directly to any lecture or missed passage to review.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailedWeakPoints(false)}
                className="text-xs font-medium cursor-pointer"
                style={{ color: 'var(--ink-muted)' }}
              >
                Collapse
              </button>
            </div>

            <div className="space-y-5">
              {weakPointsByCourse.map(([courseName, items]) => (
                <div key={courseName} className="space-y-2.5">
                  <div
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    {courseName} ({items.length})
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {items.map((pt, idx) => (
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
                            {pt.reason}
                          </div>
                          {pt.pageNumber && (
                            <div className="font-mono-tech text-[10px] mt-1" style={{ color: 'var(--ink-muted)' }}>
                              Source · Page {pt.pageNumber} · Score {pt.scorePercent}%
                            </div>
                          )}
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
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
