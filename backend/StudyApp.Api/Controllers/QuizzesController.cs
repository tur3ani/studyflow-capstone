using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyApp.Api.Contracts;
using StudyApp.Api.Data;
using StudyApp.Api.Domain.Entities;
using StudyApp.Api.Extensions;

namespace StudyApp.Api.Controllers;

[ApiController]
[Authorize]
public sealed class QuizzesController(AppDbContext db) : ControllerBase
{
    [HttpGet("api/documents/{documentId:guid}/quiz")]
    public async Task<ActionResult<IReadOnlyList<QuizQuestionDto>>> GetByDocument(Guid documentId, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var owns = await db.Documents.AnyAsync(d => d.Id == documentId && d.Project.Workspace.OwnerId == userId, ct);
        if (!owns)
        {
            return NotFound();
        }

        var questions = await db.QuizQuestions
            .AsNoTracking()
            .Where(q => q.DocumentId == documentId)
            .Include(q => q.Chunk)
            .Include(q => q.Attempts.Where(a => a.UserId == userId))
            .OrderByDescending(q => q.CreatedAt)
            .Take(20)
            .ToListAsync(ct);

        return Ok(questions.Select(MapQuestion).ToList());
    }

    /// <summary>
    /// Non-AI study pipeline: lets the student author their own MCQ or Written self-test question
    /// anchored directly to a specific passage chunk.
    /// </summary>
    [HttpPost("api/documents/{documentId:guid}/quiz/questions")]
    public async Task<ActionResult<QuizQuestionDto>> CreateManualQuestion(
        Guid documentId,
        CreateManualQuizQuestionRequest request,
        CancellationToken ct)
    {
        var userId = User.GetUserId();
        var chunk = await db.DocumentChunks
            .Include(c => c.Document)
            .FirstOrDefaultAsync(
                c => c.Id == request.ChunkId
                     && c.DocumentId == documentId
                     && c.Document.Project.Workspace.OwnerId == userId,
                ct);

        if (chunk is null)
        {
            return NotFound(new { message = "Referenced passage chunk not found in this lecture." });
        }

        var session = await db.StudySessions
            .Where(s => s.DocumentId == documentId && s.UserId == userId && s.Mode == "manual_quiz")
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync(ct);

        if (session is null)
        {
            session = new StudySession
            {
                ProjectId = chunk.Document.ProjectId,
                DocumentId = documentId,
                UserId = userId,
                Mode = "manual_quiz",
                Goal = $"Self-authored quiz for {chunk.Document.Title}",
                SelectedChunkIdsJson = JsonSerializer.Serialize(new[] { chunk.Id })
            };
            db.StudySessions.Add(session);
        }

        var normalizedType = string.Equals(request.QuestionType, "mcq", StringComparison.OrdinalIgnoreCase)
            ? "mcq"
            : "written";

        var cleanedOptions = (request.Options ?? [])
            .Select(o => o.Trim())
            .Where(o => !string.IsNullOrWhiteSpace(o))
            .Distinct()
            .ToList();

        if (normalizedType == "mcq" && cleanedOptions.Count < 2)
        {
            return BadRequest(new { message = "Multiple-choice questions require at least 2 options." });
        }

        var correct = normalizedType == "mcq"
            ? (string.IsNullOrWhiteSpace(request.CorrectOption) ? cleanedOptions[0] : request.CorrectOption.Trim())
            : null;

        var question = new QuizQuestion
        {
            Session = session,
            DocumentId = documentId,
            ChunkId = chunk.Id,
            Chunk = chunk,
            QuestionType = normalizedType,
            Prompt = request.Prompt.Trim(),
            OptionsJson = normalizedType == "mcq" ? JsonSerializer.Serialize(cleanedOptions) : "[]",
            AnswerKeyJson = normalizedType == "mcq"
                ? JsonSerializer.Serialize(new { correct })
                : JsonSerializer.Serialize(new { expected = request.ExpectedPoints?.Trim() ?? chunk.Content }),
            ExpectedPoints = string.IsNullOrWhiteSpace(request.ExpectedPoints)
                ? chunk.Content
                : request.ExpectedPoints.Trim()
        };

        db.QuizQuestions.Add(question);
        await db.SaveChangesAsync(ct);

        return Ok(MapQuestion(question));
    }

