namespace StudyApp.Api.Domain.Entities;

public sealed class Project
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? CourseCode { get; set; }
    public string? Description { get; set; }

    /// <summary>
    /// JSON rules sent to the Python AI service (e.g. default explanation language, preserve English technical terms, tone).
    /// </summary>
    public string ExplanationRulesJson { get; set; } =
        """{"defaultLanguage":"ar","preserveEnglishTerms":true,"style":"clear-academic"}""";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Workspace Workspace { get; set; } = null!;
    public ICollection<Document> Documents { get; set; } = [];
    public ICollection<StudySession> StudySessions { get; set; } = [];
    public ICollection<StudyNote> StudyNotes { get; set; } = [];
    public ICollection<CalendarEntry> CalendarEntries { get; set; } = [];
}
