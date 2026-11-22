using System.ComponentModel.DataAnnotations;

namespace StudyApp.Api.Contracts;

public sealed record GenerateQuizRequest(
    int QuestionCount = 4,
    string Language = "en");

public sealed record SubmitQuizAttemptRequest(
    [Required] string SubmittedAnswer);

public sealed record QuizAttemptSummaryDto(
    Guid Id,
    string SubmittedAnswer,
    bool? IsCorrect,
    decimal? Score,
    string FeedbackStatus,
    string? FeedbackText,
    DateTimeOffset AttemptedAt);

public sealed record QuizQuestionDto(
    Guid Id,
    Guid SessionId,
    Guid DocumentId,
    Guid ChunkId,
    int PageNumber,
    string? Heading,
    string QuestionType,
    string Prompt,
    IReadOnlyList<string> Options,
    QuizAttemptSummaryDto? LatestAttempt);

public sealed record SubmitQuizAttemptResponse(
    QuizAttemptSummaryDto Attempt,
    string? CorrectAnswer,
    int SourcePageNumber,
    Guid ChunkId);