    [HttpPost("api/documents/{documentId:guid}/quiz/generate")]
    public async Task<ActionResult<IReadOnlyList<QuizQuestionDto>>> Generate(
        Guid documentId,
        GenerateQuizRequest request,
        CancellationToken ct)
    {
        var userId = User.GetUserId();
        var document = await db.Documents
            .Include(d => d.Chunks)
            .FirstOrDefaultAsync(d => d.Id == documentId && d.Project.Workspace.OwnerId == userId, ct);

        if (document is null)
        {
            return NotFound(new { message = "Lecture document not found." });
        }

        var usableChunks = document.Chunks
            .Where(c => !c.NeedsOcr && c.Content.Length >= 30)
            .OrderBy(c => c.ChunkIndex)
            .ToList();

        if (usableChunks.Count == 0)
        {
            usableChunks = document.Chunks.OrderBy(c => c.ChunkIndex).ToList();
        }

        if (usableChunks.Count == 0)
        {
            return BadRequest(new { message = "This lecture has no extracted chunks yet." });
        }

        var session = new StudySession
        {
            ProjectId = document.ProjectId,
            DocumentId = document.Id,
            UserId = userId,
            Mode = "quiz",
            Goal = $"Quiz practice for {document.Title}",
            SelectedChunkIdsJson = JsonSerializer.Serialize(usableChunks.Take(request.QuestionCount).Select(c => c.Id))
        };
        db.StudySessions.Add(session);

        var count = Math.Clamp(request.QuestionCount, 1, Math.Min(8, usableChunks.Count));
        var selected = usableChunks.Take(count).ToList();
        var created = new List<QuizQuestion>();

        for (var i = 0; i < selected.Count; i++)
        {
            var chunk = selected[i];
            var topic = string.IsNullOrWhiteSpace(chunk.Heading)
                ? $"Page {chunk.PageNumber} concept"
                : chunk.Heading;

            var snippet = chunk.Content.Length > 140
                ? chunk.Content[..140].Trim() + "..."
                : chunk.Content.Trim();

            var isWritten = i % 2 == 1;
            QuizQuestion question;

            if (!isWritten)
            {
                var correctOption = $"Grounded in Page {chunk.PageNumber}: \"{snippet}\"";
                var distractor1 = "It only applies after disconnecting all source material and skipping verification.";
                var distractor2 = "It replaces every concept in the course with a static single-step rule.";
                var distractor3 = "It is unrelated to the mechanism described in this lecture passage.";
                var options = new[] { correctOption, distractor1, distractor2, distractor3 };

                question = new QuizQuestion
                {
                    Session = session,
                    DocumentId = document.Id,
                    ChunkId = chunk.Id,
                    Chunk = chunk,
                    QuestionType = "mcq",
                    Prompt = $"Which statement accurately reflects \"{topic}\" from Page {chunk.PageNumber}?",
                    OptionsJson = JsonSerializer.Serialize(options),
                    AnswerKeyJson = JsonSerializer.Serialize(new { correct = correctOption }),
                    ExpectedPoints = snippet
                };
            }
            else
            {
                question = new QuizQuestion
                {
                    Session = session,
                    DocumentId = document.Id,
                    ChunkId = chunk.Id,
                    Chunk = chunk,
                    QuestionType = "written",
                    Prompt = $"In your own words (Arabic or English), explain the core idea of \"{topic}\" (Page {chunk.PageNumber}).",
                    OptionsJson = "[]",
                    AnswerKeyJson = JsonSerializer.Serialize(new { expected = snippet }),
                    ExpectedPoints = chunk.Content
                };
            }

            db.QuizQuestions.Add(question);
            created.Add(question);
        }

        await db.SaveChangesAsync(ct);
        return Ok(created.Select(MapQuestion).ToList());
    }

