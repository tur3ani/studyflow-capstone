namespace StudyApp.Api.Domain.Entities;

public enum NoteSourceType
{
    Manual = 0,
    AiExplanationEdited = 1,
    Recall = 2,
    StoryMode = 3
}

public sealed class StudyNote
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Guid? DocumentId { get; set; }
    public Guid? ChunkId { get; set; }
    public Guid? SessionId { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ContentMarkdown { get; set; } = string.Empty;
    public int? SourcePageNumber { get; set; }
    public string Language { get; set; } = "ar";
    public NoteSourceType SourceType { get; set; } = NoteSourceType.Manual;
    public int Version { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Project Project { get; set; } = null!;
    public Document? Document { get; set; }
    public DocumentChunk? Chunk { get; set; }
    public StudySession? Session { get; set; }
    public User User { get; set; } = null!;
}
