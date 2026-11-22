using System.ComponentModel.DataAnnotations;

namespace StudyApp.Api.Contracts;

public sealed record CreateNoteRequest(
    [Required] Guid ProjectId,
    Guid? DocumentId,
    Guid? ChunkId,
    Guid? SessionId,
    [Required, MaxLength(300)] string Title,
    [Required] string ContentMarkdown,
    int? SourcePageNumber,
    [MaxLength(16)] string Language = "ar",
    string SourceType = "AiExplanationEdited");

public sealed record UpdateNoteRequest(
    [Required, MaxLength(300)] string Title,
    [Required] string ContentMarkdown,
    int ExpectedVersion);

public sealed record StudyNoteDto(
    Guid Id,
    Guid ProjectId,
    Guid? DocumentId,
    string? DocumentTitle,
    Guid? ChunkId,
    int? ChunkIndex,
    Guid? SessionId,
    string Title,
    string ContentMarkdown,
    int? SourcePageNumber,
    string Language,
    string SourceType,
    int Version,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
