namespace StudyApp.Api.Domain.Entities;

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string PreferredLanguage { get; set; } = "ar";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Workspace> Workspaces { get; set; } = [];
    public ICollection<StudySession> StudySessions { get; set; } = [];
    public ICollection<StudyNote> StudyNotes { get; set; } = [];
    public ICollection<QuizAttempt> QuizAttempts { get; set; } = [];
    public ICollection<CalendarEntry> CalendarEntries { get; set; } = [];
}
