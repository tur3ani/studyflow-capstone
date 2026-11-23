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
import { useTheme } from '../context/ThemeContext';
import type { DashboardResponse, InsightPointDto } from '../types/models';
import { ConstellationBrain } from './ConstellationBrain';

interface DashboardHomeProps {
  dashboard: DashboardResponse | null;
  onUpdateDailyGoal: (goalPoints: number) => Promise<void>;
  onOpenSettings: () => void;
  onJumpToInsight: (insight: InsightPointDto) => Promise<void>;
}

const HEATMAP_COLORS_LIGHT = ['#eceae4', '#bde7dd', '#5cc5af', '#249c83', '#15846e'];
const HEATMAP_COLORS_DARK = ['#121218', '#153932', '#176656', '#4a47b8', '#8052ff'];

export function DashboardHome({
  dashboard,
  onUpdateDailyGoal,
  onOpenSettings,
  onJumpToInsight,
}: DashboardHomeProps) {
  const { theme } = useTheme();
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

  const weeks = useMemo(() => {
    if (!dashboard?.heatmap) return [];
    const grouped: typeof dashboard.heatmap[] = [];
    for (let i = 0; i < dashboard.heatmap.length; i += 7) {
      grouped.push(dashboard.heatmap.slice(i, i + 7));
    }
    return grouped;
  }, [dashboard?.heatmap]);

  const weakPointsByCourse = useMemo(() => {
    const map = new Map<string, InsightPointDto[]>();
    for (const item of dashboard?.detailedWeakPoints ?? []) {
      const list = map.get(item.courseName) ?? [];
      list.push(item);
      map.set(item.courseName, list);
    }
    return Array.from(map.entries());
  }, [dashboard?.detailedWeakPoints]);

  const palette = theme === 'dark' ? HEATMAP_COLORS_DARK : HEATMAP_COLORS_LIGHT;

  const dailyGoal = dashboard?.dailyGoalPoints ?? 6;
  const todayPoints = dashboard?.todayPoints ?? 0;
  const todayPct = Math.min(100, Math.round((todayPoints / Math.max(1, dailyGoal)) * 100));

  return (
    <div className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-14 py-9">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* 1. Constellation Velvet Hero Banner — Profile + Sculptural Greeting + Living Brain Field */}
        <section
          className="rounded-3xl border p-7 sm:p-9 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="grid lg:grid-cols-[1.35fr_0.85fr] items-center gap-6 relative z-10">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div
                  className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-semibold border shrink-0"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    borderColor: 'var(--accent-border)',
                    color: 'var(--accent)',
                  }}
                >
                  {initials || 'S'}
                </div>
                <div>
                  <div className="eyebrow-spark">Knowledge Constellation</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                    {dashboard?.email} · {dashboard?.preferredLanguage?.toUpperCase() ?? 'AR'} / EN
                  </div>
                </div>
              </div>

              <div>
                <h1 className="font-editorial text-4xl sm:text-5xl">
                  {dashboard?.displayName ?? 'Student Studio'}
                </h1>
                <p className="text-airy text-sm sm:text-base mt-2 max-w-lg" style={{ color: 'var(--ink-secondary)' }}>
                  Your courses live in the sidebar. Track daily consistency, spot weak concepts
                  early, and build independent recall over time.
                </p>
              </div>

              {/* Chromatic Status Sparks + Today's Goal Inline Bar */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: 'var(--warm-soft)',
                    borderColor: 'var(--warm-border)',
                    color: 'var(--warm)',
                  }}
                >
                  <Flame className="h-3.5 w-3.5" />
                  {dashboard?.currentStreakDays ?? 0} day streak
                </span>

                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: 'var(--sage-soft)',
                    borderColor: 'var(--sage-border)',
                    color: 'var(--sage)',
                  }}
                >
                  <Target className="h-3.5 w-3.5" />
                  {dashboard?.independenceScorePercent ?? 0}% Independence
                </span>

                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition cursor-pointer hover:opacity-80"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Preferences
                </button>
              </div>

              {/* Sleek Today's Goal Progress Strip */}
              <div className="max-w-md pt-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="uppercase tracking-[0.06em] font-semibold" style={{ color: 'var(--ink-muted)' }}>
                    Today's Goal
                  </span>
                  <span
                    className="font-mono-tech font-medium"
                    style={{ color: todayPct >= 100 ? 'var(--sage)' : 'var(--warm)' }}
                  >
                    {todayPoints} / {dailyGoal} pts ({todayPct}%)
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-hover)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(todayPoints > 0 ? 6 : 0, todayPct)}%`,
                      backgroundColor: todayPct >= 100 ? 'var(--sage)' : 'var(--accent)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Living Procedural Knowledge Constellation */}
            <div className="h-[190px] sm:h-[220px] w-full">
              <ConstellationBrain
                variant="dashboard"
                energy={Math.max(35, dashboard?.independenceScorePercent ?? 50)}
              />
            </div>
          </div>
        </section>

        {/* 2. Weightless Metric Row (Scale for hierarchy, zero drop shadows) */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Lectures', value: dashboard?.totalLectures ?? 0, icon: BookOpen, color: 'var(--accent)' },
            { label: 'Notes & Highlights', value: dashboard?.totalNotes ?? 0, icon: NotebookPen, color: 'var(--warm)' },
            { label: 'Active Recalls', value: dashboard?.totalRecallSessions ?? 0, icon: Brain, color: 'var(--sage)' },
            { label: 'Quiz Attempts', value: dashboard?.totalQuizAttempts ?? 0, icon: Award, color: 'var(--accent)' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-3xl border px-5 py-4 flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div>
                  <div className="text-[11px] uppercase tracking-[0.06em] font-semibold" style={{ color: 'var(--ink-muted)' }}>
                    {stat.label}
                  </div>
                  <div className="font-editorial text-3xl mt-1">{stat.value}</div>
                </div>
                <Icon className="h-4 w-4 opacity-80" style={{ color: stat.color }} />
              </div>
            );
          })}
        </section>

        {/* 3. Goal-Scaled Study Consistency Heatmap */}
        <section
          className="rounded-3xl border p-6 sm:p-7 space-y-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-2xl">Study Consistency Heatmap</h2>
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
              <p className="text-airy text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>
                12 weeks scaled to your daily target ({dailyGoal} pts/day) ·{' '}
                <span style={{ color: 'var(--ink-primary)' }}>{dashboard?.goalMetDays ?? 0}</span> goal days reached
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
                    onChange={(e) =>
                      setGoalDraft(Math.max(2, Math.min(50, Number(e.target.value) || 6)))
                    }
                    className="w-16 rounded-full border px-3 py-1 text-xs font-mono-tech text-center focus:outline-none"
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
                    className="btn-iris px-3.5 py-1 text-[11px] uppercase cursor-pointer"
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
                  className="rounded-full border px-3.5 py-1 text-[11px] font-medium transition cursor-pointer hover:opacity-85"
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
              className="rounded-2xl border p-4 text-xs leading-relaxed"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--ink-secondary)',
              }}
            >
              <strong style={{ color: 'var(--warm)' }}>Heatmap Formula:</strong> Active Recall
              entry <strong>+3 pts</strong> · Note / Highlight / Glossary Term <strong>+2 pts</strong> ·
              Lecture import <strong>+2 pts</strong> · Quiz attempt <strong>+1 pt</strong>. Each
              square scales from 0% to 100% of your {dailyGoal} pt daily goal.
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

        {/* 4. Two-Column Insights: General Weak Points (+ Show More) & Strong Points */}
        <section className="grid lg:grid-cols-2 gap-6 items-start">
          {/* General Weak Points */}
          <div
            className="rounded-3xl border p-6 sm:p-7 space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4" style={{ color: 'var(--warm)' }} />
                <h2 className="font-editorial text-2xl">General Weak Points</h2>
              </div>
              <span className="eyebrow-spark">Summary</span>
            </div>

            {!dashboard || dashboard.generalWeakPoints.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed p-6 text-center text-xs"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-muted)' }}
              >
                No general weak points detected yet. High-level study patterns will appear here as
                you recall and quiz yourself.
              </div>
            ) : (
              <div className="space-y-3">
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
                        className="font-mono-tech text-[10px] uppercase tracking-[0.08em] font-semibold"
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
                    <div className="text-sm font-normal">{item.headline}</div>
                    <p className="text-airy text-xs" style={{ color: 'var(--ink-secondary)' }}>
                      {item.observation}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {dashboard && dashboard.detailedWeakPoints.length > 0 && (
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setShowDetailedWeakPoints((v) => !v)}
                  className="w-full flex items-center justify-between rounded-full px-4 py-2 text-xs font-medium transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--warm)',
                  }}
                >
                  <span>
                    {showDetailedWeakPoints
                      ? 'Hide Detailed Course Breakdown'
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
            className="rounded-3xl border p-6 sm:p-7 space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-4 w-4" style={{ color: 'var(--sage)' }} />
                <h2 className="font-editorial text-2xl">Strong Points</h2>
              </div>
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: 'var(--sage)' }}
              >
                Mastered
              </span>
            </div>

            {!dashboard || dashboard.strongPoints.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed p-6 text-center text-xs"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-muted)' }}
              >
                Complete an Active Recall check or score well on a quiz to see your strongest topics
                here.
              </div>
            ) : (
              <div className="space-y-3">
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
                      <span className="text-sm font-normal truncate" dir="auto">
                        {pt.title}
                      </span>
                      <span
                        className="font-mono-tech text-xs font-semibold shrink-0"
                        style={{ color: 'var(--sage)' }}
                      >
                        {pt.scorePercent}%
                      </span>
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                      {pt.courseName} · {pt.reason}
                    </div>
                    <div
                      className="mt-3 h-1 rounded-full overflow-hidden"
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

        {/* 5. Detailed Course Weak Points Panel (Revealed on "Show More") */}
        {showDetailedWeakPoints && weakPointsByCourse.length > 0 && (
          <section
            className="rounded-3xl border p-6 sm:p-7 space-y-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--warm-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow-spark mb-1">Course Breakdown</div>
                <h3 className="font-editorial text-2xl">
                  Detailed Weak Points & Review Queue
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailedWeakPoints(false)}
                className="text-xs cursor-pointer"
                style={{ color: 'var(--ink-muted)' }}
              >
                Collapse
              </button>
            </div>

            <div className="space-y-5">
              {weakPointsByCourse.map(([courseName, items]) => (
                <div key={courseName} className="space-y-2.5">
                  <div
                    className="text-[11px] font-semibold uppercase tracking-[0.08em]"
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
                          <div className="text-xs font-medium truncate" dir="auto">
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
                          className="btn-iris shrink-0 inline-flex items-center gap-1 px-3.5 py-1.5 text-[11px] uppercase cursor-pointer"
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
