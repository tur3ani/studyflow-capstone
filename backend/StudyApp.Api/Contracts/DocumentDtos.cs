namespace StudyApp.Api.Contracts;

public sealed record DocumentSummaryDto(
    Guid Id,
    Guid ProjectId,
    string Title,
    string OriginalFileName,
    long FileSizeBytes,
    string Status,
    int PageCount,
    int ChunkCount,
    string? ErrorMessage,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record DocumentChunkDto(
    Guid Id,
    Guid DocumentId,
    int ChunkIndex,
    int PageNumber,
    string? Heading,
    string Content,
    bool NeedsOcr);

public sealed record DocumentDetailDto(
    Guid Id,
    Guid ProjectId,
    string Title,
    string OriginalFileName,
    long FileSizeBytes,
    string Status,
    int PageCount,
    string? ErrorMessage,
    DateTimeOffset CreatedAt,
    IReadOnlyList<DocumentChunkDto> Chunks);
