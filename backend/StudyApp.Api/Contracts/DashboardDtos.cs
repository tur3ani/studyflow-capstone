namespace StudyApp.Api.Contracts;

public sealed record HeatmapDayDto(
    string Date,
    int Count,
    int Level);

public sealed record InsightPointDto(
    string Title,
    string CourseName,
    string Reason,
    int ScorePercent,
    Guid ProjectId,
    Guid? DocumentId,
    Guid? ChunkId,
    int? PageNumber);

public sealed record DashboardResponse(
    string DisplayName,
    string Email,
    string PreferredLanguage,
    DateTimeOffset MemberSince,
    int TotalCourses,
    int TotalLectures,
    int TotalNotes,
    int TotalRecallSessions,
    int TotalQuizAttempts,
    int CurrentStreakDays,
    int IndependenceScorePercent,
    IReadOnlyList<HeatmapDayDto> Heatmap,
    IReadOnlyList<InsightPointDto> StrongPoints,
    IReadOnlyList<InsightPointDto> WeakPoints);
