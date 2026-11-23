import { useEffect, useRef, useState } from 'react';
import { BookOpenCheck, Check, ChevronUp, Sliders, Sparkles } from 'lucide-react';
import {
  DEFAULT_STUDY_PROFILES,
  useAiPreferences,
  type StudyProfileId,
} from '../context/AiPreferencesContext';

interface StudyModePickerProps {
  aiProviderMode?: string;
}

export function StudyModePicker({ aiProviderMode }: StudyModePickerProps) {
  const {
    prefs,
    activeProfileLabel,
    activeFeatureCount,
    selectProfile,
    setCustomProfileName,
    toggleCustomFeature,
  } = useAiPreferences();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  const isPure = activeFeatureCount === 0;

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-[11px] transition cursor-pointer"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: open ? 'var(--accent-border)' : 'var(--border-subtle)',
        }}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {isPure ? (
            <BookOpenCheck className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--sage)' }} />
          ) : (
            <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
          )}
          <span className="truncate font-medium" style={{ color: 'var(--ink-primary)' }}>
            {activeProfileLabel}
          </span>
        </span>
        <ChevronUp
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--ink-muted)' }}
        />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 w-80 rounded-2xl border p-4 shadow-2xl z-50 space-y-3.5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold">Study Mode Profiles</div>
              <div className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                Pick a default profile or customize AI helpers
              </div>
            </div>
            {aiProviderMode && activeFeatureCount > 0 && (
              <span
                className="font-mono-tech text-[10px] px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--ink-muted)' }}
              >
                {aiProviderMode === 'mock' ? 'Mock AI' : 'Python'}
              </span>
            )}
          </div>

          {/* 3 Default Profiles */}
          <div className="space-y-1.5">
            {DEFAULT_STUDY_PROFILES.map((profile) => {
              const selected = prefs.profileId === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => selectProfile(profile.id)}
                  className="w-full text-left rounded-xl border px-3 py-2.5 transition cursor-pointer flex items-start justify-between gap-2.5"
                  style={{
                    backgroundColor: selected ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                    borderColor: selected ? 'var(--accent-border)' : 'var(--border-subtle)',
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <span>{profile.name}</span>
                      {profile.id === 'pure' && (
                        <span
                          className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: 'var(--sage-soft)', color: 'var(--sage)' }}
                        >
                          No AI
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--ink-secondary)' }}>
                      {profile.tagline}
                    </p>
                  </div>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                  )}
                </button>
              );
            })}

            {/* 4th Option: Custom Profile */}
            <button
              type="button"
              onClick={() => selectProfile('custom' as StudyProfileId)}
              className="w-full text-left rounded-xl border px-3 py-2.5 transition cursor-pointer flex items-center justify-between gap-2"
              style={{
                backgroundColor: prefs.profileId === 'custom' ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                borderColor: prefs.profileId === 'custom' ? 'var(--accent-border)' : 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sliders className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--warm)' }} />
                <div>
                  <div className="text-xs font-semibold">Custom Profile</div>
                  <div className="text-[10px]" style={{ color: 'var(--ink-secondary)' }}>
                    Choose exact AI features individually
                  </div>
                </div>
              </div>
              {prefs.profileId === 'custom' && (
                <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
              )}
            </button>
          </div>

          {/* Custom Profile Granular Editor */}
          {prefs.profileId === 'custom' && (
            <div
              className="pt-3 border-t space-y-2.5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <input
                type="text"
                value={prefs.customProfileName}
                onChange={(e) => setCustomProfileName(e.target.value)}
                placeholder="Custom profile name..."
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--ink-primary)',
                }}
              />

              {(
                [
                  ['explanations', 'Paragraph & Term Explanations'],
                  ['quizDrafts', 'AI Quiz Draft Generator'],
                  ['recallHints', 'Recall Hints & Feedback'],
                ] as const
              ).map(([key, label]) => {
                const on = prefs[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleCustomFeature(key)}
                    className="w-full flex items-center justify-between text-xs py-1 cursor-pointer"
                  >
                    <span style={{ color: 'var(--ink-secondary)' }}>{label}</span>
                    <span
                      className="h-4.5 w-8 rounded-full p-0.5 flex items-center transition"
                      style={{
                        backgroundColor: on ? 'var(--accent)' : 'var(--border-strong)',
                        justifyContent: on ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <span className="h-3.5 w-3.5 rounded-full bg-white block" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
