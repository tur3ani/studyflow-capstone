namespace StudyApp.Api.Domain.Entities;

public sealed class QuizQuestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid DocumentId { get; set; }
    public Guid ChunkId { get; set; }
    public string QuestionType { get; set; } = "mcq";
    public string Prompt { get; set; } = string.Empty;
    public string OptionsJson { get; set; } = "[]";
    public string AnswerKeyJson { get; set; } = "{}";
    public string? ExpectedPoints { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public StudySession Session { get; set; } = null!;
    public Document Document { get; set; } = null!;
    public DocumentChunk Chunk { get; set; } = null!;
    public ICollection<QuizAttempt> Attempts { get; set; } = [];
}
