namespace StudyApp.Api.Domain.Entities;

public enum FeedbackStatus
{
    None = 0,
    Pending = 1,
    Ready = 2
}

public sealed class QuizAttempt
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid QuestionId { get; set; }
    public Guid SessionId { get; set; }
    public Guid UserId { get; set; }
    public string SubmittedAnswer { get; set; } = string.Empty;
    public bool? IsCorrect { get; set; }
    public decimal? Score { get; set; }
    public FeedbackStatus FeedbackStatus { get; set; } = FeedbackStatus.None;
    public string? FeedbackText { get; set; }
    public DateTimeOffset AttemptedAt { get; set; } = DateTimeOffset.UtcNow;

    public QuizQuestion Question { get; set; } = null!;
    public StudySession Session { get; set; } = null!;
    public User User { get; set; } = null!;
}
