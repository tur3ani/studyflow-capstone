export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  preferredLanguage: string;
  dailyGoalPoints: number;
  defaultWorkspaceId: string;
}

export interface UpdateProfileRequest {
  displayName: string;
  preferredLanguage: string;
  dailyGoalPoints: number;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: UserDto;
}

export interface HealthResponse {
  status: string;
  database: string;
  aiProviderMode: string;
  timestamp: string;
}

export interface ProjectSummaryDto {
  id: string;
  workspaceId: string;
  name: string;
  courseCode?: string | null;
  description?: string | null;
  explanationRulesJson: string;
  documentCount: number;
  noteCount: number;
  createdAt: string;
}

export interface DocumentSummaryDto {
  id: string;
  projectId: string;
  title: string;
  originalFileName: string;
  fileSizeBytes: number;
  status: 'Processing' | 'Ready' | 'Failed' | string;
  pageCount: number;
  chunkCount: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunkDto {
  id: string;
  documentId: string;
  chunkIndex: number;
  pageNumber: number;
  heading?: string | null;
  content: string;
  needsOcr: boolean;
}

export interface DocumentDetailDto {
  id: string;
  projectId: string;
  title: string;
  originalFileName: string;
  fileSizeBytes: number;
  status: string;
  pageCount: number;
  errorMessage?: string | null;
  createdAt: string;
  chunks: DocumentChunkDto[];
}

export interface ExplainChunkRequest {
  targetLanguage: 'ar' | 'en';
  mode: 'explain_concept' | 'explain_term' | 'example' | 'story_mode';
  selectedTerm?: string | null;
  sessionId?: string | null;
}

export interface ExplainChunkResponse {
  documentId: string;
  chunkId: string;
  sourcePageNumber: number;
  heading?: string | null;
  targetLanguage: string;
  explanation: string;
  keyTerms: string[];
  suggestedNoteTitle: string;
  providerMode: string;
}

export interface StudyNoteDto {
  id: string;
  projectId: string;
  documentId?: string | null;
  documentTitle?: string | null;
  chunkId?: string | null;
  chunkIndex?: number | null;
  sessionId?: string | null;
  title: string;
  contentMarkdown: string;
  sourcePageNumber?: number | null;
  language: string;
  sourceType: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  projectId: string;
  documentId?: string | null;
  chunkId?: string | null;
  sessionId?: string | null;
  title: string;
  contentMarkdown: string;
  sourcePageNumber?: number | null;
  language: string;
  sourceType?: string;
}

export interface UpdateNoteRequest {
  title: string;
  contentMarkdown: string;
  expectedVersion: number;
}

export interface StudySessionDto {
  id: string;
  projectId: string;
  documentId: string;
  mode: string;
  goal?: string | null;
  currentStep: number;
  selectedChunkIds: string[];
  recallText?: string | null;
  recallFeedbackText?: string | null;
  status: string;
  startedAt: string;
  completedAt?: string | null;
}

export interface CreateStudySessionRequest {
  projectId: string;
  documentId: string;
  mode?: string;
  goal?: string;
  selectedChunkIds?: string[];
}

export interface HeatmapDayDto {
  date: string;
  count: number;
  level: number;
  goalMet: boolean;
}

export interface GeneralInsightDto {
  category: string;
  headline: string;
  observation: string;
  severity: 'high' | 'medium' | 'low' | string;
  affectedCount: number;
}

export interface InsightPointDto {
  title: string;
  courseName: string;
  reason: string;
  scorePercent: number;
  projectId: string;
  documentId?: string | null;
  chunkId?: string | null;
  pageNumber?: number | null;
}

export interface DashboardResponse {
  displayName: string;
  email: string;
  preferredLanguage: string;
  memberSince: string;
  dailyGoalPoints: number;
  todayPoints: number;
  goalMetDays: number;
  totalCourses: number;
  totalLectures: number;
  totalNotes: number;
  totalRecallSessions: number;
  totalQuizAttempts: number;
  currentStreakDays: number;
  independenceScorePercent: number;
  heatmap: HeatmapDayDto[];
  generalWeakPoints: GeneralInsightDto[];
  strongPoints: InsightPointDto[];
  detailedWeakPoints: InsightPointDto[];
}

export interface QuizAttemptSummaryDto {
  id: string;
  submittedAnswer: string;
  isCorrect?: boolean | null;
  score?: number | null;
  feedbackStatus: string;
  feedbackText?: string | null;
  attemptedAt: string;
}

export interface QuizQuestionDto {
  id: string;
  sessionId: string;
  documentId: string;
  chunkId: string;
  pageNumber: number;
  heading?: string | null;
  questionType: 'mcq' | 'written' | string;
  prompt: string;
  options: string[];
  latestAttempt?: QuizAttemptSummaryDto | null;
}

export interface SubmitQuizAttemptResponse {
  attempt: QuizAttemptSummaryDto;
  correctAnswer?: string | null;
  sourcePageNumber: number;
  chunkId: string;
}

export interface CreateManualQuizQuestionRequest {
  chunkId: string;
  questionType: 'mcq' | 'written';
  prompt: string;
  options?: string[];
  correctOption?: string;
  expectedPoints?: string;
}
