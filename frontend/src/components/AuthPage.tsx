import { useState, type FormEvent } from 'react';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { BrandMark } from './BrandMark';
import { ConstellationBrain } from './ConstellationBrain';

export function AuthPage() {
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, displayName, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--ink-primary)' }}
    >
      {/* Minimal Top-Right Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        title="Toggle Black Velvet / Editorial Light"
        className="fixed top-6 right-6 z-20 p-2.5 rounded-full border transition cursor-pointer"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--ink-muted)',
        }}
      >
        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>

      {/* Left Stage: Pure Velvet Void + Sculptural Type + Procedural Constellation Brain */}
      <section className="lg:w-[58%] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Brand Lockup */}
        <div className="relative z-10 flex items-center gap-3">
          <BrandMark size={28} />
          <span className="text-sm font-semibold tracking-tight">StudyFlow</span>
          <span className="eyebrow-spark ml-2 hidden sm:inline">Pure Study First</span>
        </div>

        {/* Asymmetric Hero Composition + Floating Constellation Brain */}
        <div className="relative z-10 my-10 lg:my-0 grid md:grid-cols-[1.15fr_0.95fr] items-center gap-6">
          <div className="space-y-6">
            <div className="eyebrow-spark">
              Distributed Knowledge · Optional AI
            </div>

            <h1 className="font-editorial text-5xl sm:text-6xl xl:text-[68px]">
              Study deeply. Own every concept.
            </h1>

            <p
              className="text-airy text-base sm:text-lg max-w-md"
              style={{ color: 'var(--ink-secondary)' }}
            >
              Read lectures with highlights, margin notes, personal glossaries, closed-book recall,
              and self-authored quizzes — completely without AI, or opt in only when you want help.
            </p>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--sage)' }} />
                <span style={{ color: 'var(--ink-muted)' }}>100% Non-AI Core Pipeline</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--warm)' }} />
                <span style={{ color: 'var(--ink-muted)' }}>Arabic & English Term Fidelity</span>
              </div>
            </div>
          </div>

          {/* Signature Procedural Chromatic Triangle Constellation */}
          <div className="h-[280px] sm:h-[340px] lg:h-[400px] w-full">
            <ConstellationBrain variant="hero" energy={85} />
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--ink-muted)' }}>
          <span>ASP.NET Core</span>
          <span>·</span>
          <span>PostgreSQL</span>
          <span>·</span>
          <span>React Studio</span>
        </div>
      </section>

      {/* Right Stage: Minimalist Floating Auth Form */}
      <section
        className="flex-1 flex items-center justify-center p-8 lg:p-14 border-t lg:border-t-0 lg:border-l"
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="w-full max-w-md space-y-7">
          <div>
            <div className="eyebrow-spark mb-2">
              {mode === 'register' ? 'New Workspace' : 'Welcome Back'}
            </div>
            <h2 className="font-editorial text-3xl sm:text-4xl">
              {mode === 'register' ? 'Enter your study desk.' : 'Continue studying.'}
            </h2>
            <p className="text-airy text-sm mt-2" style={{ color: 'var(--ink-muted)' }}>
              {mode === 'register'
                ? 'Starts with a clean Cloud Computing starter course and Pure Study mode enabled.'
                : 'Sign in to reopen your courses, highlights, notes, and recall history.'}
            </p>
          </div>

          {/* Ghost Text Mode Switcher */}
          <div className="flex items-center gap-6 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className="text-xs uppercase tracking-[0.06em] font-semibold transition cursor-pointer"
              style={{
                color: mode === 'register' ? 'var(--ink-primary)' : 'var(--ink-muted)',
              }}
            >
              Create Account
              {mode === 'register' && (
                <span className="block h-0.5 mt-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="text-xs uppercase tracking-[0.06em] font-semibold transition cursor-pointer"
              style={{
                color: mode === 'login' ? 'var(--ink-primary)' : 'var(--ink-muted)',
              }}
            >
              Sign In
              {mode === 'login' && (
                <span className="block h-0.5 mt-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] uppercase tracking-[0.06em] font-semibold mb-2" style={{ color: 'var(--ink-muted)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Mohammad Turani"
                  className="w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none transition"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--ink-primary)',
                  }}
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] uppercase tracking-[0.06em] font-semibold mb-2" style={{ color: 'var(--ink-muted)' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none transition"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--ink-primary)',
                }}
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.06em] font-semibold mb-2" style={{ color: 'var(--ink-muted)' }}>
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none transition"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--ink-primary)',
                }}
              />
            </div>

            {error && (
              <div
                className="rounded-2xl px-4 py-3 text-xs border"
                style={{
                  backgroundColor: 'var(--danger-soft)',
                  borderColor: 'var(--danger)',
                  color: 'var(--danger)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-iris w-full py-3.5 text-xs uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {submitting
                ? 'Opening workspace...'
                : mode === 'register'
                  ? 'Enter Study Studio'
                  : 'Sign In'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
