# StudyFlow Capstone — Workspace Rules

## 1. Git Branching & Review Pipeline (Mandatory)
- **Never commit or push directly to `main`.**
- For every new task or change set, create a fresh, descriptive branch from the latest `main` (e.g., `feat/<topic>`, `fix/<topic>`, `refactor/<topic>`).
- Build and verify changes before committing (`dotnet build backend/StudyApp.sln` and `npm --prefix frontend run build`).
- Push the feature branch to `origin` and provide the GitHub Pull Request link so the user can review and manually merge it.
- After the user confirms the branch is merged into `main`, switch to `main`, pull the latest commits, and delete the merged branch (locally and on `origin` if still present).

## 2. Architecture Ownership & AI Boundary
- This repository owns the **React + TypeScript frontend**, **C# ASP.NET Core backend**, and **PostgreSQL (`pgvector`) database**.
- The **Python FastAPI AI service** is built by the AI teammates and must remain cleanly decoupled behind `IAiServiceClient` (`MockAiServiceClient` vs `HttpAiServiceClient`) using the contract in `docs/ai-service-contract.md`.
- Keep generating an AI explanation (`POST /api/chunks/{id}/explain`) and saving a note (`POST /api/notes`) as two separate, explicit user actions.

## 3. Non-AI Study Pipeline First
- Every core study workflow (PDF reading, highlights, manual notes, personal glossary, active recall, self-authored quizzes, manual flashcards, mind maps, and dashboard analytics) must work **100% without AI**.
- AI helpers are optional and controlled via the **Mode** picker in the sidebar footer (**3 default profiles**: *Pure Study*, *Guided Companion*, *Full AI Assist* + **Custom Profile**). Do not place AI toggles in the top-right header, and never degrade UX or show AI nags when AI is disabled.

## 4. UI & Navigation Invariants
- **Home Dashboard** is the main system view (profile, goal-scaled heatmap, general weak points with a **Show More** detailed course breakdown, and strong points). Do not make it a lecture tab and do not duplicate the course list at the bottom of the dashboard.
- **Sidebar**: When on **Home Dashboard** or **Settings**, hide **Lecture Sources** and show only Courses. Show Lecture Sources only inside a course.
- **Course Studio Tabs**: `Study Reader` · `Notes` · `Techniques` (containing Active Recall, Quizzes, Mind Map, Flashcards).
- **Study Reader**: Support resizable split view with both `Notes` and `Original PDF`. Opening the original PDF must always start at the **exact clicked/active page** (never defaulting back to page 1).

## 5. Backend & Database Safety
- Always sanitize extracted PDF text before saving to PostgreSQL (strip `\0` / `0x00` NUL bytes and enforce column max lengths) to prevent Npgsql UTF-8 error `22021`.
- On failed EF Core `SaveChangesAsync` during document ingestion, detach unsaved `DocumentChunk` entities from `ChangeTracker` before marking `Document.Status = Failed`.
