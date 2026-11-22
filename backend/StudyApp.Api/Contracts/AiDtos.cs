using System.ComponentModel.DataAnnotations;

namespace StudyApp.Api.Contracts;

// --- Interface -> C# App API ---

public sealed record ExplainChunkRequest(
    [MaxLength(16)] string TargetLanguage = "ar",
    [MaxLength(64)] string Mode = "explain_concept",
    [MaxLength(200)] string? SelectedTerm = null,
    Guid? SessionId = null);

public sealed record ExplainChunkResponse(
    Guid DocumentId,
    Guid ChunkId,
    int SourcePageNumber,
    string? Heading,
    string TargetLanguage,
    string Explanation,
    IReadOnlyList<string> KeyTerms,
    string SuggestedNoteTitle,
    string ProviderMode);

// --- C# Backend -> Python FastAPI AI Service ---

public sealed record ExtractedChunkPayload(
    int ChunkIndex,
    int PageNumber,
    string? Heading,
    string Content,
    int CharStart,
    int CharEnd,
    bool NeedsOcr);

public sealed record PythonExtractResponse(
    int PageCount,
    IReadOnlyList<ExtractedChunkPayload> Chunks);

public sealed record PythonExplainChunkRequest(
    Guid DocumentId,
    Guid ChunkId,
    int PageNumber,
    string? Heading,
    string PassageText,
    string TargetLanguage,
    string Mode,
    string? SelectedTerm,
    string ExplanationRulesJson);

public sealed record PythonExplainChunkResponse(
    string Explanation,
    IReadOnlyList<string> KeyTerms,
    string SuggestedNoteTitle,
    int SourcePageNumber);
