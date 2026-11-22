import type {
  AuthResponse,
  CreateNoteRequest,
  CreateStudySessionRequest,
  DashboardResponse,
  DocumentDetailDto,
  DocumentSummaryDto,
  ExplainChunkRequest,
  ExplainChunkResponse,
  HealthResponse,
  ProjectSummaryDto,
  QuizQuestionDto,
  StudyNoteDto,
  StudySessionDto,
  SubmitQuizAttemptResponse,
  UpdateNoteRequest,
  UserDto,
} from '../types/models';

const TOKEN_STORAGE_KEY = 'studyflow_access_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, { ...init, headers });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { message?: string; title?: string };
      errorMessage = data.message || data.title || errorMessage;
    } catch {
      // Fallback to default message
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),

  register: (payload: {
    email: string;
    displayName: string;
    password: string;
    preferredLanguage?: string;
  }) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => request<UserDto>('/api/auth/me'),

  listProjects: () => request<ProjectSummaryDto[]>('/api/projects'),

  createProject: (payload: { name: string; courseCode?: string; description?: string }) =>
    request<ProjectSummaryDto>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteProject: (projectId: string) =>
    request<void>(`/api/projects/${projectId}`, { method: 'DELETE' }),

  listDocuments: (projectId: string) =>
    request<DocumentSummaryDto[]>(`/api/projects/${projectId}/documents`),

  uploadDocument: (projectId: string, file: File, title?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title?.trim()) {
      formData.append('title', title.trim());
    }
    return request<DocumentDetailDto>(`/api/projects/${projectId}/documents`, {
      method: 'POST',
      body: formData,
    });
  },

  getDocument: (documentId: string) =>
    request<DocumentDetailDto>(`/api/documents/${documentId}`),

  reprocessDocument: (documentId: string) =>
    request<DocumentDetailDto>(`/api/documents/${documentId}/reprocess`, {
      method: 'POST',
    }),

  deleteDocument: (documentId: string) =>
    request<void>(`/api/documents/${documentId}`, { method: 'DELETE' }),

  fetchDocumentBlob: async (documentId: string): Promise<Blob> => {
    const token = getStoredToken();
    const response = await fetch(`/api/documents/${documentId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error('Could not load original PDF from private storage.');
    }
    return await response.blob();
  },

  explainChunk: (chunkId: string, payload: ExplainChunkRequest) =>
    request<ExplainChunkResponse>(`/api/chunks/${chunkId}/explain`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listNotes: (projectId: string, documentId?: string) => {
    const params = new URLSearchParams({ projectId });
    if (documentId) {
      params.set('documentId', documentId);
    }
    return request<StudyNoteDto[]>(`/api/notes?${params.toString()}`);
  },

  createNote: (payload: CreateNoteRequest) =>
    request<StudyNoteDto>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateNote: (noteId: string, payload: UpdateNoteRequest) =>
    request<StudyNoteDto>(`/api/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteNote: (noteId: string) =>
    request<void>(`/api/notes/${noteId}`, { method: 'DELETE' }),

  listSessions: (projectId: string) =>
    request<StudySessionDto[]>(`/api/projects/${projectId}/sessions`),

  createSession: (payload: CreateStudySessionRequest) =>
    request<StudySessionDto>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  saveSessionRecall: (sessionId: string, recallText: string) =>
    request<StudySessionDto>(`/api/sessions/${sessionId}/recall`, {
      method: 'PUT',
      body: JSON.stringify({ recallText }),
    }),

  getDashboard: () => request<DashboardResponse>('/api/dashboard'),

  getDocumentQuiz: (documentId: string) =>
    request<QuizQuestionDto[]>(`/api/documents/${documentId}/quiz`),

  generateDocumentQuiz: (documentId: string, questionCount = 4) =>
    request<QuizQuestionDto[]>(`/api/documents/${documentId}/quiz/generate`, {
      method: 'POST',
      body: JSON.stringify({ questionCount }),
    }),

  submitQuizAttempt: (questionId: string, submittedAnswer: string) =>
    request<SubmitQuizAttemptResponse>(`/api/quizzes/${questionId}/attempt`, {
      method: 'POST',
      body: JSON.stringify({ submittedAnswer }),
    }),
};