    [HttpPost("api/quizzes/{questionId:guid}/attempt")]
    public async Task<ActionResult<SubmitQuizAttemptResponse>> SubmitAttempt(
        Guid questionId,
        SubmitQuizAttemptRequest request,
        CancellationToken ct)
    {
        var userId = User.GetUserId();
        var question = await db.QuizQuestions
            .Include(q => q.Chunk)
            .Include(q => q.Document)
            .ThenInclude(d => d.Project)
            .ThenInclude(p => p.Workspace)
            .FirstOrDefaultAsync(q => q.Id == questionId && q.Document.Project.Workspace.OwnerId == userId, ct);

        if (question is null)
        {
            return NotFound();
        }

        bool isCorrect;
        decimal score;
        string feedback;
        string? correctAnswer = null;

        if (string.Equals(question.QuestionType, "mcq", StringComparison.OrdinalIgnoreCase))
        {
            using var doc = JsonDocument.Parse(question.AnswerKeyJson);
            correctAnswer = doc.RootElement.TryGetProperty("correct", out var c) ? c.GetString() : null;
            isCorrect = string.Equals(request.SubmittedAnswer.Trim(), correctAnswer?.Trim(), StringComparison.OrdinalIgnoreCase);
            score = isCorrect ? 100m : 0m;
            feedback = isCorrect
                ? $"Correct! Matches the source passage on Page {question.Chunk.PageNumber}."
                : $"Not quite — check Page {question.Chunk.PageNumber} ({question.Chunk.Heading ?? "Source Passage"}) to verify the exact reasoning.";
        }
        else
        {
            var words = request.SubmittedAnswer.Split([' ', '\n', '\t', '.', ',', '،'], StringSplitOptions.RemoveEmptyEntries);
            var sourceWords = new HashSet<string>(
                question.Chunk.Content.Split([' ', '\n', '\t', '.', ',', '،'], StringSplitOptions.RemoveEmptyEntries)
                    .Where(w => w.Length >= 4),
                StringComparer.OrdinalIgnoreCase);

            var overlap = words.Count(w => sourceWords.Contains(w));
            score = Math.Clamp(words.Length >= 8 ? 60m + overlap * 10m : 35m + overlap * 10m, 20m, 100m);
            isCorrect = score >= 70m;
            feedback = isCorrect
                ? $"Solid explanation! You captured key points from Page {question.Chunk.PageNumber}. Compare against the source to ensure no edge case was missed."
                : $"Good start! Try expanding with specific terms or both sides of the concept from Page {question.Chunk.PageNumber}.";
            correctAnswer = question.ExpectedPoints;
        }

        var attempt = new QuizAttempt
        {
            QuestionId = question.Id,
            SessionId = question.SessionId,
            UserId = userId,
            SubmittedAnswer = request.SubmittedAnswer.Trim(),
            IsCorrect = isCorrect,
            Score = score,
            FeedbackStatus = FeedbackStatus.Ready,
            FeedbackText = feedback
        };

        db.QuizAttempts.Add(attempt);
        await db.SaveChangesAsync(ct);

        return Ok(new SubmitQuizAttemptResponse(
            new QuizAttemptSummaryDto(
                attempt.Id,
                attempt.SubmittedAnswer,
                attempt.IsCorrect,
                attempt.Score,
                attempt.FeedbackStatus.ToString(),
                attempt.FeedbackText,
                attempt.AttemptedAt),
            correctAnswer,
            question.Chunk.PageNumber,
            question.ChunkId));
    }

    private static QuizQuestionDto MapQuestion(QuizQuestion q)
    {
        var options = JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? [];
        var latest = q.Attempts.OrderByDescending(a => a.AttemptedAt).FirstOrDefault();

        return new QuizQuestionDto(
            q.Id,
            q.SessionId,
            q.DocumentId,
            q.ChunkId,
            q.Chunk.PageNumber,
            q.Chunk.Heading,
            q.QuestionType,
            q.Prompt,
            options,
            latest is null
                ? null
                : new QuizAttemptSummaryDto(
                    latest.Id,
                    latest.SubmittedAnswer,
                    latest.IsCorrect,
                    latest.Score,
                    latest.FeedbackStatus.ToString(),
                    latest.FeedbackText,
                    latest.AttemptedAt));
    }
}
