namespace StudyApp.Api.Domain.Entities;

public enum StudySessionStatus
{
    Active = 0,
    Completed = 1,
    Paused = 2
}

public sealed class StudySession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Guid DocumentId { get; set; }
    public Guid UserId { get; set; }
    public string Mode { get; set; } = "3_steps";
    public string? Goal { get; set; }
    public int CurrentStep { get; set; } = 1;
    public string SelectedChunkIdsJson { get; set; } = "[]";
    public string? RecallText { get; set; }
    public string? RecallFeedbackText { get; set; }
    public StudySessionStatus Status { get; set; } = StudySessionStatus.Active;
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }

    public Project Project { get; set; } = null!;
    public Document Document { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<StudyNote> StudyNotes { get; set; } = [];
    public ICollection<QuizQuestion> QuizQuestions { get; set; } = [];
    public ICollection<QuizAttempt> QuizAttempts { get; set; } = [];
    public ICollection<CalendarEntry> CalendarEntries { get; set; } = [];
}
