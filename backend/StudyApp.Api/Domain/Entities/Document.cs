namespace StudyApp.Api.Domain.Entities;

public enum DocumentStatus
{
    Processing = 0,
    Ready = 1,
    Failed = 2
}

public sealed class Document
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/pdf";
    public long FileSizeBytes { get; set; }

    /// <summary>
    /// Private file storage key (relative path or object key). Never exposed directly as a public URL.
    /// </summary>
    public string StorageKey { get; set; } = string.Empty;

    public DocumentStatus Status { get; set; } = DocumentStatus.Processing;
    public int PageCount { get; set; }
    public int FileVersion { get; set; } = 1;
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Project Project { get; set; } = null!;
    public ICollection<DocumentChunk> Chunks { get; set; } = [];
    public ICollection<StudySession> StudySessions { get; set; } = [];
    public ICollection<StudyNote> StudyNotes { get; set; } = [];
}
