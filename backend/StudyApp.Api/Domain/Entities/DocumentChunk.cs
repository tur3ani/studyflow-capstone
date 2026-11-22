namespace StudyApp.Api.Domain.Entities;

public sealed class DocumentChunk
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DocumentId { get; set; }
    public int ChunkIndex { get; set; }
    public int PageNumber { get; set; }
    public string? Heading { get; set; }
    public string Content { get; set; } = string.Empty;
    public int CharStart { get; set; }
    public int CharEnd { get; set; }
    public bool NeedsOcr { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Document Document { get; set; } = null!;
    public ICollection<StudyNote> StudyNotes { get; set; } = [];
    public ICollection<QuizQuestion> QuizQuestions { get; set; } = [];
}
