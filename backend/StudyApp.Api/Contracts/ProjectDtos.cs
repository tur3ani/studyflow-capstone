using System.ComponentModel.DataAnnotations;

namespace StudyApp.Api.Contracts;

public sealed record CreateProjectRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(64)] string? CourseCode,
    [MaxLength(1000)] string? Description,
    string? ExplanationRulesJson);

public sealed record ProjectSummaryDto(
    Guid Id,
    Guid WorkspaceId,
    string Name,
    string? CourseCode,
    string? Description,
    string ExplanationRulesJson,
    int DocumentCount,
    int NoteCount,
    DateTimeOffset CreatedAt);
