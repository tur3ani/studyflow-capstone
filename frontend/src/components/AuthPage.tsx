import { useState, type FormEvent } from 'react';
import { ArrowRight, BookMarked, Compass, Languages, Moon, Sparkles, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

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
      className="min-h-screen flex flex-col lg:flex-row relative"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--ink-primary)' }}
    >
      <button
        type="button"
        onClick={toggleTheme}
        title="Toggle light/dark theme"
        className="fixed top-5 right-5 z-20 p-2.5 rounded-full border transition cursor-pointer"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--ink-secondary)',
        }}
      >
        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>

      {/* Left Editorial Brand Panel */}
      <section
        className="lg:w-[52%] p-10 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r"
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--accent)',
            }}
          >
            <BookMarked className="h-4.5 w-4.5" />
          </div>
          <span className="font-editorial text-xl font-semibold tracking-tight">StudyFlow</span>
        </div>

        <div className="my-12 max-w-lg">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border mb-6"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--warm)',
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Calm, Source-Grounded Bilingual Studying
          </div>

          <h1 className="font-editorial text-4xl lg:text-5xl leading-[1.12] font-medium tracking-tight">
            Read deeply. Explain in Arabic. Remember independently.
          </h1>

          <p
            className="mt-5 text-sm lg:text-base leading-relaxed"
            style={{ color: 'var(--ink-secondary)' }}
          >
            Turn dense lecture PDFs into structured passages, keep English technical terms intact
            inside Arabic explanations, and move gradually from AI guidance to active recall.
          </p>

          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            <div
              className="rounded-2xl p-4 border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <Languages className="h-4 w-4 mb-2.5" style={{ color: 'var(--accent)' }} />
              <div className="text-xs font-semibold">Bilingual Term Fidelity</div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
                Select any paragraph or term to generate editable Arabic explanations grounded to
                its exact source page.
              </p>
            </div>

            <div
              className="rounded-2xl p-4 border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <Compass className="h-4 w-4 mb-2.5" style={{ color: 'var(--sage)' }} />
              <div className="text-xs font-semibold">Guided → Independent</div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
                Practice closed-book active recall first, then compare directly against your source
                lectures and notes.
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
          ASP.NET Core · PostgreSQL · React Studio · AI-Ready Architecture
        </div>
      </section>

      {/* Right Form Panel */}
      <section className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div
          className="w-full max-w-md rounded-3xl border p-8 shadow-sm"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="mb-6">
            <h2 className="font-editorial text-2xl font-medium">
              {mode === 'register' ? 'Create your study desk' : 'Welcome back'}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-secondary)' }}>
              {mode === 'register'
                ? 'Starts with a ready-to-use Cloud Computing course workspace.'
                : 'Sign in to reopen your lectures, annotations, and recall history.'}
            </p>
          </div>

          <div
            className="grid grid-cols-2 rounded-xl p-1 mb-6 border"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className="py-2 text-xs font-medium rounded-lg transition cursor-pointer"
              style={
                mode === 'register'
                  ? { backgroundColor: 'var(--bg-surface)', color: 'var(--ink-primary)' }
                  : { color: 'var(--ink-muted)' }
              }
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="py-2 text-xs font-medium rounded-lg transition cursor-pointer"
              style={
                mode === 'login'
                  ? { backgroundColor: 'var(--bg-surface)', color: 'var(--ink-primary)' }
                  : { color: 'var(--ink-muted)' }
              }
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-secondary)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Mohammad Turani"
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--ink-primary)',
                  }}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-secondary)' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
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
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--ink-primary)',
                }}
              />
            </div>

            {error && (
              <div
                className="rounded-xl px-3.5 py-2.5 text-xs border"
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
              className="w-full rounded-xl py-2.5 text-sm font-medium text-white transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}
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
