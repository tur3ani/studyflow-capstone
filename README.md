# StudyFlow — Bilingual AI Study Workspace (Capstone)

Full-stack study studio built with **React + TypeScript (Vite + Tailwind CSS)**, **C# ASP.NET Core Web API (.NET 10)**, and **PostgreSQL 16 + pgvector (Docker)** — with a clean HTTP/JSON contract ready for the AI team's **Python FastAPI** service.

## Architecture Overview

```text
React + TypeScript (Vite, :5173)
        │  REST + JWT Auth
        ▼
C# ASP.NET Core Web API (:5080) ──► Private File Storage (App_Data/private-files)
   │                    │
   │ EF Core + Npgsql   │ JSON / Multipart HTTP (or Mock Dev Mode)
   ▼                    ▼
PostgreSQL 16 +     Python FastAPI AI Service (:8000)
pgvector (:5432)    (Built by AI team — see docs/ai-service-contract.md)
```

## Implemented Features

- **Human-First Non-AI Study Pipeline (AI Completely Optional):** Every core workflow — PDF reading, highlights, margin notes, 1-line summaries, personal glossaries, active recall, self-authored quizzes, manual flashcards, mind maps, and analytics — works **100% without AI**. Students default to **Pure Study** mode and can opt in/out globally or per feature (`Paragraph & Term Explanations`, `AI Quiz Drafts`, `Recall Hints`) from the top-right mode switcher without affecting UX.
- **Main Student Dashboard (`/api/dashboard`):** Profile summary, 12-week study consistency heatmap, Independence Index, and real PostgreSQL-backed **Strong Points** & **Weak Points / Review Queue** with one-click jump to any passage.
- **Study Reader:**
  - Private PDF upload & page-by-page chunking with UTF-8 sanitization and OCR detection flags.
  - Warm Paper Light & Warm Obsidian Dark themes, `Ctrl+K` Command Palette, persisted personal Glossary Ribbon, and 1-click Zen Focus Mode.
  - Floating text-selection toolbar (**Highlight**, **Add Note**, **Define Term**, **Copy**, plus optional **Ask AI** when enabled) and inline manual note / 1-line summary / glossary composers.
  - Resizable 3-way split view: **Single** | **Split Notes** (live side-by-side notebook with All / Highlights / Glossary filters) | **Split Original PDF** opening directly at the exact clicked page (`#page=N`).
- **Source-Linked Notebook (`Notes`):** Master-detail Markdown editor with RTL/LTR support, optimistic version concurrency, and clickable source citation chips that pulse and scroll to the exact passage or PDF page.
- **Techniques Hub:**
  - **Active Recall** (3-step closed-book recall board persisted via `/api/sessions`)
  - **Quizzes** (self-authored MCQ & written questions via `/api/documents/{id}/quiz/questions`, plus optional AI drafts, feeding directly into Dashboard Strong/Weak Points)
  - **Mind Map** (interactive page-branched concept map with node inspector)
  - **Flashcards** (manual card creator + interactive flip-deck built from glossary terms, highlights, and notes)

---

## Quick Start

### 1. Start PostgreSQL (with `pgvector`)
```powershell
docker compose up -d
```

### 2. Run the C# Backend API (`http://localhost:5080`)
```powershell
cd backend/StudyApp.Api
dotnet run
```
- Interactive OpenAPI docs (Scalar): `http://localhost:5080/scalar/v1`
- Health check: `http://localhost:5080/api/health`

### 3. Run the React Frontend (`http://localhost:5173`)
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Connecting the AI Team's Python FastAPI Service

By default, `backend/StudyApp.Api/appsettings.Development.json` uses `"UseMock": true`, which extracts real text from uploaded PDFs via PdfPig and generates bilingual mock explanations so you can develop and demo immediately.

When the AI team's FastAPI service is running (e.g. on `http://localhost:8000`), update `backend/StudyApp.Api/appsettings.Development.json`:
```json
{
  "AiService": {
    "UseMock": false,
    "BaseUrl": "http://localhost:8000"
  }
}
```
Share [docs/ai-service-contract.md](docs/ai-service-contract.md) with the AI team for exact FastAPI routes, `snake_case` JSON payloads, and Pydantic starter models.
