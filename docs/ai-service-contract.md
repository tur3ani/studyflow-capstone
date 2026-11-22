# C# Backend ↔ Python AI Service API Contract

This document defines the HTTP contract between the **C# ASP.NET Core backend** (`StudyApp.Api`) and the **Python FastAPI AI service** built by the AI team.

- **Transport:** HTTP/JSON (`snake_case` field names) + `multipart/form-data` for file extraction.
- **Default local URL:** `http://localhost:8000` (configurable in `backend/StudyApp.Api/appsettings.Development.json` under `AiService:BaseUrl`).
- **Internal Auth Header (optional):** `X-Internal-Api-Key: <shared-secret>` (sent automatically when `AiService:InternalApiKey` is set).
- **Switching from Mock to Python:** Set `"AiService": { "UseMock": false, "BaseUrl": "http://localhost:8000" }` in `appsettings.Development.json`.

---

## Phase 1 Endpoints (Active in `HttpAiServiceClient.cs`)

### 1. Extract & Chunk Document
`POST /v1/documents/extract`

Called by C# immediately after saving an uploaded lecture file to private storage.

**Request (`multipart/form-data`):**
- `file`: Binary PDF/text file
- `document_id`: UUID string assigned by C#

**Response (`200 OK`, `application/json`):**
```json
{
  "page_count": 12,
  "chunks": [
    {
      "chunk_index": 1,
      "page_number": 1,
      "heading": "1.1 Elasticity in Cloud Computing",
      "content": "Elasticity is the degree to which a system is able to adapt to workload changes by provisioning and de-provisioning resources automatically...",
      "char_start": 0,
      "char_end": 182,
      "needs_ocr": false
    }
  ]
}
```

**Expected behavior for scanned pages:**
- If a PDF page has no embedded text, run OCR (e.g., PaddleOCR / Tesseract / Gemini vision) and populate `content` with `needs_ocr: true` (or flag it clearly if OCR is skipped).
- Preserve accurate 1-based `page_number` and sequential `chunk_index` so citations and source-page jumps stay exact.

---

### 2. Explain a Chunk / Term
`POST /v1/ai/explain-chunk`

Called by C# when a student requests an explanation for a specific chunk. C# enforces project ownership first and passes the exact passage text and project rules.

**Request (`application/json`):**
```json
{
  "document_id": "2c8b2f8a-1b4c-48c2-9d77-88a5d8e5f1a2",
  "chunk_id": "8e10c540-9e3c-47cf-b05a-3cb7c6a9a5e1",
  "page_number": 3,
  "heading": "Elasticity",
  "passage_text": "Elasticity allows cloud systems to automatically scale resources up when demand rises and scale down when demand falls.",
  "target_language": "ar",
  "mode": "explain_concept",
  "selected_term": null,
  "explanation_rules_json": "{\"defaultLanguage\":\"ar\",\"preserveEnglishTerms\":true,\"style\":\"clear-academic\"}"
}
```

Supported `mode` values:
- `explain_concept` — Clear explanation grounded strictly in `passage_text`
- `explain_term` — Definition of `selected_term` in context of `passage_text`
- `example` — Explanation with a concrete example
- `story_mode` — Concise 1-line summary draft

**Response (`200 OK`, `application/json`):**
```json
{
  "explanation": "تعني **Elasticity** (المرونة) قدرة النظام السحابي على زيادة الموارد تلقائياً عند ارتفاع الطلب وتقليصها عند انخفاضه...",
  "key_terms": ["Elasticity", "Scale Up", "Scale Down"],
  "suggested_note_title": "Elasticity — شرح (ص 3)",
  "source_page_number": 3
}
```

**FastAPI / Pydantic Starter Snippet (for the AI team):**
```python
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

class ExplainChunkRequest(BaseModel):
    document_id: UUID
    chunk_id: UUID
    page_number: int
    heading: Optional[str] = None
    passage_text: str
    target_language: str = "ar"
    mode: str = "explain_concept"
    selected_term: Optional[str] = None
    explanation_rules_json: str = "{}"

class ExplainChunkResponse(BaseModel):
    explanation: str
    key_terms: List[str]
    suggested_note_title: str
    source_page_number: int
```

---

## Phase 2 Endpoints (Planned — Database Tables Already Created)

PostgreSQL tables (`study_sessions`, `quiz_questions`, `quiz_attempts`, `calendar_entries`) and the `pgvector` extension image are already provisioned for:
- `POST /v1/ai/generate-quiz` — Generate MCQs & written questions from studied chunks
- `POST /v1/ai/review-answer` — Grade/give targeted feedback on written quiz or active-recall answers
- `POST /v1/ai/embed` — Generate Multilingual E5-small vectors for cross-file RAG search
