using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyApp.Api.Contracts;
using StudyApp.Api.Data;
using StudyApp.Api.Extensions;

namespace StudyApp.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public sealed class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardResponse>> Get(CancellationToken ct)
    {
        var userId = User.GetUserId();
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
        {
            return Unauthorized();
        }

        var dailyGoal = Math.Clamp(user.DailyGoalPoints, 2, 50);

        var projects = await db.Projects
            .AsNoTracking()
            .Where(p => p.Workspace.OwnerId == userId)
            .Select(p => new { p.Id, p.Name, p.CourseCode })
            .ToListAsync(ct);

        var projectMap = projects.ToDictionary(
            p => p.Id,
            p => string.IsNullOrWhiteSpace(p.CourseCode) ? p.Name : $"{p.CourseCode} · {p.Name}");
        var projectIds = projects.Select(p => p.Id).ToList();

        var documents = await db.Documents
            .AsNoTracking()
            .Where(d => projectIds.Contains(d.ProjectId))
            .Select(d => new
            {
                d.Id,
                d.ProjectId,
                d.Title,
                d.CreatedAt,
                ChunkCount = d.Chunks.Count,
                FirstChunkId = d.Chunks.OrderBy(c => c.ChunkIndex).Select(c => (Guid?)c.Id).FirstOrDefault(),
                FirstPage = d.Chunks.OrderBy(c => c.ChunkIndex).Select(c => (int?)c.PageNumber).FirstOrDefault()
            })
            .ToListAsync(ct);

        var notes = await db.StudyNotes
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .Select(n => new { n.Id, n.ProjectId, n.DocumentId, n.ChunkId, n.SourcePageNumber, n.UpdatedAt })
            .ToListAsync(ct);

        var sessions = await db.StudySessions
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .Select(s => new { s.Id, s.ProjectId, s.DocumentId, s.RecallText, s.StartedAt })
            .ToListAsync(ct);

        var attempts = await db.QuizAttempts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .Select(a => new
            {
                a.Id,
                a.IsCorrect,
                a.Score,
                a.AttemptedAt,
                DocumentId = a.Question.DocumentId,
                ChunkId = a.Question.ChunkId,
                PageNumber = a.Question.Chunk.PageNumber,
                Heading = a.Question.Chunk.Heading,
                ProjectId = a.Question.Document.ProjectId,
                DocumentTitle = a.Question.Document.Title
            })
            .ToListAsync(ct);

        // 1. Build 84-day (12-week) activity heatmap scaled dynamically to user's DailyGoalPoints:
        //    - Lecture import: +2 pts
        //    - Note / Highlight / Glossary saved or edited: +2 pts
        //    - Study session started: +1 pt (+3 pts if closed-book independent recall written)
        //    - Quiz attempt submitted: +1 pt
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var startDay = today.AddDays(-83);
        var activityByDay = new Dictionary<DateOnly, int>();

        void AddActivity(DateTimeOffset dt, int weight)
        {
            var day = DateOnly.FromDateTime(dt.UtcDateTime);
            if (day >= startDay && day <= today)
            {
                activityByDay[day] = activityByDay.GetValueOrDefault(day) + weight;
            }
        }

        foreach (var d in documents) AddActivity(d.CreatedAt, 2);
        foreach (var n in notes) AddActivity(n.UpdatedAt, 2);
        foreach (var s in sessions) AddActivity(s.StartedAt, string.IsNullOrWhiteSpace(s.RecallText) ? 1 : 3);
        foreach (var a in attempts) AddActivity(a.AttemptedAt, 1);

        var heatmap = new List<HeatmapDayDto>(84);
        var goalMetDays = 0;
        for (var i = 0; i < 84; i++)
        {
            var day = startDay.AddDays(i);
            var count = activityByDay.GetValueOrDefault(day);
            var ratio = (double)count / dailyGoal;
            var goalMet = count >= dailyGoal;
            if (goalMet) goalMetDays++;

            var level = count == 0
                ? 0
                : ratio >= 1.0
                    ? 4
                    : ratio >= 0.7
                        ? 3
                        : ratio >= 0.35
                            ? 2
                            : 1;

            heatmap.Add(new HeatmapDayDto(day.ToString("yyyy-MM-dd"), count, level, goalMet));
        }

        var todayPoints = activityByDay.GetValueOrDefault(today);

        // Streak calculation (consecutive days with activity)
        var streak = 0;
        var cursor = today;
        if (!activityByDay.ContainsKey(cursor))
        {
            cursor = cursor.AddDays(-1);
        }
        while (activityByDay.GetValueOrDefault(cursor) > 0)
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        // 2. Detailed Course/Lecture Strong & Weak Points
        var strongPoints = new List<InsightPointDto>();
        var detailedWeakPoints = new List<InsightPointDto>();
        var lecturesWithoutNotes = 0;
        var lecturesWithoutRecall = 0;

        foreach (var doc in documents)
        {
            var docNotes = notes.Count(n => n.DocumentId == doc.Id);
            var docRecalls = sessions.Count(s => s.DocumentId == doc.Id && !string.IsNullOrWhiteSpace(s.RecallText));
            var docAttempts = attempts.Where(a => a.DocumentId == doc.Id).ToList();

            if (docNotes == 0) lecturesWithoutNotes++;
            if (docRecalls == 0) lecturesWithoutRecall++;

            var quizAccuracy = docAttempts.Count > 0
                ? (int)Math.Round(docAttempts.Average(a => a.Score ?? (a.IsCorrect == true ? 100m : 0m)))
                : (int?)null;

            var coverageScore = doc.ChunkCount > 0
                ? Math.Min(100, (int)Math.Round(((docNotes * 1.4 + docRecalls * 3.0) / Math.Max(1, Math.Min(doc.ChunkCount, 10))) * 100))
                : 0;

            var combinedScore = quizAccuracy.HasValue
                ? (int)Math.Round(quizAccuracy.Value * 0.65 + coverageScore * 0.35)
                : coverageScore;

            var courseName = projectMap.GetValueOrDefault(doc.ProjectId, "Course");

            if (combinedScore >= 60 || (quizAccuracy.HasValue && quizAccuracy.Value >= 75) || docRecalls > 0)
            {
                var reasonParts = new List<string>();
                if (quizAccuracy.HasValue) reasonParts.Add($"{quizAccuracy}% quiz accuracy");
                if (docRecalls > 0) reasonParts.Add($"{docRecalls} independent recall{(docRecalls > 1 ? "s" : "")}");
                if (docNotes > 0) reasonParts.Add($"{docNotes} saved note{(docNotes > 1 ? "s" : "")}");

                strongPoints.Add(new InsightPointDto(
                    Title: doc.Title,
                    CourseName: courseName,
                    Reason: string.Join(" · ", reasonParts),
                    ScorePercent: Math.Max(60, combinedScore),
                    ProjectId: doc.ProjectId,
                    DocumentId: doc.Id,
                    ChunkId: doc.FirstChunkId,
                    PageNumber: doc.FirstPage ?? 1));
            }
            else
            {
                var weakestAttempt = docAttempts
                    .OrderBy(a => a.Score ?? (a.IsCorrect == true ? 100m : 0m))
                    .FirstOrDefault();

                var reason = quizAccuracy.HasValue && quizAccuracy.Value < 70
                    ? $"Quiz accuracy {quizAccuracy}% — revisit source passages"
                    : docNotes == 0
                        ? "Imported without notes or highlights yet"
                        : "Notes exist, but closed-book active recall hasn't been practiced";

                detailedWeakPoints.Add(new InsightPointDto(
                    Title: weakestAttempt?.Heading ?? doc.Title,
                    CourseName: courseName,
                    Reason: reason,
                    ScorePercent: combinedScore,
                    ProjectId: doc.ProjectId,
                    DocumentId: doc.Id,
                    ChunkId: weakestAttempt?.ChunkId ?? doc.FirstChunkId,
                    PageNumber: weakestAttempt?.PageNumber ?? doc.FirstPage ?? 1));
            }
        }

        // Also include specific missed quiz passages inside detailed weak points
        var missedAttempts = attempts
            .Where(a => a.IsCorrect == false || (a.Score.HasValue && a.Score.Value < 60m))
            .OrderByDescending(a => a.AttemptedAt)
            .ToList();

        foreach (var missed in missedAttempts.Take(5))
        {
            if (detailedWeakPoints.Any(w => w.ChunkId == missed.ChunkId)) continue;
            detailedWeakPoints.Insert(0, new InsightPointDto(
                Title: missed.Heading ?? $"{missed.DocumentTitle} (Page {missed.PageNumber})",
                CourseName: projectMap.GetValueOrDefault(missed.ProjectId, "Course"),
                Reason: $"Missed quiz question on Page {missed.PageNumber} — revisit before exam",
                ScorePercent: (int)(missed.Score ?? 25m),
                ProjectId: missed.ProjectId,
                DocumentId: missed.DocumentId,
                ChunkId: missed.ChunkId,
                PageNumber: missed.PageNumber));
        }

        // 3. Synthesize General Cross-Course Weak Points (high-level patterns for main Dashboard summary;
        //    later enrichable by the Python AI observation endpoint using these exact SQL aggregates)
        var generalWeakPoints = new List<GeneralInsightDto>();

        if (missedAttempts.Count > 0)
        {
            var avgMissedScore = (int)Math.Round(missedAttempts.Average(a => a.Score ?? 0m));
            generalWeakPoints.Add(new GeneralInsightDto(
                Category: "Retention & Accuracy",
                Headline: $"{missedAttempts.Count} quiz concept{(missedAttempts.Count > 1 ? "s" : "")} need reinforcement",
                Observation: $"Recent quiz checks averaged {avgMissedScore}% on missed passages. Re-reading the linked source pages before retaking will close these gaps fastest.",
                Severity: "high",
                AffectedCount: missedAttempts.Count));
        }

        if (lecturesWithoutRecall > 0)
        {
            generalWeakPoints.Add(new GeneralInsightDto(
                Category: "Active Recall",
                Headline: $"{lecturesWithoutRecall} lecture{(lecturesWithoutRecall > 1 ? "s" : "")} not yet tested closed-book",
                Observation: "Reading and highlighting build familiarity, but closed-book active recall is what locks concepts into long-term exam memory.",
                Severity: lecturesWithoutRecall >= 2 ? "medium" : "low",
                AffectedCount: lecturesWithoutRecall));
        }

        if (lecturesWithoutNotes > 0)
        {
            generalWeakPoints.Add(new GeneralInsightDto(
                Category: "Synthesis",
                Headline: $"{lecturesWithoutNotes} imported file{(lecturesWithoutNotes > 1 ? "s" : "")} have no notes or highlights",
                Observation: "Capture key quotes or 1-line summaries in your own words to anchor concepts to exact page numbers.",
                Severity: "low",
                AffectedCount: lecturesWithoutNotes));
        }

        if (todayPoints < dailyGoal && documents.Count > 0)
        {
            var remaining = dailyGoal - todayPoints;
            generalWeakPoints.Add(new GeneralInsightDto(
                Category: "Daily Consistency",
                Headline: $"{remaining} pt{(remaining > 1 ? "s" : "")} left to hit today's study goal",
                Observation: $"You've logged {todayPoints}/{dailyGoal} activity points today — one Active Recall check (+3) or saving notes (+2) brings you over the line.",
                Severity: "low",
                AffectedCount: remaining));
        }

        var recallCount = sessions.Count(s => !string.IsNullOrWhiteSpace(s.RecallText));
        var totalIndependentSignals = recallCount * 2 + attempts.Count(a => a.IsCorrect == true) + notes.Count;
        var totalTarget = Math.Max(1, documents.Count * 4);
        var independencePercent = Math.Min(100, (int)Math.Round((double)totalIndependentSignals / totalTarget * 100));

        return Ok(new DashboardResponse(
            DisplayName: user.DisplayName,
            Email: user.Email,
            PreferredLanguage: user.PreferredLanguage,
            MemberSince: user.CreatedAt,
            DailyGoalPoints: dailyGoal,
            TodayPoints: todayPoints,
            GoalMetDays: goalMetDays,
            TotalCourses: projects.Count,
            TotalLectures: documents.Count,
            TotalNotes: notes.Count,
            TotalRecallSessions: recallCount,
            TotalQuizAttempts: attempts.Count,
            CurrentStreakDays: streak,
            IndependenceScorePercent: independencePercent,
            Heatmap: heatmap,
            GeneralWeakPoints: generalWeakPoints.Take(4).ToList(),
            StrongPoints: strongPoints.OrderByDescending(x => x.ScorePercent).Take(5).ToList(),
            DetailedWeakPoints: detailedWeakPoints.OrderBy(x => x.ScorePercent).ToList()));
    }
}
