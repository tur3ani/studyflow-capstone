namespace StudyApp.Api.Domain.Entities;

public sealed class CalendarEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? SessionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly ScheduledDate { get; set; }
    public string Status { get; set; } = "planned";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User User { get; set; } = null!;
    public Project Project { get; set; } = null!;
    public StudySession? Session { get; set; }
}
