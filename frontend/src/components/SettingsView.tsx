import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  Flame,
  Moon,
  Save,
  Settings,
  Sliders,
  Sparkles,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import {
  DEFAULT_STUDY_PROFILES,
  useAiPreferences,
} from '../context/AiPreferencesContext';
import { useTheme } from '../context/ThemeContext';
import type { UpdateProfileRequest, UserDto } from '../types/models';

interface SettingsViewProps {
  user: UserDto;
  onSaveProfile: (payload: UpdateProfileRequest) => Promise<void>;
}

const GOAL_PRESETS = [
  { points: 4, label: 'Light (4 pts/day)', desc: '~2 notes or 1 recall session' },
  { points: 6, label: 'Steady (6 pts/day)', desc: '1 recall + 2 notes or quiz checks' },
  { points: 10, label: 'Focused (10 pts/day)', desc: 'Full lecture review + recall + quiz' },
  { points: 15, label: 'Exam Prep (15 pts/day)', desc: 'Intensive multi-lecture revision' },
];

export function SettingsView({ user, onSaveProfile }: SettingsViewProps) {
  const { theme, toggleTheme } = useTheme();
  const {
    prefs,
    selectProfile,
    setCustomProfileName,
    toggleCustomFeature,
  } = useAiPreferences();

  const [displayName, setDisplayName] = useState(user.displayName);
  const [preferredLanguage, setPreferredLanguage] = useState(user.preferredLanguage);
  const [dailyGoalPoints, setDailyGoalPoints] = useState(user.dailyGoalPoints || 6);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(user.displayName);
    setPreferredLanguage(user.preferredLanguage);
    setDailyGoalPoints(user.dailyGoalPoints || 6);
  }, [user.displayName, user.preferredLanguage, user.dailyGoalPoints]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await onSaveProfile({
        displayName: displayName.trim(),
        preferredLanguage,
        dailyGoalPoints,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-14 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <div
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest mb-1.5"
            style={{ color: 'var(--accent)' }}
          >
            <Settings className="h-3.5 w-3.5" />
            Workspace Settings
          </div>
          <h1 className="font-editorial text-4xl font-medium tracking-tight">
            Preferences & Study Goals
          </h1>
          <p className="text-xs mt-1.5" style={{ color: 'var(--ink-secondary)' }}>
            Configure your profile, daily heatmap goal, optional AI mode profile, and reading theme.
          </p>
        </header>

        {/* Form: Profile + Daily Study Goal (Persisted in PostgreSQL) */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Student Profile */}
          <section
            className="rounded-3xl border p-6 space-y-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              <h2 className="font-editorial text-xl font-medium">Student Profile</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-secondary)' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setSaved(false);
                  }}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--ink-primary)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-secondary)' }}>
                  Preferred Explanation / Notes Language
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => {
                    setPreferredLanguage(e.target.value);
                    setSaved(false);
                  }}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--ink-primary)',
                  }}
                >
                  <option value="ar">العربية (Arabic with English technical terms)</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              Signed in as <strong>{user.email}</strong>
            </div>
          </section>

          {/* 2. Daily Study Goal & Heatmap Scoring Logic */}
          <section
            className="rounded-3xl border p-6 space-y-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4" style={{ color: 'var(--warm)' }} />
                <h2 className="font-editorial text-xl font-medium">Daily Study Goal & Heatmap Logic</h2>
              </div>
              <span
                className="font-mono-tech text-xs font-semibold px-3 py-1 rounded-full"
                style={{ backgroundColor: 'var(--sage-soft)', color: 'var(--sage)' }}
              >
                Target: {dailyGoalPoints} pts / day
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {GOAL_PRESETS.map((preset) => {
                const selected = dailyGoalPoints === preset.points;
                return (
                  <button
                    key={preset.points}
                    type="button"
                    onClick={() => {
                      setDailyGoalPoints(preset.points);
                      setSaved(false);
                    }}
                    className="text-left rounded-2xl border p-3.5 transition cursor-pointer"
                    style={{
                      backgroundColor: selected ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                      borderColor: selected ? 'var(--accent-border)' : 'var(--border-subtle)',
                    }}
                  >
                    <div className="text-xs font-semibold">{preset.label}</div>
                    <div className="text-[11px] mt-1" style={{ color: 'var(--ink-muted)' }}>
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min={2}
                max={25}
                value={dailyGoalPoints}
                onChange={(e) => {
                  setDailyGoalPoints(Number(e.target.value));
                  setSaved(false);
                }}
                className="flex-1 accent-[#8052ff]"
              />
              <input
                type="number"
                min={2}
                max={50}
                value={dailyGoalPoints}
                onChange={(e) => {
                  setDailyGoalPoints(Math.max(2, Math.min(50, Number(e.target.value) || 6)));
                  setSaved(false);
                }}
                className="w-20 rounded-xl border px-3 py-1.5 text-center font-mono-tech text-xs focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--ink-primary)',
                }}
              />
            </div>

            {/* Transparent Heatmap Formula Breakdown */}
            <div
              className="rounded-2xl border p-4 text-xs space-y-2"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="font-semibold">How your Study Heatmap is calculated</div>
              <div className="grid sm:grid-cols-2 gap-2 text-[11px]" style={{ color: 'var(--ink-secondary)' }}>
                <div>• <strong>+3 pts</strong> — Closed-book Active Recall entry</div>
                <div>• <strong>+2 pts</strong> — Note, Highlight, or Glossary Term saved</div>
                <div>• <strong>+2 pts</strong> — Lecture PDF imported</div>
                <div>• <strong>+1 pt</strong> — Quiz attempt submitted or session started</div>
              </div>
              <p className="text-[11px] pt-1" style={{ color: 'var(--ink-muted)' }}>
                Each square on the 12-week heatmap scales from 0% to 100% of your{' '}
                <strong>{dailyGoalPoints} pt</strong> daily goal (darkest green = daily goal met).
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: saved ? 'var(--sage)' : 'var(--accent)' }}
              >
                {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : saved ? 'Saved to Profile' : 'Save Profile & Goal'}
              </button>
            </div>
          </section>
        </form>

        {/* 3. Study Mode Profiles (Synced live with Sidebar Mode) */}
        <section
          className="rounded-3xl border p-6 space-y-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <h2 className="font-editorial text-xl font-medium">Study Mode & Optional AI Profiles</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {DEFAULT_STUDY_PROFILES.map((profile) => {
              const selected = prefs.profileId === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => selectProfile(profile.id)}
                  className="text-left rounded-2xl border p-4 transition cursor-pointer flex items-start justify-between gap-2"
                  style={{
                    backgroundColor: selected ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                    borderColor: selected ? 'var(--accent-border)' : 'var(--border-subtle)',
                  }}
                >
                  <div>
                    <div className="text-xs font-semibold">{profile.name}</div>
                    <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
                      {profile.tagline}
                    </p>
                  </div>
                  {selected && <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => selectProfile('custom')}
              className="text-left rounded-2xl border p-4 transition cursor-pointer flex items-start justify-between gap-2"
              style={{
                backgroundColor: prefs.profileId === 'custom' ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                borderColor: prefs.profileId === 'custom' ? 'var(--accent-border)' : 'var(--border-subtle)',
              }}
            >
              <div>
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5" style={{ color: 'var(--warm)' }} />
                  Custom Profile
                </div>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
                  Name your own study profile and toggle individual optional AI helpers below.
                </p>
              </div>
              {prefs.profileId === 'custom' && (
                <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
              )}
            </button>
          </div>

          {prefs.profileId === 'custom' && (
            <div
              className="rounded-2xl border p-4 space-y-3"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--ink-secondary)' }}>
                  Custom Profile Name
                </label>
                <input
                  type="text"
                  value={prefs.customProfileName}
                  onChange={(e) => setCustomProfileName(e.target.value)}
                  className="w-full max-w-sm rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--ink-primary)',
                  }}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-2.5">
                {(
                  [
                    ['explanations', 'AI Explanations', 'Optional paragraph & term helper'],
                    ['quizDrafts', 'AI Quiz Drafts', 'Generate draft quiz questions'],
                    ['recallHints', 'Recall Hints', 'Hints after closed-book recall'],
                  ] as const
                ).map(([key, title, desc]) => {
                  const on = prefs[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleCustomFeature(key)}
                      className="text-left rounded-xl border p-3 transition cursor-pointer"
                      style={{
                        backgroundColor: on ? 'var(--accent-soft)' : 'var(--bg-surface)',
                        borderColor: on ? 'var(--accent-border)' : 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{title}</span>
                        <span style={{ color: on ? 'var(--accent)' : 'var(--ink-muted)' }}>
                          {on ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <div className="text-[10px] mt-1" style={{ color: 'var(--ink-muted)' }}>
                        {desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* 4. Appearance */}
        <section
          className="rounded-3xl border p-6 space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <h2 className="font-editorial text-2xl">Appearance</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => theme !== 'dark' && toggleTheme()}
              className="rounded-2xl border p-4 text-left flex items-center justify-between cursor-pointer"
              style={{
                backgroundColor: theme === 'dark' ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                borderColor: theme === 'dark' ? 'var(--accent-border)' : 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-3">
                <Moon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                <div>
                  <div className="text-xs font-semibold flex items-center gap-2">
                    <span>Black Velvet (Dark)</span>
                    <span className="inline-flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-black border border-white/25" />
                      <span className="h-2 w-2 rounded-full bg-[#8052ff]" />
                      <span className="h-2 w-2 rounded-full bg-[#ffb829]" />
                      <span className="h-2 w-2 rounded-full bg-[#15846e]" />
                    </span>
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                    Pure black void, Electric Iris pills & Saffron sparks
                  </div>
                </div>
              </div>
              {theme === 'dark' && <Check className="h-4 w-4" style={{ color: 'var(--accent)' }} />}
            </button>

            <button
              type="button"
              onClick={() => theme !== 'light' && toggleTheme()}
              className="rounded-2xl border p-4 text-left flex items-center justify-between cursor-pointer"
              style={{
                backgroundColor: theme === 'light' ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                borderColor: theme === 'light' ? 'var(--accent-border)' : 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-3">
                <Sun className="h-4 w-4" style={{ color: 'var(--warm)' }} />
                <div>
                  <div className="text-xs font-semibold">Editorial Paper (Light)</div>
                  <div className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                    Warm alabaster canvas harmonized with Iris & Verdant
                  </div>
                </div>
              </div>
              {theme === 'light' && <Check className="h-4 w-4" style={{ color: 'var(--accent)' }} />}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
