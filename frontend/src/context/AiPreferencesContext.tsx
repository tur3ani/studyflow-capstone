import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type StudyProfileId = 'pure' | 'balanced' | 'full' | 'custom';

export interface StudyProfilePreset {
  id: Exclude<StudyProfileId, 'custom'>;
  name: string;
  tagline: string;
  explanations: boolean;
  quizDrafts: boolean;
  recallHints: boolean;
}

export const DEFAULT_STUDY_PROFILES: StudyProfilePreset[] = [
  {
    id: 'pure',
    name: 'Pure Study',
    tagline: '100% non-AI pipeline — highlights, manual notes, glossary, recall & self-authored quizzes',
    explanations: false,
    quizDrafts: false,
    recallHints: false,
  },
  {
    id: 'balanced',
    name: 'Guided Companion',
    tagline: 'Non-AI workflow first, with optional AI explanations & hints when you get stuck',
    explanations: true,
    quizDrafts: false,
    recallHints: true,
  },
  {
    id: 'full',
    name: 'Full AI Assist',
    tagline: 'All optional AI helpers enabled (explanations, quiz drafts, and recall hints)',
    explanations: true,
    quizDrafts: true,
    recallHints: true,
  },
];

export interface AiPreferences {
  profileId: StudyProfileId;
  customProfileName: string;
  explanations: boolean;
  quizDrafts: boolean;
  recallHints: boolean;
}

interface AiPreferencesContextValue {
  prefs: AiPreferences;
  activeProfileLabel: string;
  activeFeatureCount: number;
  canUseAiExplain: boolean;
  canUseAiQuiz: boolean;
  canUseAiHints: boolean;
  selectProfile: (profileId: StudyProfileId) => void;
  setCustomProfileName: (name: string) => void;
  toggleCustomFeature: (feature: 'explanations' | 'quizDrafts' | 'recallHints') => void;
}

const STORAGE_KEY = 'studyflow_mode_profiles_v2';

const DEFAULT_PREFS: AiPreferences = {
  profileId: 'pure',
  customProfileName: 'My Custom Mode',
  explanations: false,
  quizDrafts: false,
  recallHints: false,
};

const AiPreferencesContext = createContext<AiPreferencesContextValue | null>(null);

export function AiPreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AiPreferences>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PREFS;
      const parsed = JSON.parse(raw) as Partial<AiPreferences>;
      return { ...DEFAULT_PREFS, ...parsed };
    } catch {
      return DEFAULT_PREFS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const selectProfile = (profileId: StudyProfileId) => {
    if (profileId === 'custom') {
      setPrefs((prev) => ({ ...prev, profileId: 'custom' }));
      return;
    }
    const preset = DEFAULT_STUDY_PROFILES.find((p) => p.id === profileId) ?? DEFAULT_STUDY_PROFILES[0];
    setPrefs((prev) => ({
      ...prev,
      profileId: preset.id,
      explanations: preset.explanations,
      quizDrafts: preset.quizDrafts,
      recallHints: preset.recallHints,
    }));
  };

  const setCustomProfileName = (name: string) => {
    setPrefs((prev) => ({
      ...prev,
      profileId: 'custom',
      customProfileName: name,
    }));
  };

  const toggleCustomFeature = (feature: 'explanations' | 'quizDrafts' | 'recallHints') => {
    setPrefs((prev) => ({
      ...prev,
      profileId: 'custom',
      [feature]: !prev[feature],
    }));
  };

  const canUseAiExplain = prefs.explanations;
  const canUseAiQuiz = prefs.quizDrafts;
  const canUseAiHints = prefs.recallHints;
  const activeFeatureCount =
    (canUseAiExplain ? 1 : 0) + (canUseAiQuiz ? 1 : 0) + (canUseAiHints ? 1 : 0);

  const activeProfileLabel =
    prefs.profileId === 'custom'
      ? prefs.customProfileName.trim() || 'Custom Mode'
      : (DEFAULT_STUDY_PROFILES.find((p) => p.id === prefs.profileId)?.name ?? 'Pure Study');

  return (
    <AiPreferencesContext.Provider
      value={{
        prefs,
        activeProfileLabel,
        activeFeatureCount,
        canUseAiExplain,
        canUseAiQuiz,
        canUseAiHints,
        selectProfile,
        setCustomProfileName,
        toggleCustomFeature,
      }}
    >
      {children}
    </AiPreferencesContext.Provider>
  );
}

export function useAiPreferences(): AiPreferencesContextValue {
  const ctx = useContext(AiPreferencesContext);
  if (!ctx) {
    throw new Error('useAiPreferences must be used inside AiPreferencesProvider');
  }
  return ctx;
}
