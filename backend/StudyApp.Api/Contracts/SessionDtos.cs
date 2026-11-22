using System.ComponentModel.DataAnnotations;

namespace StudyApp.Api.Contracts;

public sealed record CreateStudySessionRequest(
    [Required] Guid ProjectId,
    [Required] Guid DocumentId,
    [MaxLength(64)] string Mode = "3_steps",
    [MaxLength(500)] string? Goal = null,
    IReadOnlyList<Guid>? SelectedChunkIds = null);

public sealed record UpdateRecallRequest(
    [Required] string RecallText);

public sealed record StudySessionDto(
    Guid Id,
    Guid ProjectId,
    Guid DocumentId,
    string Mode,
    string? Goal,
    int CurrentStep,
    IReadOnlyList<Guid> SelectedChunkIds,
    string? RecallText,
    string? RecallFeedbackText,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset? CompletedAt);
